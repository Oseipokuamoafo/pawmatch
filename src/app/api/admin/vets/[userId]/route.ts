import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  sendVetApplicationApproved,
  sendVetApplicationRejected,
} from "@/lib/email";
import { vetApplicationActionSchema } from "@/lib/validations/vet";
import { recordAudit, AUDIT_ACTIONS } from "@/lib/audit";

type Ctx = { params: Promise<{ userId: string }> };

/**
 * PATCH /api/admin/vets/[userId]
 *
 * Body: { action: "approve" | "reject", notes?: string }
 *
 * Approve → user.role = VET, vetApplicationStatus = APPROVED,
 *           vetApprovedAt = now, vetApprovedById = admin.id, send email.
 * Reject  → vetApplicationStatus = REJECTED; role left unchanged. Email sent.
 *
 * Only callable by ADMINs.
 */
export async function PATCH(req: Request, ctx: Ctx) {
  const { userId } = await ctx.params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = vetApplicationActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const applicant = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      vetApplicationStatus: true,
      vetPracticeName: true,
    },
  });
  if (!applicant) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (applicant.vetApplicationStatus !== "PENDING") {
    return NextResponse.json(
      {
        error: `Application is ${applicant.vetApplicationStatus.toLowerCase()}; nothing to do.`,
      },
      { status: 409 },
    );
  }

  if (parsed.data.action === "approve") {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        role: "VET",
        vetApplicationStatus: "APPROVED",
        vetApprovedAt: new Date(),
        vetApprovedById: session.user.id,
      },
      select: { id: true, role: true, vetApplicationStatus: true },
    });
    await recordAudit({
      actorId: session.user.id,
      actorRole: "ADMIN",
      action: AUDIT_ACTIONS.VET_APPLICATION_APPROVED,
      subjectType: "User",
      subjectId: userId,
      metadata: {
        previousRole: applicant.role,
        newRole: "VET",
        previousStatus: "PENDING",
        newStatus: "APPROVED",
        practiceName: applicant.vetPracticeName,
      },
      request: req,
    });
    await sendVetApplicationApproved({
      to: applicant.email,
      name: applicant.name,
      practiceName: applicant.vetPracticeName,
    });
    return NextResponse.json({ user: updated });
  }

  // reject
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { vetApplicationStatus: "REJECTED" },
    select: { id: true, role: true, vetApplicationStatus: true },
  });
  await recordAudit({
    actorId: session.user.id,
    actorRole: "ADMIN",
    action: AUDIT_ACTIONS.VET_APPLICATION_REJECTED,
    subjectType: "User",
    subjectId: userId,
    metadata: {
      previousStatus: "PENDING",
      newStatus: "REJECTED",
      reasonProvided: Boolean(parsed.data.notes),
    },
    request: req,
  });
  await sendVetApplicationRejected({
    to: applicant.email,
    name: applicant.name,
    notes: parsed.data.notes,
  });
  return NextResponse.json({ user: updated });
}
