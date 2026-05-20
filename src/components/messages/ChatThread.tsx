"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { io as ioClient, Socket } from "socket.io-client";

import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@/lib/socket-types";

interface ScamWarning {
  severity: "hard" | "soft";
  reason: string;
}

interface Message {
  id: string;
  senderId: string;
  isRead: boolean;
  createdAt: string | Date;
  content: string;
  isMine: boolean;
  scamWarnings?: ScamWarning[];
}

interface ChatThreadProps {
  matchId: string;
  initial: Message[];
  myName: string;
  theirName: string;
}

/**
 * Fallback poll interval when sockets are unavailable. With sockets live,
 * 30s is just a safety net; without them, this is the only refresh.
 */
const FALLBACK_POLL_MS = 30_000;

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

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
  const [blockedReasons, setBlockedReasons] = useState<string[] | null>(null);
  const [socketLive, setSocketLive] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<AppSocket | null>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  // ── Live refresh helper (used by socket + fallback poll) ──────────
  const refresh = async () => {
    try {
      const res = await fetch(`/api/matches/${matchId}/messages`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { messages: Message[] };
      setMessages(data.messages);
    } catch {
      /* silent — next ping or poll will catch up */
    }
  };

  // ── Socket.io subscription ─────────────────────────────────────────
  useEffect(() => {
    const socket: AppSocket = ioClient({
      path: "/api/socket.io",
      withCredentials: true,
      // Light retry — give up loudly so the fallback poll takes over
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1200,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketLive(true);
      socket.emit("match:join", matchId);
    });
    socket.on("disconnect", () => setSocketLive(false));
    socket.on("connect_error", () => setSocketLive(false));

    socket.on("message:new", (payload) => {
      if (payload.matchId !== matchId) return;
      // Skip the round-trip if we already have the message (we wrote it
      // ourselves and got it back via the optimistic POST response).
      const have = messagesRef.current.some((m) => m.id === payload.messageId);
      if (!have) void refresh();
    });

    return () => {
      socket.emit("match:leave", matchId);
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  // Keep a ref to current messages so the socket handler can dedupe
  // without re-subscribing on every render.
  const messagesRef = useRef<Message[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // ── Fallback poll — quiet 30s heartbeat in case the socket is down
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      if (document.hidden) {
        timer = setTimeout(tick, FALLBACK_POLL_MS);
        return;
      }
      // When the socket is live, we still poll occasionally as belt-and-
      // braces — at 30s it costs almost nothing.
      await refresh();
      if (!cancelled) timer = setTimeout(tick, FALLBACK_POLL_MS);
    }

    timer = setTimeout(tick, FALLBACK_POLL_MS);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    setBlockedReasons(null);

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
      const data = await res
        .json()
        .catch(() => ({} as { error?: string; reasons?: string[] }));
      setMessages((m) => m.filter((x) => x.id !== tempId));
      setDraft(text); // restore draft so user doesn't lose it
      if (res.status === 422 && Array.isArray(data.reasons)) {
        setBlockedReasons(data.reasons);
      }
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
              const hasWarnings =
                (m.scamWarnings?.length ?? 0) > 0;
              return (
                <li
                  key={m.id}
                  className={`flex ${m.isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[78%] ${sameAuthor ? "mt-1" : "mt-2"}`}
                  >
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-[15px] leading-snug shadow-sm ${
                        m.isMine
                          ? "rounded-br-sm bg-terracotta text-white"
                          : "rounded-bl-sm bg-sand text-dark"
                      }`}
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
                    {hasWarnings && (
                      <div
                        className={`mt-1.5 inline-flex flex-wrap items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          m.isMine ? "ml-auto" : ""
                        }`}
                        style={{
                          background: "rgba(232,154,42,0.18)",
                          color: "#B0731A",
                        }}
                        title="PawMatch flagged this for review"
                      >
                        <span aria-hidden>⚠</span>
                        {m.scamWarnings!.map((w) => w.reason).join(" · ")}
                      </div>
                    )}
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

      {blockedReasons && blockedReasons.length > 0 && (
        <div
          className="border-t border-sand px-4 py-3 text-xs"
          style={{ background: "rgba(201,75,42,0.06)", color: "#C94B2A" }}
        >
          <strong>Blocked — </strong>
          PawMatch doesn&apos;t allow payment-rail or crypto-wallet language.
          Reasons: {blockedReasons.join(", ")}.
        </div>
      )}

      {error && !blockedReasons && (
        <p className="border-t border-sand px-4 py-2 text-center text-xs text-terracotta">
          {error}
        </p>
      )}

      <ConnectionDot live={socketLive} />
    </div>
  );
}

/* ─── Tiny connection indicator ──────────────────────────────────────── */

function ConnectionDot({ live }: { live: boolean }) {
  return (
    <div
      className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-cream/95 px-2 py-0.5 text-[10px] font-medium shadow-sm"
      style={{ color: live ? "#1D9E75" : "#3D2A1A", pointerEvents: "none" }}
      title={live ? "Live (Socket.io)" : "Polling"}
    >
      <span
        className="block h-1.5 w-1.5 rounded-full"
        style={{
          background: live ? "#1D9E75" : "#B0731A",
          boxShadow: live ? "0 0 6px #1D9E75" : "none",
        }}
      />
      {live ? "Live" : "Polling"}
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
