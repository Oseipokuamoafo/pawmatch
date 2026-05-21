"use client";

import { useEffect, useRef } from "react";
import { io as ioClient, type Socket } from "socket.io-client";

import { RealtimeEvent } from "@/lib/realtime";

/**
 * Subscribes the current vet to their personal `user:<userId>` room
 * via the existing Socket.io server and fires `onCosignRequested` /
 * `onCosignCancelled` callbacks as events arrive.
 *
 * The shared chat socket auto-joins the user room (see src/server.ts);
 * this hook opens a second connection scoped to the vet inbox so it
 * stays alive independently of /messages/[matchId] open/close cycles.
 * Sockets are cheap; one extra per active vet is fine.
 */
export function useVetInboxSocket(opts: {
  enabled: boolean;
  onCosignRequested: (payload: { id: string }) => void;
  onCosignCancelled: (payload: { id: string }) => void;
}) {
  // Hold the callbacks in refs so we can reconnect without re-binding
  // listeners every render — otherwise React would tear down + recreate
  // the socket on each parent re-render.
  const reqCb = useRef(opts.onCosignRequested);
  const cancelCb = useRef(opts.onCosignCancelled);
  reqCb.current = opts.onCosignRequested;
  cancelCb.current = opts.onCosignCancelled;

  useEffect(() => {
    if (!opts.enabled) return;
    const socket: Socket = ioClient({
      path: "/api/socket.io",
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 5_000,
    });

    socket.on(RealtimeEvent.VetCosignRequested, (payload: { id: string }) => {
      reqCb.current(payload);
    });
    socket.on(RealtimeEvent.VetCosignCancelled, (payload: { id: string }) => {
      cancelCb.current(payload);
    });

    return () => {
      socket.disconnect();
    };
  }, [opts.enabled]);
}
