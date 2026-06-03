import { NextResponse } from "next/server";
import type Stripe from "stripe";
import * as Sentry from "@sentry/nextjs";

import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { Prisma } from "@/generated/prisma";
import type { SubscriptionStatus, SubscriptionPlan } from "@/generated/prisma";
import { recordAudit, AUDIT_ACTIONS } from "@/lib/audit";

/**
 * Stripe webhook receiver. The single source of truth for Subscription
 * state — never write subscription rows from any other code path.
 *
 * Critical implementation notes:
 *
 * 1. **Raw body for signature verification.** Stripe signs the exact
 *    bytes of the request body. Next's `req.json()` would re-serialize
 *    and break the signature. We use `req.text()` here.
 *
 * 2. **Idempotency.** Stripe retries failed deliveries with the same
 *    event.id. We upsert by stripeSubscriptionId so re-delivery is safe.
 *
 * 3. **Always 200 on signature pass.** If a downstream Prisma write
 *    fails we still return 200 (and log) — replying non-2xx makes
 *    Stripe retry, which compounds the failure. The exception is
 *    signature-verification failure, which 400s by design.
 */
export async function POST(req: Request) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeSecret || !webhookSecret) {
    console.error("[billing/webhook] Stripe not configured");
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // RAW body — must be the exact bytes Stripe signed.
  const rawBody = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.warn(`[billing/webhook] signature verification failed: ${message}`);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await upsertSubscriptionFromStripe(
          event.data.object as Stripe.Subscription,
          event.type,
        );
        break;

      case "invoice.payment_failed": {
        // Stripe will follow up with a customer.subscription.updated
        // setting status=past_due — but log immediately so we have a
        // trail tied to the invoice.
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : (invoice.customer?.id ?? null);
        console.warn(
          `[billing/webhook] invoice.payment_failed for ${customerId ?? "?"}`,
        );
        if (customerId) {
          const user = await prisma.user.findUnique({
            where: { stripeCustomerId: customerId },
            select: { id: true },
          });
          await recordAudit({
            actorId: null,
            action: AUDIT_ACTIONS.SUBSCRIPTION_PAYMENT_FAILED,
            subjectType: user ? "User" : "StripeCustomer",
            subjectId: user?.id ?? customerId,
            metadata: {
              invoiceId: invoice.id,
              amountDue: invoice.amount_due,
              attemptCount: invoice.attempt_count,
            },
          });
        }
        break;
      }

      default:
        // Unhandled types are fine — Stripe sends many we don't care about
        break;
    }
  } catch (err) {
    console.error(
      `[billing/webhook] failed to process ${event.type} (${event.id}):`,
      err,
    );
    Sentry.captureException(err, {
      tags: { surface: "billing-webhook", eventType: event.type },
      extra: { eventId: event.id },
    });
    // 200 anyway — see note (3) above. The next webhook (or admin
    // re-run) will re-sync.
  }

  return NextResponse.json({ received: true });
}

/* ─── Sync helper ─────────────────────────────────────────────────────── */

async function upsertSubscriptionFromStripe(
  sub: Stripe.Subscription,
  eventType: string,
): Promise<void> {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  // Look up the user via the cached stripeCustomerId. If we can't find
  // them, something is wrong (customer was created outside our flow) —
  // log and bail. We never want to create a User row from a webhook.
  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  if (!user) {
    console.warn(
      `[billing/webhook] no user found for Stripe customer ${customerId}`,
    );
    return;
  }

  const item = sub.items.data[0];
  if (!item) {
    console.warn(`[billing/webhook] subscription ${sub.id} has no items`);
    return;
  }

  const status = mapStatus(sub.status);
  const plan: SubscriptionPlan = "PRO_PLUS"; // only tier we sell today

  // Stripe moved current_period_start/end from Subscription to the
  // SubscriptionItem. Use the item's values; older Stripe API versions
  // shipped both, newer ones only the item. Either way the item is the
  // safe read.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itemAny = item as any;
  const periodStart: number | null =
    typeof itemAny.current_period_start === "number"
      ? itemAny.current_period_start
      : null;
  const periodEnd: number | null =
    typeof itemAny.current_period_end === "number"
      ? itemAny.current_period_end
      : null;
  if (!periodStart || !periodEnd) {
    console.warn(
      `[billing/webhook] subscription ${sub.id} missing period dates`,
    );
    return;
  }

  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: sub.id },
    create: {
      userId: user.id,
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      stripePriceId: item.price.id,
      plan,
      status,
      currentPeriodStart: new Date(periodStart * 1000),
      currentPeriodEnd: new Date(periodEnd * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
    },
    update: {
      stripePriceId: item.price.id,
      plan,
      status,
      currentPeriodStart: new Date(periodStart * 1000),
      currentPeriodEnd: new Date(periodEnd * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
    },
  });

  // Map Stripe event type → our audit action.
  const action =
    eventType === "customer.subscription.created"
      ? AUDIT_ACTIONS.SUBSCRIPTION_CREATED
      : eventType === "customer.subscription.deleted" || sub.status === "canceled"
        ? AUDIT_ACTIONS.SUBSCRIPTION_CANCELED
        : AUDIT_ACTIONS.SUBSCRIPTION_UPDATED;

  await recordAudit({
    actorId: null,
    action,
    subjectType: "Subscription",
    subjectId: sub.id,
    metadata: {
      userId: user.id,
      status,
      plan,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      stripeEventType: eventType,
    },
  });

  // Silence unused-import warning when no Prisma errors fire
  void Prisma;
}

/** Map Stripe's lowercase status string to our enum. */
function mapStatus(s: Stripe.Subscription.Status): SubscriptionStatus {
  switch (s) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    case "incomplete":
      return "INCOMPLETE";
    case "incomplete_expired":
      return "INCOMPLETE_EXPIRED";
    case "unpaid":
      return "UNPAID";
    case "paused":
      return "PAUSED";
    default:
      // Future Stripe status we don't know about yet — log + safest fallback.
      console.warn(`[billing/webhook] unknown Stripe status: ${s as string}`);
      return "INCOMPLETE";
  }
}
