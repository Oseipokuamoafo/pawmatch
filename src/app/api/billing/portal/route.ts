import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

/**
 * POST /api/billing/portal
 *
 * Creates a Stripe Customer Portal session and returns the URL. The
 * portal lets the user change card, cancel, resume, view invoices.
 * Requires a stripeCustomerId — anyone who's hit checkout once has one.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Billing not configured." },
      { status: 503 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { stripeCustomerId: true },
  });
  if (!user?.stripeCustomerId) {
    return NextResponse.json(
      { error: "No billing record yet — start a subscription first." },
      { status: 400 },
    );
  }

  const baseUrl =
    process.env.STRIPE_RETURN_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3142";

  const portal = await getStripe().billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${baseUrl}/dashboard/billing`,
  });

  return NextResponse.json({ url: portal.url });
}
