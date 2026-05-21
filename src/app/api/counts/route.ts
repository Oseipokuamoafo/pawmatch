import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Header counts for the profile dropdown + global nav badges.
 *
 *   pets             — active pets owned by the user
 *   pendingMatches   — match requests received by the user, still PENDING
 *   unreadMessages   — messages on accepted matches where the user is on the
 *                      receiving side (sender != user, isRead = false)
 *   avgHealthScore   — average per-pet health score (0-100). Each pet scores
 *                      min(100, verifiedRecords * 25). Pets with no records
 *                      score 0. Returns 0 when the user has no pets yet.
 *   vetPendingCosigns — health records awaiting this user's signature
 *                       (only meaningful when role=VET; 0 otherwise).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const isVet = session.user.role === "VET";

  const [pets, pendingMatches, unreadMessages, vetPendingCosigns] =
    await Promise.all([
      prisma.pet.findMany({
        where: { ownerId: userId, isActive: true },
        select: {
          id: true,
          healthRecords: { select: { isVerified: true } },
        },
      }),
      prisma.match.count({
        where: {
          status: "PENDING",
          petB: { ownerId: userId },
        },
      }),
      prisma.message.count({
        where: {
          isRead: false,
          senderId: { not: userId },
          match: {
            status: "ACCEPTED",
            OR: [{ initiatedById: userId }, { receivedById: userId }],
          },
        },
      }),
      isVet
        ? prisma.petHealth.count({
            where: { requestedVetId: userId, isVerified: false },
          })
        : Promise.resolve(0),
    ]);

  const petsCount = pets.length;

  const avgHealthScore = petsCount
    ? Math.round(
        pets.reduce((sum, p) => {
          const verified = p.healthRecords.filter((h) => h.isVerified).length;
          return sum + Math.min(100, verified * 25);
        }, 0) / petsCount,
      )
    : 0;

  return NextResponse.json({
    pets: petsCount,
    pendingMatches,
    unreadMessages,
    avgHealthScore,
    vetPendingCosigns,
  });
}
