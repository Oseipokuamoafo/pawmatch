import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasProPlusAccessFromRow, PRO_PLUS_LABEL } from "@/lib/billing";
import { BillingPanel } from "@/components/billing/BillingPanel";

export const metadata = {
  title: "Billing — PawMatch",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; session_id?: string }>;
}) {
  const { status } = await searchParams;

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/billing");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      stripeCustomerId: true,
      subscription: {
        select: {
          plan: true,
          status: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          canceledAt: true,
        },
      },
    },
  });

  const active = hasProPlusAccessFromRow(user?.subscription ?? null);

  return (
    <BillingPanel
      planLabel={PRO_PLUS_LABEL}
      active={active}
      sub={
        user?.subscription
          ? {
              status: user.subscription.status,
              currentPeriodStart:
                user.subscription.currentPeriodStart.toISOString(),
              currentPeriodEnd:
                user.subscription.currentPeriodEnd.toISOString(),
              cancelAtPeriodEnd: user.subscription.cancelAtPeriodEnd,
            }
          : null
      }
      hasStripeCustomer={Boolean(user?.stripeCustomerId)}
      justUpgraded={status === "success"}
    />
  );
}
