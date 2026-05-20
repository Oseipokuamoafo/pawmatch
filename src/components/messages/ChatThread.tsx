"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

interface Message {
  id: string;
  senderId: string;
  isRead: boolean;
  createdAt: string | Date;
  content: string;
  isMine: boolean;
}

interface ChatThreadProps {
  matchId: string;
  initial: Message[];
  myName: string;
  theirName: string;
}

const POLL_MS = 4000;

export function ChatThread({
  matchId,
  initial,
  theirName,
}: ChatThreadProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initial);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  // Polling — refresh decrypted messages every POLL_MS, pause if tab hidden
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      if (document.hidden) {
        timer = setTimeout(tick, POLL_MS);
        return;
      }
      try {
        const res = await fetch(`/api/matches/${matchId}/messages`, {
          cache: "no-store",
        });
        if (res.ok && !cancelled) {
          const data = (await res.json()) as { messages: Message[] };
          setMessages(data.messages);
        }
      } catch {
        /* silently retry */
      }
      if (!cancelled) timer = setTimeout(tick, POLL_MS);
    }

    timer = setTimeout(tick, POLL_MS);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [matchId]);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);

    // Optimistic — show locally before server confirms
    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      senderId: "me",
      isRead: false,
      createdAt: new Date(),
      content: text,
      isMine: true,
    };
    setMessages((m) => [...m, optimistic]);
    setDraft("");

    const res = await fetch(`/api/matches/${matchId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });
    setSending(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessages((m) => m.filter((x) => x.id !== tempId));
      setDraft(text); // restore draft so user doesn't lose it
      setError(data.error ?? "Could not send");
      return;
    }

    const { message } = (await res.json()) as { message: Message };
    setMessages((m) => m.map((x) => (x.id === tempId ? message : x)));
    router.refresh(); // refresh list page unread counts
  }

  return (
    <div className="flex h-[70vh] flex-col card !p-0 overflow-hidden">
      {/* Stream */}
      <div className="flex-1 overflow-y-auto px-5 py-6">
        {messages.length === 0 ? (
          <div className="mx-auto mt-12 max-w-sm text-center">
            <p className="text-sm italic text-dark-muted">
              No messages yet. Send the first one to {theirName}.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {messages.map((m, idx) => {
              const prev = idx > 0 ? messages[idx - 1] : null;
              const sameAuthor = prev && prev.isMine === m.isMine;
              return (
                <li
                  key={m.id}
                  className={`flex ${m.isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-[15px] leading-snug shadow-sm ${
                      m.isMine
                        ? "rounded-br-sm bg-terracotta text-white"
                        : "rounded-bl-sm bg-sand text-dark"
                    } ${sameAuthor ? "mt-1" : "mt-2"}`}
                  >
                    {m.content}
                    <span
                      className={`mt-1 block text-[10px] ${
                        m.isMine ? "text-white/75" : "text-dark-muted"
                      }`}
                    >
                      {formatTime(m.createdAt)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form
        onSubmit={onSend}
        className="flex items-end gap-2 border-t border-sand px-4 py-3"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend(e as unknown as FormEvent);
            }
          }}
          rows={1}
          placeholder={`Message ${theirName}…`}
          maxLength={2000}
          className="min-h-[44px] flex-1 resize-none rounded-2xl border border-sand bg-cream px-4 py-2.5 text-base text-dark outline-none transition-[border-color,background] duration-150 focus:border-terracotta focus:bg-surface focus:ring-2 focus:ring-terracotta/15"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="btn-primary !px-5 !py-2.5"
        >
          {sending ? "…" : "Send"}
        </button>
      </form>

      {error && (
        <p className="border-t border-sand px-4 py-2 text-center text-xs text-terracotta">
          {error}
        </p>
      )}
    </div>
  );
}

function formatTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
