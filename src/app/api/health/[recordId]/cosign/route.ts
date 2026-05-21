import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  sendVetCosignDeclined,
  sendVetCosignSigned,
} from "@/lib/email";
import { cosignActionSchema } from "@/lib/validations/vet";

type Ctx = { params: Promise<{ recordId: string }> };

/**
 * POST /api/health/[recordId]/cosign
 *
 * Body: { action: "sign" | "decline", notes?: string }
 *
 * VET-only. Sign → flips isVerified=true, sets verifiedByVetId, verifiedAt,
 * and clears the pending request. Decline → clears the request; record
 * stays unverified. Either path emails the owner.
 */
export async function POST(req: Request, ctx: Ctx) {
  const { recordId } = await ctx.params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "VET") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = cosignActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const record = await prisma.petHealth.findUnique({
    where: { id: recordId },
    include: {
      pet: {
        select: {
          id: true,
          name: true,
          owner: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (record.isVerified) {
    return NextResponse.json(
      { error: "Record is already verified." },
      { status: 409 },
    );
  }
  if (record.requestedVetId !== session.user.id) {
    return NextResponse.json(
      { error: "This record wasn't sent to you." },
      { status: 403 },
    );
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, vetPracticeName: true },
  });

  if (parsed.data.action === "sign") {
    const now = new Date();
    const updated = await prisma.petHealth.update({
      where: { id: recordId },
      data: {
        isVerified: true,
        verifiedByVetId: session.user.id,
        verifiedAt: now,
        verifiedBy: me?.name ?? "Vet",
        requestedVetId: null,
        requestedAt: null,
      },
    });

    if (record.pet.owner?.email) {
      await sendVetCosignSigned({
        to: record.pet.owner.email,
        ownerName: record.pet.owner.name,
        vetName: me?.name ?? null,
        practiceName: me?.vetPracticeName ?? null,
        petName: record.pet.name,
        recordTitle: record.title,
        petId: record.pet.id,
      });
    }
    return NextResponse.json({ record: updated });
  }

  // decline
  const updated = await prisma.petHealth.update({
    where: { id: recordId },
    data: { requestedVetId: null, requestedAt: null },
  });

  if (record.pet.owner?.email) {
    await sendVetCosignDeclined({
      to: record.pet.owner.email,
      ownerName: record.pet.owner.name,
      vetName: me?.name ?? null,
      petName: record.pet.name,
      recordTitle: record.title,
      notes: parsed.data.notes,
      petId: record.pet.id,
    });
  }

  return NextResponse.json({ record: updated });
}
