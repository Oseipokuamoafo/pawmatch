/**
 * Pure helper that maps the applicant's `aiScreenStatus` to the
 * <VetApplicationPending> view state. Extracted from the component so
 * the matrix can be unit-tested without rendering.
 *
 * From the APPLICANT'S perspective ERROR is indistinguishable from
 * PENDING — the AI screen failed, an admin will pick it up. We don't
 * leak that to the applicant; they just see "we're still checking."
 * That's why the screen step is `inflight` (not `done`) on ERROR.
 */

export type AIScreenStatus =
  | "PENDING"
  | "MATCH"
  | "MISMATCH"
  | "NO_DATA"
  | "ERROR"
  | null;

export interface PendingViewState {
  /** Whether the AI screen is still considered in flight from the
   *  applicant's view. ERROR is treated as in-flight (admin will rerun
   *  or override) — never as done. */
  phase: "screening" | "admin_review";
  headline: string;
  subhead: string;
  /** Display state of the "Cross-referenced with state board" step. */
  screenStep: "inflight" | "done";
  /** Display state of the "Admin sign-off + welcome email" step. */
  adminStep: "inflight" | "pending";
}

export function pendingViewStateFor(
  status: AIScreenStatus,
): PendingViewState {
  // Concluded statuses where the screen actually returned a verdict.
  // ERROR is intentionally NOT in this set — see file header.
  const screenConcluded =
    status === "MATCH" || status === "MISMATCH" || status === "NO_DATA";

  if (screenConcluded) {
    return {
      phase: "admin_review",
      headline: "Final review with our team.",
      subhead:
        "A PawMatch admin is doing the final sign-off. We'll email you within 24 hours.",
      screenStep: "done",
      adminStep: "inflight",
    };
  }

  return {
    phase: "screening",
    headline: "We're checking your license.",
    subhead:
      "Our automated screen is cross-referencing your details against your state veterinary medical board. This usually completes within a few minutes.",
    screenStep: "inflight",
    adminStep: "pending",
  };
}
