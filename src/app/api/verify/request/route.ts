import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyRequestSchema } from "@/lib/validations/verification";

/* ─── POST /api/verify/request — breeder submits credentials ─────────── */

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "BREEDER") {
    return NextResponse.json(
      { error: "Only breeder accounts can apply for verification" },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = verifyRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Block duplicate PENDING/APPROVED requests. REJECTED requests can be
  // reapplied — we upsert in that case.
  const existing = await prisma.verificationRequest.findUnique({
    where: { userId: session.user.id },
  });

  if (existing && existing.status !== "REJECTED") {
    return NextResponse.json(
      {
        error:
          existing.status === "APPROVED"
            ? "You're already verified"
            : "You already have a pending application",
      },
      { status: 409 }
    );
  }

  const data = parsed.data;
  const request = existing
    ? await prisma.verificationRequest.update({
        where: { userId: session.user.id },
        data: {
          documents: data.documents,
          programDescription: data.programDescription,
          status: "PENDING",
          reviewedBy: null,
          reviewedAt: null,
          notes: null,
          createdAt: new Date(),
        },
      })
    : await prisma.verificationRequest.create({
        data: {
          userId: session.user.id,
          documents: data.documents,
          programDescription: data.programDescription,
        },
      });

  return NextResponse.json({ request }, { status: 201 });
}

/* ─── GET /api/verify/request — fetch the caller's own request ───────── */

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const request = await prisma.verificationRequest.findUnique({
    where: { userId: session.user.id },
  });
  return NextResponse.json({ request });
}
