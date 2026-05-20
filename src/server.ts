/**
 * Custom Next.js + Socket.io server.
 *
 * Architecture:
 *  - Same Node process for Next + Socket.io so route handlers can share
 *    the io instance via globalThis if they ever need to emit.
 *  - Socket auth on connect: validate the NextAuth session cookie via
 *    getToken; disconnect anything unauthenticated.
 *  - Writes happen over the socket (`send_message` event). REST stays
 *    auth'd for paginated history.
 *
 * Run with `npm run dev` (tsx) or `npm run start` (NODE_ENV=production).
 */

import { createServer, type IncomingHttpHeaders } from "node:http";
import next from "next";
import { Server as IOServer } from "socket.io";
import { getToken } from "next-auth/jwt";

import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
  MessageWire,
} from "./lib/socket-types";
import { prisma } from "./lib/prisma";
import { encryptMessage } from "./lib/crypto";
import { detectScam } from "./lib/scam-detection";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "localhost";
const port = Number(process.env.PORT ?? 3142);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const httpServer = createServer((req, res) => handle(req, res));

    const io = new IOServer<
      ClientToServerEvents,
      ServerToClientEvents,
      Record<string, never>,
      SocketData
    >(httpServer, {
      path: "/api/socket.io",
      cors: { origin: true, credentials: true },
    });

    // ── Auth gate: validate NextAuth session on connection ────────────
    io.use(async (socket, nextMw) => {
      try {
        const cookieHeader = socket.handshake.headers.cookie ?? "";
        // getToken wants a Next-shaped request; a minimal cookie-bearing
        // object is enough for the JWT cookie + secret decode path.
        const fakeReq = {
          headers: { cookie: cookieHeader } as IncomingHttpHeaders,
          cookies: parseCookieHeader(cookieHeader),
        };
        const token = await getToken({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          req: fakeReq as any,
          secret: process.env.NEXTAUTH_SECRET,
          secureCookie: process.env.NODE_ENV === "production",
        });
        const userId =
          (token?.id as string | undefined) ?? (token?.sub as string | undefined);
        if (!userId) return nextMw(new Error("Unauthorized"));
        socket.data.userId = userId;
        socket.data.matchIds = [];
        nextMw();
      } catch (err) {
        console.error("[socket auth] failed:", err);
        nextMw(new Error("Unauthorized"));
      }
    });

    io.on("connection", (socket) => {
      const userId = socket.data.userId!;

      socket.on("join_match", async (matchId) => {
        if (typeof matchId !== "string" || matchId.length === 0) return;
        const ok = await isParticipant(matchId, userId);
        if (!ok) {
          socket.emit("joined_match", {
            matchId,
            ok: false,
            reason: "Not a participant in this match",
          });
          return;
        }
        socket.join(`match:${matchId}`);
        socket.data.matchIds = [
          ...new Set([...(socket.data.matchIds ?? []), matchId]),
        ];
        socket.emit("joined_match", { matchId, ok: true });
      });

      socket.on("leave_match", (matchId) => {
        if (typeof matchId !== "string") return;
        socket.leave(`match:${matchId}`);
        if (socket.data.matchIds) {
          socket.data.matchIds = socket.data.matchIds.filter(
            (id) => id !== matchId
          );
        }
      });

      socket.on("send_message", async (payload, ack) => {
        const matchId = payload?.matchId;
        const raw = (payload?.content ?? "").trim();
        if (!matchId || !raw) {
          ack?.({ ok: false, error: "Empty message" });
          return;
        }
        if (raw.length > 2000) {
          ack?.({ ok: false, error: "Message is too long (2000 char max)" });
          return;
        }
        if (!(await isParticipant(matchId, userId))) {
          ack?.({ ok: false, error: "Not a participant in this match" });
          return;
        }

        const scan = detectScam(raw);
        if (scan.blocked) {
          const reasons = scan.matches
            .filter((m) => m.severity === "hard")
            .map((m) => m.reason);
          socket.emit("send_error", {
            matchId,
            error: "Blocked — payment-rail or crypto-wallet language.",
            reasons,
          });
          ack?.({
            ok: false,
            error: "Blocked — payment-rail or crypto-wallet language.",
            reasons,
          });
          return;
        }

        // Soft hits → prefix with [FLAGGED] per spec and broadcast a
        // separate message_flagged event so listeners can light up a
        // warning banner.
        const isFlagged = scan.matches.length > 0;
        const stored = isFlagged ? `[FLAGGED] ${raw}` : raw;

        try {
          const { ciphertext, iv } = encryptMessage(stored);
          const created = await prisma.message.create({
            data: {
              matchId,
              senderId: userId,
              encryptedContent: ciphertext,
              iv,
            },
          });

          const wire: MessageWire = {
            id: created.id,
            matchId,
            senderId: userId,
            content: stored,
            isRead: created.isRead,
            createdAt: created.createdAt.toISOString(),
            flagged: isFlagged,
            scamWarnings: scan.matches.map((m) => ({
              severity: m.severity,
              reason: m.reason,
            })),
          };

          io.to(`match:${matchId}`).emit("message_received", wire);
          if (isFlagged) {
            io.to(`match:${matchId}`).emit("message_flagged", {
              matchId,
              messageId: created.id,
              reasons: scan.matches.map((m) => m.reason),
            });
          }
          ack?.({ ok: true, message: wire });
        } catch (err) {
          console.error("[send_message] persist failed:", err);
          ack?.({ ok: false, error: "Could not send" });
        }
      });

      socket.on("typing", async (matchId) => {
        if (typeof matchId !== "string") return;
        if (!(await isParticipant(matchId, userId))) return;
        // To the OTHER side only — skip the sender's own socket
        socket
          .to(`match:${matchId}`)
          .emit("typing_indicator", { matchId, userId });
      });

      socket.on("mark_read", async (matchId) => {
        if (typeof matchId !== "string") return;
        if (!(await isParticipant(matchId, userId))) return;
        const now = new Date();
        await prisma.message
          .updateMany({
            where: {
              matchId,
              senderId: { not: userId },
              isRead: false,
            },
            data: { isRead: true },
          })
          .catch(() => undefined);
        io.to(`match:${matchId}`).emit("messages_read", {
          matchId,
          readerId: userId,
          at: now.toISOString(),
        });
      });

      socket.on("disconnect", () => {
        // No explicit leave needed — socket.io cleans up rooms.
      });
    });

    // Stash on global for any future REST handler that wants to emit
    (globalThis as unknown as { __pawmatchIo?: typeof io }).__pawmatchIo = io;

    httpServer.listen(port, () => {
      console.log(
        `▲ PawMatch server (Next + Socket.io) ready on http://${hostname}:${port}`
      );
    });
  })
  .catch((err) => {
    console.error("Server failed to start:", err);
    process.exit(1);
  });

/* ─── Helpers ──────────────────────────────────────────────────────── */

function parseCookieHeader(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const pair of header.split(/; */)) {
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

async function isParticipant(matchId: string, userId: string): Promise<boolean> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { status: true, initiatedById: true, receivedById: true },
  });
  if (!match) return false;
  if (match.status !== "ACCEPTED") return false;
  return match.initiatedById === userId || match.receivedById === userId;
}
