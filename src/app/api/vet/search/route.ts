import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/vet/search?q=<query>
 *
 * Used by the owner-side vet picker. Returns approved vets whose name,
 * practice, license #, or state matches the query. Capped at 20 results.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();

  const where = {
    role: "VET" as const,
    vetApplicationStatus: "APPROVED" as const,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { vetPracticeName: { contains: q, mode: "insensitive" as const } },
            { vetLicenseNumber: { contains: q, mode: "insensitive" as const } },
            { vetLicenseState: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const vets = await prisma.user.findMany({
    where,
    take: 20,
    orderBy: [{ vetApprovedAt: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      vetPracticeName: true,
      vetPracticeAddress: true,
      vetLicenseState: true,
      vetLicenseNumber: true,
    },
  });

  return NextResponse.json({ vets });
}
