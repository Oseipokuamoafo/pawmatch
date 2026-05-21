import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasProPlusAccessFromRow, PRO_PLUS_PRICE_LABEL } from "@/lib/billing";
import { PricingTable } from "@/components/billing/PricingTable";

export const metadata = {
  title: "Pricing — PawMatch",
  description:
    "Free for everyone. Pro+ unlocks the Claude-powered breeding assistant and more.",
};

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const session = await auth();
  let signedIn = false;
  let alreadyPro = false;

  if (session?.user?.id) {
    signedIn = true;
    const sub = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
      select: {
        status: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
      },
    });
    alreadyPro = hasProPlusAccessFromRow(sub);
  }

  return (
    <PricingTable
      signedIn={signedIn}
      alreadyPro={alreadyPro}
      canceledFromCheckout={status === "canceled"}
      proPriceLabel={PRO_PLUS_PRICE_LABEL}
    />
  );
}
