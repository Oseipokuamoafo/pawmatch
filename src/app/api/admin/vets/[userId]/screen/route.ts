import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runScreenAndPersist } from "@/lib/vet-screening-handler";

type Ctx = { params: Promise<{ userId: string }> };

/**
 * POST /api/admin/vets/[userId]/screen
 *
 * Re-runs the Claude AI auto-screen on a vet applicant. Used by admins
 * to refresh a stale verdict, or to retry one that errored. Synchronous —
 * blocks until the screen completes so the admin sees the updated verdict
 * on the next page reload.
 *
 * ADMIN only.
 */
export async function POST(_req: Request, ctx: Ctx) {
  const { userId } = await ctx.params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const applicant = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      vetLicenseNumber: true,
      vetLicenseState: true,
      vetPracticeName: true,
      vetPracticeAddress: true,
      vetApplicationStatus: true,
    },
  });
  if (!applicant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (
    !applicant.vetLicenseNumber ||
    !applicant.vetLicenseState ||
    !applicant.vetPracticeName ||
    !applicant.vetPracticeAddress
  ) {
    return NextResponse.json(
      { error: "Applicant is missing license details" },
      { status: 400 },
    );
  }

  const outcome = await runScreenAndPersist(applicant.id, {
    name: applicant.name ?? "",
    licenseNumber: applicant.vetLicenseNumber,
    licenseState: applicant.vetLicenseState,
    practiceName: applicant.vetPracticeName,
    practiceAddress: applicant.vetPracticeAddress,
  });

  return NextResponse.json(outcome);
}
