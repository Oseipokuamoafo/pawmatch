/**
 * Sentry browser-runtime config. Loaded by Next.js automatically.
 *
 * Graceful no-op when SENTRY_DSN isn't set so the dev experience
 * stays clean — no need to provision a Sentry project to run locally.
 */
import * as Sentry from "@sentry/nextjs";

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (DSN) {
  Sentry.init({
    dsn: DSN,
    tracesSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0,
    environment: process.env.NODE_ENV,
    enabled: process.env.NODE_ENV === "production",
  });
}

// Required by @sentry/nextjs for App Router navigation
// instrumentation — exported even when DSN is unset so the SDK can
// no-op gracefully.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
