import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyActionSchema } from "@/lib/validations/verification";
import {
  sendVerificationApproved,
  sendVerificationRejected,
} from "@/lib/email";

type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/admin/verifications/[id]
 *
 * Body: { action: "approve" | "reject", notes?: string }
 *
 * Approve  → request APPROVED + user.isVerified = true + verificationBadge = true
 * Reject   → request REJECTED + notes saved; user fields untouched
 *
 * Email the applicant on both outcomes (silently skipped if RESEND_API_KEY
 * is a placeholder).
 */
export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;

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

  const parsed = verifyActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const request = await prisma.verificationRequest.findUnique({
    where: { id },
    include: { user: { select: { id: true, email: true, name: true } } },
  });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (request.status !== "PENDING") {
    return NextResponse.json(
      { error: `Already ${request.status.toLowerCase()}` },
      { status: 409 }
    );
  }

  const reviewerId = session.user.id;
  const now = new Date();

  if (parsed.data.action === "approve") {
    const [updated] = await prisma.$transaction([
      prisma.verificationRequest.update({
        where: { id },
        data: {
          status: "APPROVED",
          reviewedBy: reviewerId,
          reviewedAt: now,
          notes: parsed.data.notes || null,
        },
      }),
      prisma.user.update({
        where: { id: request.userId },
        data: { isVerified: true, verificationBadge: true },
      }),
    ]);

    // Fire-and-forget — failures already logged inside email helper
    sendVerificationApproved({
      to: request.user.email,
      name: request.user.name,
    }).catch(() => undefined);

    return NextResponse.json({ request: updated });
  }

  // Reject path
  const updated = await prisma.verificationRequest.update({
    where: { id },
    data: {
      status: "REJECTED",
      reviewedBy: reviewerId,
      reviewedAt: now,
      notes: parsed.data.notes || null,
    },
  });

  sendVerificationRejected({
    to: request.user.email,
    name: request.user.name,
    notes: parsed.data.notes,
  }).catch(() => undefined);

  return NextResponse.json({ request: updated });
}
