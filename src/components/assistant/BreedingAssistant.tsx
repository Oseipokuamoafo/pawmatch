"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

import { useToast } from "@/components/toast/ToastProvider";

interface BreedingAssistantProps {
  petId: string;
  petName: string;
  /** When false, the section renders a Pro+ paywall instead of the chat. */
  enabled: boolean;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface HistoryResponse {
  turnCount: number;
  maxTurns: number;
  messages: ChatMessage[];
}

const SUGGESTED_PROMPTS = [
  "What recessive markers should I worry about for this breed?",
  "Is my pet old enough to breed safely?",
  "How do I read my pet's DNA panel?",
  "What does the COI percentage mean?",
];

export function BreedingAssistant({
  petId,
  petName,
  enabled,
}: BreedingAssistantProps) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamedReply, setStreamedReply] = useState("");
  const [turnCount, setTurnCount] = useState(0);
  const [maxTurns, setMaxTurns] = useState(50);
  const [loading, setLoading] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/pets/${petId}/assistant`);
      if (!r.ok) throw new Error("Failed to load chat history");
      const data = (await r.json()) as HistoryResponse;
      setMessages(data.messages);
      setTurnCount(data.turnCount);
      setMaxTurns(data.maxTurns);
    } catch (err) {
      toast.error("Couldn't load chat", (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [petId, toast]);

  // Lazy-load history the first time the panel opens.
  useEffect(() => {
    if (open && messages.length === 0 && !loading) {
      void loadHistory();
    }
  }, [open, messages.length, loading, loadHistory]);

  // Keep scroll pinned to the bottom as new tokens arrive.
  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, streamedReply, streaming]);

  async function sendMessage(textOverride?: string) {
    const text = (textOverride ?? draft).trim();
    if (!text || streaming) return;
    if (turnCount >= maxTurns) {
      toast.error(
        "Thread limit reached",
        "Clear the chat to start a new conversation.",
      );
      return;
    }

    const tempUserId = `temp-user-${Date.now()}`;
    setMessages((m) => [
      ...m,
      {
        id: tempUserId,
        role: "user",
        content: text,
        createdAt: new Date().toISOString(),
      },
    ]);
    setDraft("");
    setStreaming(true);
    setStreamedReply("");

    try {
      const r = await fetch(`/api/pets/${petId}/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!r.ok || !r.body) {
        const data = await r.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error ?? "Assistant request failed",
        );
      }

      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setStreamedReply(acc);
      }

      // Promote streamed text to a persisted message + reload to capture
      // the server-assigned IDs and turn count.
      setMessages((m) => [
        ...m,
        {
          id: `temp-asst-${Date.now()}`,
          role: "assistant",
          content: acc,
          createdAt: new Date().toISOString(),
        },
      ]);
      setStreamedReply("");
      setTurnCount((t) => t + 1);
      // Refresh in background so persisted IDs replace temp ones.
      void loadHistory();
    } catch (err) {
      toast.error("Couldn't reach the assistant", (err as Error).message);
      // Roll the optimistic user message back so they can retry.
      setMessages((m) => m.filter((msg) => msg.id !== tempUserId));
    } finally {
      setStreaming(false);
    }
  }

  async function clearChat() {
    if (!confirm("Clear this chat? The conversation will be deleted.")) return;
    try {
      const r = await fetch(`/api/pets/${petId}/assistant`, {
        method: "DELETE",
      });
      if (!r.ok) throw new Error("Clear failed");
      setMessages([]);
      setStreamedReply("");
      setTurnCount(0);
      toast.success("Chat cleared");
    } catch (err) {
      toast.error("Couldn't clear chat", (err as Error).message);
    }
  }

  // ─── Paywall variant ──────────────────────────────────────────────
  if (!enabled) {
    return (
      <section className="mx-auto max-w-6xl px-6 py-12 md:py-16 scroll-mt-24">
        <div className="rounded-card border border-sand bg-surface/60 p-8 md:p-12 text-center">
          <p className="eyebrow">AI · Pro+ feature</p>
          <h2 className="mt-3 font-serif text-3xl md:text-4xl font-bold leading-tight tracking-tight">
            Ask the breeding assistant
          </h2>
          <p className="mt-4 mx-auto max-w-xl text-dark-muted leading-relaxed">
            A Claude-powered chat that knows {petName}&apos;s health profile, DNA
            results, breed traits, and your breeding goals — and answers
            questions about responsible mating, genetic risk, and litter
            planning.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/pricing"
              className="btn-primary inline-flex items-center gap-2 !py-2.5 !text-sm"
            >
              <LockIcon className="h-3.5 w-3.5" />
              Unlock with Pro+
            </Link>
            <span className="text-[12px] text-dark-muted">
              $19.99 / month · cancel anytime
            </span>
          </div>
        </div>
      </section>
    );
  }

  // ─── Chat variant ─────────────────────────────────────────────────
  return (
    <section
      id="breeding-assistant"
      className="mx-auto max-w-6xl px-6 py-12 md:py-16 scroll-mt-24"
    >
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="eyebrow">AI · breeding assistant</p>
          <h2 className="mt-3 font-serif text-3xl md:text-4xl font-bold leading-tight tracking-tight">
            Ask anything about {petName}
          </h2>
          <p className="mt-3 text-dark-muted leading-relaxed">
            Chat with a Claude-powered assistant that&apos;s read {petName}&apos;s
            full profile — health records, DNA traits, breed reference, and
            your breeding goals. General guidance only; for clinical concerns,
            see your vet.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="btn-secondary"
          aria-expanded={open}
        >
          {open ? "Close chat" : "Open chat"}
        </button>
      </header>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="rounded-card border border-sand bg-surface p-4 shadow-card md:p-6">
              {/* Thread */}
              <div
                ref={threadRef}
                className="max-h-[480px] min-h-[200px] overflow-y-auto pr-1"
              >
                {loading && messages.length === 0 ? (
                  <p className="py-8 text-center text-sm text-dark-muted">
                    Loading conversation…
                  </p>
                ) : messages.length === 0 && !streaming ? (
                  <EmptyChat
                    onPick={(p) => {
                      setDraft(p);
                      void sendMessage(p);
                    }}
                  />
                ) : (
                  <ul className="space-y-3">
                    {messages.map((m) => (
                      <Bubble key={m.id} role={m.role}>
                        {m.content}
                      </Bubble>
                    ))}
                    {streaming && streamedReply && (
                      <Bubble role="assistant" streaming>
                        {streamedReply}
                      </Bubble>
                    )}
                    {streaming && !streamedReply && (
                      <Bubble role="assistant" streaming>
                        <Thinking />
                      </Bubble>
                    )}
                  </ul>
                )}
              </div>

              {/* Composer */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendMessage();
                }}
                className="mt-4 flex items-end gap-2"
              >
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendMessage();
                    }
                  }}
                  placeholder={`Ask about ${petName}'s breeding profile…`}
                  rows={2}
                  disabled={streaming}
                  className="flex-1 resize-none rounded-2xl border border-sand bg-cream px-4 py-3 text-sm text-dark outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={streaming || !draft.trim()}
                  className="btn-primary !px-5 !py-3 !text-sm disabled:opacity-60"
                >
                  {streaming ? "…" : "Send"}
                </button>
              </form>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-dark-muted">
                <span>
                  {turnCount} / {maxTurns} turns used
                </span>
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => void clearChat()}
                    className="underline-offset-2 hover:text-terracotta hover:underline"
                  >
                    Clear chat
                  </button>
                )}
              </div>

              {/* Liability disclaimer — visible footnote so the chat
                  doesn't read as clinical advice. The rubric in the
                  system prompt already enforces this; the user-facing
                  reminder protects us legally. */}
              <p className="mt-3 rounded-xl border border-sand bg-cream/40 px-3 py-2 text-[11px] leading-relaxed text-dark-muted">
                <strong className="text-dark">
                  General guidance, not a clinical recommendation.
                </strong>{" "}
                Responses are generated by an AI model with access to
                your pet&apos;s record — not by a licensed veterinarian.
                For clinical concerns, suspected pregnancy complications,
                medication questions, or anything beyond general breeding
                strategy, consult your vet.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────── */

