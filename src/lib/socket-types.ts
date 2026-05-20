/**
 * Typed events for the PawMatch socket.io layer.
 *
 * Pings only — the socket never carries decrypted message content.
 * Clients receive a `message:new` ping and re-fetch the thread via the
 * auth'd REST endpoint where the AES-256-GCM decryption happens.
 */

export interface MessageNewPayload {
  matchId: string;
  messageId: string;
  /** ISO timestamp so clients can dedupe quickly. */
  at: string;
  /** Sender's user id — clients can decide whether to flash the bubble. */
  senderId: string;
}

export interface ServerToClientEvents {
  "message:new": (payload: MessageNewPayload) => void;
}

export interface ClientToServerEvents {
  "match:join": (matchId: string) => void;
  "match:leave": (matchId: string) => void;
}

export interface SocketData {
  matchIds?: string[];
}
