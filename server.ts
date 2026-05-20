/**
 * Custom Next.js server bundling Socket.io alongside the App Router.
 *
 * Why custom server: Next.js App Router doesn't host WebSocket
 * connections in route handlers, so real-time chat lives on a side
 * socket.io server attached to the same HTTP listener.
 *
 * Dev:   `npm run dev`   → tsx server.ts (Next in dev mode + sockets)
 * Prod:  not for Vercel; on a long-running host, build with `next build`
 *        then `npm run start` which runs the same `tsx server.ts`
 *        in production mode.
 */

import { createServer } from "node:http";
import next from "next";
import { Server as IOServer } from "socket.io";

import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "./src/lib/socket-types";

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
      cors: {
        // Same-origin in this app — accept anything in dev.
        origin: true,
        credentials: true,
      },
    });

    io.on("connection", (socket) => {
      socket.on("match:join", (matchId) => {
        if (typeof matchId !== "string" || matchId.length === 0) return;
        socket.join(`match:${matchId}`);
        socket.data.matchIds = [
          ...new Set([...(socket.data.matchIds ?? []), matchId]),
        ];
      });

      socket.on("match:leave", (matchId) => {
        if (typeof matchId !== "string" || matchId.length === 0) return;
        socket.leave(`match:${matchId}`);
        if (socket.data.matchIds) {
          socket.data.matchIds = socket.data.matchIds.filter(
            (id) => id !== matchId
          );
        }
      });
    });

    // Stash the instance globally so API route handlers (which run in
    // the same Node process) can emit without a network round-trip.
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
