import type { Server as IOServer } from "socket.io";

/**
 * Server-side helper for pushing real-time events to specific users.
 *
 * Every authenticated socket auto-joins a personal `user:<userId>` room
 * (see src/server.ts) so REST handlers can target a single user without
 * tracking socket ids themselves. Calls are best-effort — if the io
 * instance hasn't been wired up yet (e.g. during a build), we no-op
 * with a warning instead of throwing.
 */

interface GlobalWithIO {
  __pawmatchIo?: IOServer;
}

function getIo(): IOServer | null {
  const g = globalThis as unknown as GlobalWithIO;
  return g.__pawmatchIo ?? null;
}

/** Emit an event to all connected sockets for a single user. */
export function emitToUser(
  userId: string,
  event: string,
  payload: unknown,
): void {
  const io = getIo();
  if (!io) {
    console.warn(
      `[realtime] io not initialized — dropping ${event} to user:${userId}`,
    );
    return;
  }
  io.to(`user:${userId}`).emit(event, payload);
}

/* ─── Event names ──────────────────────────────────────────────────────
 * Centralized so the client + server typings can reference the same
 * literal strings without drift. Add new events here as we go.            */

export const RealtimeEvent = {
  /** A new co-sign request landed in the vet's inbox. Payload shape:
   *  { id, type, title, petName, ownerName, requestedAt }. */
  VetCosignRequested: "vet:cosign_requested",
  /** An owner cancelled a pending co-sign request. Payload: { id }. */
  VetCosignCancelled: "vet:cosign_cancelled",
} as const;
