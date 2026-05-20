"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io as ioClient, type Socket } from "socket.io-client";

import type {
  ClientToServerEvents,
  ServerToClientEvents,
  MessageWire,
} from "@/lib/socket-types";

export interface ChatMessage extends MessageWire {
  /** Optimistic temp messages don't have a server id yet. */
  pending?: boolean;
}

interface UseChatReturn {
  messages: ChatMessage[];
  loadingHistory: boolean;
  hasMore: boolean;
  loadOlder: () => Promise<void>;
  sendMessage: (content: string) => Promise<{ ok: boolean; error?: string }>;
  sendTyping: () => void;
  markRead: () => void;
  isTyping: boolean;
  isConnected: boolean;
  /** Most recent flagged-message reasons surfaced by the server. */
  lastFlag: { messageId: string; reasons: string[] } | null;
}

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const TYPING_TIMEOUT_MS = 2_500;
const TYPING_SEND_THROTTLE_MS = 1_500;

/**
 * Drives the chat experience for a single match.
 *
 * Lifecycle:
 *   1. Mount → fetch most recent 50 messages via REST GET
 *   2. Open socket, join match room (server validates participant)
 *   3. Subscribe to message_received, typing_indicator, messages_read,
 *      message_flagged, send_error
 *   4. Unmount → leave room + disconnect
 */
export function useChat(matchId: string, myUserId: string): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [lastFlag, setLastFlag] = useState<
    UseChatReturn["lastFlag"]
  >(null);

  const socketRef = useRef<AppSocket | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef(0);
  const messagesRef = useRef<ChatMessage[]>([]);

  // Keep a ref on messages so event handlers can dedupe without
  // re-subscribing.
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  /* ── Initial history fetch ────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    setLoadingHistory(true);
    fetch(`/api/messages/${matchId}?limit=50`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error("history fetch failed");
        return r.json() as Promise<{ messages: ChatMessage[]; hasMore: boolean }>;
      })
      .then((data) => {
        if (cancelled) return;
        setMessages(data.messages);
        setHasMore(data.hasMore);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  /* ── Socket lifecycle ─────────────────────────────────────────── */
  useEffect(() => {
    const socket: AppSocket = ioClient({
      path: "/api/socket.io",
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 5_000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("join_match", matchId);
    });
    socket.on("disconnect", () => setIsConnected(false));
    socket.on("connect_error", () => setIsConnected(false));

    socket.on("joined_match", (payload) => {
      if (payload.matchId !== matchId || payload.ok) return;
      console.warn("[socket] join refused:", payload.reason);
    });

    socket.on("message_received", (msg) => {
      if (msg.matchId !== matchId) return;
      setMessages((prev) => {
        // Dedupe by id; also reconcile an optimistic temp message from
        // the same sender + same content.
        const byId = prev.findIndex((m) => m.id === msg.id);
        if (byId !== -1) {
          const copy = prev.slice();
          copy[byId] = { ...msg, pending: false };
          return copy;
        }
        const tempIdx = prev.findIndex(
          (m) =>
            m.pending &&
            m.senderId === msg.senderId &&
            m.content === msg.content
        );
        if (tempIdx !== -1) {
          const copy = prev.slice();
          copy[tempIdx] = { ...msg, pending: false };
          return copy;
        }
        return [...prev, { ...msg, pending: false }];
      });
    });

    socket.on("message_flagged", (payload) => {
      if (payload.matchId !== matchId) return;
      setLastFlag({ messageId: payload.messageId, reasons: payload.reasons });
    });

    socket.on("typing_indicator", (payload) => {
      if (payload.matchId !== matchId || payload.userId === myUserId) return;
      setIsTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(
        () => setIsTyping(false),
        TYPING_TIMEOUT_MS
      );
    });

    socket.on("messages_read", (payload) => {
      if (payload.matchId !== matchId) return;
      if (payload.readerId === myUserId) return;
      // Mark my own messages as read up to "now"
      setMessages((prev) =>
        prev.map((m) => (m.senderId === myUserId ? { ...m, isRead: true } : m))
      );
    });

    socket.on("send_error", (payload) => {
      if (payload.matchId !== matchId) return;
      // Surface via lastFlag's sibling — the consumer can show a banner.
      // We keep this lightweight by piggy-backing on lastFlag with a
      // sentinel id; the chat view interprets reasons separately.
      setLastFlag({ messageId: `__send_error__`, reasons: payload.reasons ?? [] });
    });

    return () => {
      socket.emit("leave_match", matchId);
      socket.disconnect();
      socketRef.current = null;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [matchId, myUserId]);

  /* ── Actions ─────────────────────────────────────────────────── */

  const sendMessage = useCallback<UseChatReturn["sendMessage"]>(
    (content) =>
      new Promise((resolve) => {
        const socket = socketRef.current;
        if (!socket || !socket.connected) {
          resolve({ ok: false, error: "Socket not connected" });
          return;
        }
        const text = content.trim();
        if (!text) {
          resolve({ ok: false, error: "Empty message" });
          return;
        }

        const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const optimistic: ChatMessage = {
          id: tempId,
          matchId,
          senderId: myUserId,
          content: text,
          isRead: false,
          createdAt: new Date().toISOString(),
          flagged: false,
          pending: true,
        };
        setMessages((prev) => [...prev, optimistic]);

        socket.emit("send_message", { matchId, content: text }, (resp) => {
          if (!resp.ok) {
            // Roll back optimistic
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
            if (resp.reasons && resp.reasons.length > 0) {
              setLastFlag({
                messageId: "__send_error__",
                reasons: resp.reasons,
              });
            }
            resolve({ ok: false, error: resp.error });
            return;
          }
          if (resp.message) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempId ? { ...resp.message!, pending: false } : m
              )
            );
          }
          resolve({ ok: true });
        });
      }),
    [matchId, myUserId]
  );

  const sendTyping = useCallback(() => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < TYPING_SEND_THROTTLE_MS) return;
    lastTypingSentRef.current = now;
    socket.emit("typing", matchId);
  }, [matchId]);

  const markRead = useCallback(() => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    socket.emit("mark_read", matchId);
  }, [matchId]);

  const loadOlder = useCallback(async () => {
    if (!hasMore) return;
    const oldest = messagesRef.current.find((m) => !m.pending);
    if (!oldest) return;
    const res = await fetch(
      `/api/messages/${matchId}?before=${oldest.id}&limit=50`,
      { cache: "no-store" }
    );
    if (!res.ok) return;
    const data = (await res.json()) as {
      messages: ChatMessage[];
      hasMore: boolean;
    };
    setMessages((prev) => [...data.messages, ...prev]);
    setHasMore(data.hasMore);
  }, [matchId, hasMore]);

  return {
    messages,
    loadingHistory,
    hasMore,
    loadOlder,
    sendMessage,
    sendTyping,
    markRead,
    isTyping,
    isConnected,
    lastFlag,
  };
}
