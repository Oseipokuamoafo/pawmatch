import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/reports
 * Admin-only. Returns reports with reporter + target details. Open rows
 * bubble to the top.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await prisma.report.findMany({
    include: {
      reporter: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  // Join target metadata in a second pass so we keep the SQL simple
  const petIds = rows.map((r) => r.targetPetId).filter((id): id is string => Boolean(id));
  const userIds = rows.map((r) => r.targetUserId).filter((id): id is string => Boolean(id));

  const [pets, users] = await Promise.all([
    petIds.length
      ? prisma.pet.findMany({
          where: { id: { in: petIds } },
          select: { id: true, name: true, breed: true, ownerId: true },
        })
      : Promise.resolve([]),
    userIds.length
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : Promise.resolve([]),
  ]);

  const petById = new Map(pets.map((p) => [p.id, p]));
  const userById = new Map(users.map((u) => [u.id, u]));

  const reports = rows.map((r) => ({
    ...r,
    target: {
      pet: r.targetPetId ? petById.get(r.targetPetId) ?? null : null,
      user: r.targetUserId ? userById.get(r.targetUserId) ?? null : null,
    },
  }));

  return NextResponse.json({ reports });
}
