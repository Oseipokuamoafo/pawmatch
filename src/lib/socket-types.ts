/**
 * Typed events for the PawMatch socket.io layer.
 *
 * Architecture: socket-driven writes. Clients call `send_message` over
 * the socket; the server scam-checks, encrypts (AES-256-GCM), persists,
 * then broadcasts `message_received` (decrypted) to the room. History +
 * reconnect pagination still flows through the auth'd REST GET.
 */

export interface MessageWire {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  flagged: boolean;
  scamWarnings?: { severity: "hard" | "soft"; reason: string }[];
}

export interface ServerToClientEvents {
  message_received: (msg: MessageWire) => void;
  message_flagged: (payload: { matchId: string; messageId: string; reasons: string[] }) => void;
  typing_indicator: (payload: { matchId: string; userId: string }) => void;
  messages_read: (payload: { matchId: string; readerId: string; at: string }) => void;
  /** Server tells the joiner whether the join was accepted. */
  joined_match: (payload: { matchId: string; ok: boolean; reason?: string }) => void;
  /** Sender-only error for a send_message attempt (e.g. hard scam block). */
  send_error: (payload: { matchId: string; error: string; reasons?: string[] }) => void;
}

export interface ClientToServerEvents {
  join_match: (matchId: string) => void;
  leave_match: (matchId: string) => void;
  send_message: (
    payload: { matchId: string; content: string },
    ack?: (resp: { ok: boolean; message?: MessageWire; error?: string; reasons?: string[] }) => void
  ) => void;
  typing: (matchId: string) => void;
  mark_read: (matchId: string) => void;
}

export interface SocketData {
  userId?: string;
  matchIds?: string[];
}
