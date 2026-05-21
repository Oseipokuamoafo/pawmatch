import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/vet/inbox
 *
 * Returns the calling vet's pending co-sign requests and a small slice of
 * recently signed records. VET role required.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "VET") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [pending, recentlySigned] = await Promise.all([
    prisma.petHealth.findMany({
      where: {
        requestedVetId: session.user.id,
        isVerified: false,
      },
      orderBy: { requestedAt: "desc" },
      include: {
        pet: {
          select: {
            id: true,
            name: true,
            breed: true,
            species: true,
            owner: { select: { id: true, name: true, email: true } },
          },
        },
      },
    }),
    prisma.petHealth.findMany({
      where: { verifiedByVetId: session.user.id, isVerified: true },
      orderBy: { verifiedAt: "desc" },
      take: 10,
      include: {
        pet: {
          select: { id: true, name: true, breed: true, species: true },
        },
      },
    }),
  ]);

  return NextResponse.json({ pending, recentlySigned });
}
