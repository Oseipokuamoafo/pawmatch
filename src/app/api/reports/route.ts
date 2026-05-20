import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createReportSchema } from "@/lib/validations/report";
import { sendReportThresholdAlert } from "@/lib/email";

const REPORT_ALERT_THRESHOLD = 3;

/**
 * POST /api/reports — community report submission.
 *
 * Requires auth. Either targetUserId or targetPetId (or both) must be set.
 * Blocks duplicate open reports from the same reporter for the same target.
 * Triggers an admin alert email when a target crosses the open-report
 * threshold for the first time.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { targetUserId, targetPetId, reason, description } = parsed.data;

  // Validate target exists; collect display label for the threshold email
  let targetLabel = "Unknown target";
  if (targetPetId) {
    const pet = await prisma.pet.findUnique({
      where: { id: targetPetId },
      select: { id: true, name: true, ownerId: true },
    });
    if (!pet) return NextResponse.json({ error: "Pet not found" }, { status: 404 });
    if (pet.ownerId === session.user.id) {
      return NextResponse.json(
        { error: "Can't report your own pet" },
        { status: 400 }
      );
    }
    targetLabel = `pet "${pet.name}"`;
  }
  if (targetUserId) {
    if (targetUserId === session.user.id) {
      return NextResponse.json(
        { error: "Can't report yourself" },
        { status: 400 }
      );
    }
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, email: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    targetLabel = `user ${user.name ?? user.email}`;
  }

  // Dedupe — block this reporter from reopening an OPEN/REVIEWED report
  // for the same target
  const existing = await prisma.report.findFirst({
    where: {
      reporterId: session.user.id,
      ...(targetPetId ? { targetPetId } : {}),
      ...(targetUserId ? { targetUserId } : {}),
      status: { in: ["OPEN", "REVIEWED"] },
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: "You've already reported this — we're on it." },
      { status: 409 }
    );
  }

  const report = await prisma.report.create({
    data: {
      reporterId: session.user.id,
      targetUserId: targetUserId ?? null,
      targetPetId: targetPetId ?? null,
      reason,
      description: description?.trim() || null,
      status: "OPEN",
    },
  });

  // Threshold check — count distinct OPEN reports for the target. We alert
  // exactly once (when crossing the threshold the first time).
  const openCount = await prisma.report.count({
    where: {
      status: "OPEN",
      ...(targetPetId ? { targetPetId } : {}),
      ...(targetUserId ? { targetUserId } : {}),
    },
  });
  if (openCount === REPORT_ALERT_THRESHOLD) {
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { email: true },
    });
    for (const a of admins) {
      sendReportThresholdAlert({
        to: a.email,
        targetLabel,
        reason,
        reportCount: openCount,
      }).catch(() => undefined);
    }
  }

  return NextResponse.json({ report }, { status: 201 });
}
