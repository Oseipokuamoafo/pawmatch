import { Inngest } from "inngest";

/**
 * Inngest client + event-payload types.
 *
 * Why Inngest:
 *   - No Redis to provision; runs as a handler at /api/inngest.
 *   - Step-level retries + idempotency for free.
 *   - Local dev auto-detects when INNGEST_EVENT_KEY is unset and looks
 *     for the Inngest Dev Server on localhost:8288 — no prod secrets
 *     needed to develop. Run: `npx inngest-cli@latest dev`.
 *
 * Why not just keep `void runScreenAndPersist(...)`:
 *   - Fire-and-forget Promises die silently on crash/timeout.
 *   - No retries — an Anthropic 529 currently drops the screen and the
 *     user stays in PENDING forever.
 *   - No observability into failures.
 *
 * Event-name convention: `<domain>/<entity>.<verb_past_tense>`.
 *
 * Inngest v4 removed `EventSchemas` — events are typed explicitly at
 * the call/handler boundary instead. We declare the union of supported
 * event payloads here so call sites stay self-documenting.
 */

export interface VetApplicationSubmittedEvent {
  name: "vet/application.submitted";
  data: {
    userId: string;
    name: string;
    licenseNumber: string;
    licenseState: string;
    practiceName: string;
    practiceAddress: string;
  };
}

export type AppEvent = VetApplicationSubmittedEvent;

export const inngest = new Inngest({ id: "pawmatch" });
