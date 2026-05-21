import * as Sentry from "@sentry/nextjs";

import { inngest, type VetApplicationSubmittedEvent } from "@/lib/inngest";
import { runScreenAndPersist } from "@/lib/vet-screening-handler";

/**
 * Inngest function: runs the AI vet-license auto-screen.
 *
 * Replaces the previous `void kickoffScreen(...)` fire-and-forget
 * pattern. Step-level retries handle Anthropic 5xx/529s without
 * losing the job; the Inngest dashboard surfaces every run.
 *
 * Idempotency: the `throttle` block ensures duplicate
 * `vet/application.submitted` events for the same user (e.g. an admin
 * manually re-running while a screen is in-flight) don't cause
 * concurrent Claude calls.
 */
export const screenVetApplication = inngest.createFunction(
  {
    id: "screen-vet-application",
    retries: 3,
    throttle: {
      limit: 1,
      period: "30s",
      key: "event.data.userId",
    },
    triggers: [{ event: "vet/application.submitted" }],
  },
  async ({ event, step }) => {
    const data = (event as unknown as VetApplicationSubmittedEvent).data;
    try {
      const outcome = await step.run("screen-and-persist", () =>
        runScreenAndPersist(data.userId, {
          name: data.name,
          licenseNumber: data.licenseNumber,
          licenseState: data.licenseState,
          practiceName: data.practiceName,
          practiceAddress: data.practiceAddress,
        }),
      );
      return {
        userId: outcome.userId,
        autoApproved: outcome.autoApproved,
        verdictStatus: outcome.verdict?.status ?? "error",
      };
    } catch (err) {
      Sentry.captureException(err, {
        tags: { surface: "inngest/screen-vet", userId: data.userId },
      });
      throw err;
    }
  },
);
