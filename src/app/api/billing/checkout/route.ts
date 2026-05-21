import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

/**
 * POST /api/billing/checkout
 *
 * Creates a Stripe Checkout Session for Pro+ ($19.99/mo) and returns
 * the hosted URL. Lazily creates a Stripe Customer if the user doesn't
 * have one yet, caching the id on User.stripeCustomerId so future
 * checkouts and portal sessions reuse it.
 *
 * If the user already has an active Pro+ sub, we 409 — they should
 * use the Customer Portal to change/cancel, not start a new checkout.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isStripeConfigured() || !process.env.STRIPE_PRO_PLUS_PRICE_ID) {
    return NextResponse.json(
      {
        error:
          "Billing not configured. Set STRIPE_SECRET_KEY and STRIPE_PRO_PLUS_PRICE_ID.",
      },
      { status: 503 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      stripeCustomerId: true,
      subscription: {
        select: { status: true, currentPeriodEnd: true },
      },
    },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // If they already have an active subscription, refuse — they should
  // use the portal to manage it.
  if (
    user.subscription &&
    (user.subscription.status === "ACTIVE" ||
      user.subscription.status === "TRIALING") &&
    user.subscription.currentPeriodEnd.getTime() > Date.now()
  ) {
    return NextResponse.json(
      { error: "You already have an active subscription." },
      { status: 409 },
    );
  }

  const stripe = getStripe();

  // Lazily create the Stripe Customer.
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name ?? undefined,
      // Embed our user id so the webhook can recover the mapping if the
      // local User row is somehow detached from the cached id.
      metadata: { pawmatchUserId: user.id },
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const baseUrl =
    process.env.STRIPE_RETURN_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3142";

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [
      { price: process.env.STRIPE_PRO_PLUS_PRICE_ID, quantity: 1 },
    ],
    success_url: `${baseUrl}/dashboard/billing?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/pricing?status=canceled`,
    allow_promotion_codes: true,
    metadata: { pawmatchUserId: user.id },
    subscription_data: {
      metadata: { pawmatchUserId: user.id },
    },
  });

  if (!checkout.url) {
    return NextResponse.json(
      { error: "Stripe returned no checkout URL" },
      { status: 500 },
    );
  }

  return NextResponse.json({ url: checkout.url });
}
