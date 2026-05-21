"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import type { AIScreenStatus } from "@/lib/vet-application-state";

/**
 * Polls /api/me/vet-status every few seconds while a vet applicant
 * sits on the pending dashboard. When the AI screen verdict updates
 * (PENDING → MATCH/MISMATCH/NO_DATA/ERROR) we trigger router.refresh
 * so the takeover step indicator re-renders with the new state; when
 * the user is promoted to VET we navigate them straight to their
 * inbox without a manual reload.
 *
 * Cheap on the wire — endpoint is a small SELECT returning 3 fields
 * and 8s × ≤60s expected dwell time = 7 polls per applicant in the
 * worst case.
 */

const POLL_INTERVAL_MS = 8_000;

interface VetStatusPollerProps {
  initialRole: "OWNER" | "BREEDER" | "VET" | "ADMIN";
  initialApplicationStatus:
    | "NONE"
    | "PENDING"
    | "APPROVED"
    | "REJECTED";
  initialAIScreenStatus: AIScreenStatus;
}

interface StatusResponse {
  role: "OWNER" | "BREEDER" | "VET" | "ADMIN";
  vetApplicationStatus: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
  aiScreenStatus: AIScreenStatus;
}

export function VetStatusPoller({
  initialRole,
  initialApplicationStatus,
  initialAIScreenStatus,
}: VetStatusPollerProps) {
  const router = useRouter();
  // Lock the initial snapshot so we compare against what the server
  // actually rendered, not the previous poll. Avoids the false-positive
  // "changed!" the first time we refresh.
  const snapshot = useRef({
    role: initialRole,
    applicationStatus: initialApplicationStatus,
    aiScreenStatus: initialAIScreenStatus,
  });

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      if (cancelled) return;
      try {
        const r = await fetch("/api/me/vet-status", { cache: "no-store" });
        if (!r.ok) return;
        const data = (await r.json()) as StatusResponse;

        // Promoted to VET — bounce straight to the inbox.
        if (data.role === "VET" && snapshot.current.role !== "VET") {
          router.replace("/dashboard/vet");
          return;
        }

        // Any other change → re-render the server component so the step
        // indicator + headline pick up the new status.
        if (
          data.role !== snapshot.current.role ||
          data.vetApplicationStatus !== snapshot.current.applicationStatus ||
          data.aiScreenStatus !== snapshot.current.aiScreenStatus
        ) {
          snapshot.current = {
            role: data.role,
            applicationStatus: data.vetApplicationStatus,
            aiScreenStatus: data.aiScreenStatus,
          };
          router.refresh();
        }
      } catch {
        // Silent — transient network blips shouldn't surface as errors
        // here. Next tick will try again.
      }
    }

    const id = window.setInterval(tick, POLL_INTERVAL_MS);
    // Kick off an immediate poll too — first refetch within ~1s of load
    // so an applicant who was approved between page render and arrival
    // gets the redirect right away.
    const initial = window.setTimeout(tick, 1_000);
    // Also re-check when the user comes back to the tab.
    const onFocus = () => void tick();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.clearTimeout(initial);
      window.removeEventListener("focus", onFocus);
    };
  }, [router]);

  return null;
}
