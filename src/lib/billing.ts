import { prisma } from "@/lib/prisma";
import type { Subscription, SubscriptionStatus } from "@/generated/prisma";

/**
 * Billing helpers — the source of truth for "does this user have
 * Pro+ access right now?". Reads from the Subscription table only;
 * never hits Stripe directly. The webhook handler owns syncing
 * Subscription rows from Stripe events, so this stays a fast DB read.
 *
 * For dev convenience: setting FEATURE_BREEDING_ASSISTANT=on in
 * .env.local *also* grants access without a real subscription. This
 * is documented in .env.example and is intentionally a server-side-only
 * flag (never NEXT_PUBLIC_) so it can't leak past dev.
 */

/** Plan label shown to users and on receipts. */
export const PRO_PLUS_LABEL = "PawMatch Pro+";
/** Headline price. Single source of truth for marketing + pricing page. */
export const PRO_PLUS_PRICE_LABEL = "$19.99 / month";

/* ─── Pure access policy ─────────────────────────────────────────────── */

/** Stripe statuses that grant access while currentPeriodEnd is in the
 *  future. Doesn't include PAUSED — paused subs are explicitly mid-hold. */
const GRANTING_STATUSES = new Set<SubscriptionStatus>(["ACTIVE", "TRIALING"]);

export interface SubscriptionSnapshot {
  status: SubscriptionStatus;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

/**
 * Pure decision: does this subscription grant Pro+ access *right now*?
 *
 * A user with `cancelAtPeriodEnd=true` still has access until
 * currentPeriodEnd — they cancelled but pre-paid through the period.
 * Exported separately from the DB-reading helper so it's trivially
 * unit-testable without a database fixture.
 */
export function isProPlusActive(
  sub: SubscriptionSnapshot | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!sub) return false;
  if (!GRANTING_STATUSES.has(sub.status)) return false;
  return sub.currentPeriodEnd.getTime() > now.getTime();
}

/* ─── DB-reading helper ──────────────────────────────────────────────── */

/**
 * Authoritative check for the server. Returns true if the user holds
 * an active Pro+ subscription, or if the dev override is on.
 */
export async function hasProPlusAccess(userId: string): Promise<boolean> {
  // Dev override — lets contributors run the assistant locally without
  // wiring Stripe. Production should NEVER have this set.
  if (process.env.FEATURE_BREEDING_ASSISTANT === "on") return true;

  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { status: true, currentPeriodEnd: true, cancelAtPeriodEnd: true },
  });
  return isProPlusActive(sub);
}

/**
 * Lighter-weight variant when the caller already has the Subscription
 * row in hand (e.g. via a join from a wider query). Skips the dev
 * override on purpose — use when you specifically want the "real" answer.
 */
export function hasProPlusAccessFromRow(
  sub: Pick<
    Subscription,
    "status" | "currentPeriodEnd" | "cancelAtPeriodEnd"
  > | null,
): boolean {
  return isProPlusActive(sub);
}
