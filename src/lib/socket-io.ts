import type { Server as IOServer } from "socket.io";

import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "./socket-types";

type AppIOServer = IOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

/**
 * Returns the Socket.io server instance attached to the custom server
 * (server.ts). May be undefined when the API route is running outside
 * the custom-server runtime (e.g. during `next build`'s static
 * analysis), so callers must null-check before emitting.
 */
export function getIO(): AppIOServer | undefined {
  return (globalThis as unknown as { __pawmatchIo?: AppIOServer })
    .__pawmatchIo;
}

/** Broadcast a fresh-message ping to everyone in a match room. */
export function emitMessageNew(payload: {
  matchId: string;
  messageId: string;
  senderId: string;
  at: Date | string;
}): void {
  const io = getIO();
  if (!io) return;
  const at = typeof payload.at === "string" ? payload.at : payload.at.toISOString();
  io.to(`match:${payload.matchId}`).emit("message:new", {
    matchId: payload.matchId,
    messageId: payload.messageId,
    senderId: payload.senderId,
    at,
  });
}
