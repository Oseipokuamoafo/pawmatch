/**
 * Next.js instrumentation entry point. Wires Sentry's server + edge
 * runtimes (per the official Next.js + Sentry App Router pattern).
 *
 * Browser runtime is wired separately via instrumentation-client.ts.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// onRequestError captures server-action + RSC errors automatically.
// Older versions of @sentry/nextjs don't export this — re-export is
// optional, the explicit Sentry.captureException calls at our critical
// paths cover the rest.
import * as Sentry from "@sentry/nextjs";
type SentryWithReq = typeof Sentry & {
  captureRequestError?: (err: unknown, request: unknown, errorContext: unknown) => void;
};
const s = Sentry as SentryWithReq;
export const onRequestError = s.captureRequestError ?? (() => undefined);
