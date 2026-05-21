"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";

import { useChat } from "@/hooks/useChat";
import { calculateAge } from "@/lib/utils/age";
import type { Sex, Species } from "@/generated/prisma";

interface ChatViewProps {
  matchId: string;
  myUserId: string;
  myPet: { id: string; name: string };
  theirPet: {
    id: string;
    name: string;
    breed: string;
    species: Species;
    sex: Sex;
    dateOfBirth: string;
    livePhotoUrl: string | null;
    photoUrl: string | null;
    ownerName: string | null;
  };
  matchScore: number;
  matchFlags: string[];
}

const SPECIES_EMOJI: Record<Species, string> = { DOG: "🐕", CAT: "🐈" };

export function ChatView({
  matchId,
  myUserId,
  myPet,
  theirPet,
  matchScore,
  matchFlags,
}: ChatViewProps) {
  const {
    messages,
    sendMessage,
    sendTyping,
    markRead,
    isTyping,
    isConnected,
    lastFlag,
    hasMore,
    loadOlder,
    loadingHistory,
  } = useChat(matchId, myUserId);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  // Mark thread as read whenever we focus the window or receive a message
  useEffect(() => {
    markRead();
    const onFocus = () => markRead();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [markRead, messages.length]);

  function onChangeDraft(v: string) {
    setDraft(v);
    if (v.length > 0) sendTyping();
  }

  async function submit() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setSendError(null);
    setDraft("");
    const resp = await sendMessage(text);
    setSending(false);
    if (!resp.ok) {
      setDraft(text); // restore so user doesn't lose it
      setSendError(resp.error ?? "Could not send");
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  }

  const heroUrl = theirPet.photoUrl ?? theirPet.livePhotoUrl;
  const scoreTone = scoreColor(matchScore);
  const flaggedBanner =
    lastFlag && lastFlag.messageId !== "__send_error__"
      ? `A recent message was flagged: ${lastFlag.reasons.join(", ")}`
      : null;
  const sendErrorBanner =
    sendError ||
    (lastFlag && lastFlag.messageId === "__send_error__"
      ? `Blocked — ${lastFlag.reasons.join(", ")}`
      : null);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 md:py-12">
      <Link
        href="/messages"
        className="inline-flex items-center gap-1.5 text-sm text-dark-muted hover:text-terracotta transition-colors"
      >
        <BackArrow className="h-3.5 w-3.5" />
        All conversations
      </Link>

      {/* ── Header with both pets + score pill ───────────────────── */}
      <header className="mt-6 mb-6 flex items-center gap-4">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-sand">
          {heroUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroUrl} alt={theirPet.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl">
              {SPECIES_EMOJI[theirPet.species]}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1
            className="leading-none text-dark"
            style={{
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontWeight: 900,
              fontSize: "1.75rem",
            }}
          >
            {theirPet.name}
          </h1>
          <p className="mt-1 text-sm text-dark-muted">
            {theirPet.breed} · {calculateAge(theirPet.dateOfBirth)}
            {theirPet.ownerName ? ` · ${theirPet.ownerName}` : ""} · for{" "}
            <span className="font-semibold text-dark">{myPet.name}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div
            className="inline-flex h-12 w-12 items-center justify-center rounded-full font-black"
            style={{
              background: scoreTone.bg,
              color: scoreTone.fg,
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontSize: "1.125rem",
            }}
            title={`${matchScore}/100 compatibility`}
          >
            {matchScore}
          </div>
          {matchFlags.length > 0 && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-terracotta">
              ⚠ flagged
            </span>
          )}
        </div>
      </header>

      {flaggedBanner && (
        <div
          className="mb-3 rounded-2xl border px-4 py-2 text-xs"
          style={{
            background: "rgba(232,154,42,0.10)",
            borderColor: "rgba(232,154,42,0.30)",
            color: "#B0731A",
          }}
        >
          <strong>⚠ </strong>
          {flaggedBanner}
        </div>
      )}

      {/* ── Conversation card ──────────────────────────────────── */}
      <div className="relative flex h-[68vh] flex-col card !p-0 overflow-hidden">
        <ConnectionDot live={isConnected} />

        <div ref={streamRef} className="flex-1 overflow-y-auto px-5 py-6">
          {hasMore && (
            <div className="mb-4 text-center">
              <button
                type="button"
                onClick={() => void loadOlder()}
                className="rounded-full border border-sand bg-cream px-3 py-1 text-[11px] font-semibold text-dark-muted hover:border-terracotta/40 hover:text-terracotta"
              >
                Load older messages
              </button>
            </div>
          )}

          {loadingHistory ? (
            <p className="text-center text-sm italic text-dark-muted">
              Loading messages…
            </p>
          ) : messages.length === 0 ? (
            <p className="mt-12 text-center text-sm italic text-dark-muted">
              No messages yet. Send the first one to {theirPet.name}.
            </p>
          ) : (
            <ul className="space-y-3">
              {messages.map((m, i) => {
                const prev = i > 0 ? messages[i - 1] : null;
                const isMine = m.senderId === myUserId;
                const sameAuthor = prev && prev.senderId === m.senderId;
                const flagged =
                  m.flagged || m.content.startsWith("[FLAGGED] ");
                const text = flagged
                  ? m.content.replace(/^\[FLAGGED\]\s*/, "")
                  : m.content;
                return (
                  <li
                    key={m.id}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[78%] ${sameAuthor ? "mt-1" : "mt-2"}`}>
                      <div
                        className={`rounded-2xl px-4 py-2.5 text-[15px] leading-snug shadow-sm ${
                          isMine
                            ? "rounded-br-sm bg-terracotta text-white"
                            : "rounded-bl-sm bg-white text-dark border border-sand dark:bg-[#2A1A10] dark:text-[#F5EDE4] dark:border-[#3D2A1A]"
                        }`}
                      >
                        {text}
                        <span
                          className={`mt-1 flex items-center gap-1 text-[10px] ${
                            isMine ? "text-white/80 justify-end" : "text-dark-muted"
                          }`}
                        >
                          {formatTime(m.createdAt)}
                          {isMine && (
                            <ReadCheck
                              read={m.isRead}
                              pending={Boolean(m.pending)}
                            />
                          )}
                        </span>
                      </div>
                      {flagged && (
                        <div
                          className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            isMine ? "ml-auto" : ""
                          }`}
                          style={{
                            background: "rgba(232,154,42,0.18)",
                            color: "#B0731A",
                          }}
                        >
                          ⚠ Flagged
                          {m.scamWarnings && m.scamWarnings.length > 0 && (
                            <span className="ml-1 font-normal">
                              · {m.scamWarnings.map((w) => w.reason).join(", ")}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {isTyping && <TypingIndicator name={theirPet.ownerName ?? "Owner"} />}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className="border-t border-sand">
          <div className="flex items-end gap-2 px-4 py-3">
            <textarea
              value={draft}
              onChange={(e) => onChangeDraft(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder={
                isConnected
                  ? `Message ${theirPet.name}…`
                  : "Reconnecting…"
              }
              disabled={!isConnected}
              maxLength={2000}
              className="min-h-[44px] flex-1 resize-none rounded-2xl border border-sand bg-cream px-4 py-2.5 text-base text-dark outline-none transition-[border-color,background] duration-150 focus:border-terracotta focus:bg-surface focus:ring-2 focus:ring-terracotta/15 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={submit}
              disabled={sending || !draft.trim() || !isConnected}
              className="btn-primary !px-5 !py-2.5"
            >
              {sending ? "…" : "Send"}
            </button>
          </div>
          {sendErrorBanner && (
            <p
              className="border-t border-sand px-4 py-2 text-center text-xs"
              style={{
                color: "#C94B2A",
                background: "rgba(201,75,42,0.06)",
              }}
            >
              <strong>Couldn&apos;t send — </strong>{sendErrorBanner}
            </p>
          )}
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-dark-muted">
        🔒 Messages are end-encrypted at rest (AES-256-GCM).
      </p>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────── */

function ConnectionDot({ live }: { live: boolean }) {
  return (
    <div
      className={`absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-cream/95 px-2 py-0.5 text-[10px] font-medium shadow-sm dark:bg-[#2A1A10]/95 ${
        live ? "text-[#1D9E75] dark:text-[#5DD7AC]" : "text-[#3D2A1A] dark:text-[#E89A2A]"
      }`}
      style={{ pointerEvents: "none" }}
      title={live ? "Live" : "Reconnecting"}
    >
      <span
        className="block h-1.5 w-1.5 rounded-full"
        style={{
          background: live ? "#1D9E75" : "#B0731A",
          boxShadow: live ? "0 0 6px #1D9E75" : "none",
        }}
      />
      {live ? "Live" : "Reconnecting"}
    </div>
  );
}

function TypingIndicator({ name }: { name: string }) {
  return (
    <div className="mt-3 flex items-center gap-2 text-xs text-dark-muted">
      <span>{name} is typing</span>
      <span className="inline-flex gap-1" aria-hidden="true">
        <Dot delay={0} />
        <Dot delay={0.15} />
        <Dot delay={0.3} />
      </span>
      <style>{`
        @keyframes typing-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-3px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 rounded-full bg-dark-muted/60"
      style={{
        animation: "typing-bounce 1.2s ease-in-out infinite",
        animationDelay: `${delay}s`,
      }}
    />
  );
}

function ReadCheck({ read, pending }: { read: boolean; pending: boolean }) {
  if (pending) {
    return (
      <span aria-label="Sending" title="Sending">
        ◌
      </span>
    );
  }
  return read ? (
    <span aria-label="Read" title="Read">
      <DoubleCheck />
    </span>
  ) : (
    <span aria-label="Sent" title="Sent">
      <SingleCheck />
    </span>
  );
}

function SingleCheck() {
  return (
    <svg viewBox="0 0 14 12" width="11" height="9" fill="none" aria-hidden="true">
      <path
        d="M1 6.5 5 10.5 13 1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DoubleCheck() {
  return (
    <svg viewBox="0 0 18 12" width="14" height="9" fill="none" aria-hidden="true">
      <path
        d="M1 6.5 5 10.5 12 1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 6.5 10 10.5 17 1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BackArrow({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M19 12H5M11 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function scoreColor(score: number) {
  if (score >= 80) return { bg: "rgba(29,158,117,0.95)", fg: "#fff" };
  if (score >= 60) return { bg: "rgba(232,154,42,0.95)", fg: "#fff" };
  return { bg: "rgba(201,75,42,0.95)", fg: "#fff" };
}

function formatTime(d: string): string {
  return new Date(d).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