function EmptyChat({ onPick }: { onPick: (p: string) => void }) {
  return (
    <div className="py-6 text-center">
      <p className="font-serif text-lg font-bold text-dark">
        Where do you want to start?
      </p>
      <p className="mt-1 text-sm text-dark-muted">
        Pick a question or type your own.
      </p>
      <ul className="mt-5 flex flex-wrap justify-center gap-2">
        {SUGGESTED_PROMPTS.map((p) => (
          <li key={p}>
            <button
              type="button"
              onClick={() => onPick(p)}
              className="rounded-full border border-sand bg-cream/40 px-3 py-1.5 text-[12px] text-dark transition hover:border-terracotta/40 hover:text-terracotta"
            >
              {p}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Bubble({
  role,
  streaming,
  children,
}: {
  role: "user" | "assistant";
  streaming?: boolean;
  children: React.ReactNode;
}) {
  if (role === "user") {
    return (
      <li className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl bg-terracotta px-4 py-2.5 text-sm leading-relaxed text-white shadow-sm">
          {children}
        </div>
      </li>
    );
  }
  return (
    <li className="flex justify-start">
      <div
        className={`max-w-[85%] rounded-2xl bg-sand/60 px-4 py-2.5 text-sm leading-relaxed text-dark ${
          streaming ? "ring-1 ring-terracotta/20" : ""
        }`}
      >
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-dark-muted">
          Assistant
        </p>
        <div className="whitespace-pre-wrap">{children}</div>
      </div>
    </li>
  );
}

function Thinking() {
  return (
    <span
      className="inline-flex items-center gap-1 text-dark-muted"
      aria-label="Assistant is thinking"
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:0ms]" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:150ms]" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:300ms]" />
    </span>
  );
}

function LockIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect
        x="5"
        y="11"
        width="14"
        height="9"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 11V8a4 4 0 1 1 8 0v3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
