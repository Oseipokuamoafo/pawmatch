import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendVetCosignRequested } from "@/lib/email";
import { cosignRequestSchema } from "@/lib/validations/vet";

type Ctx = { params: Promise<{ recordId: string }> };

/**
 * POST /api/health/[recordId]/request-cosign
 *
 * Body: { vetId: string }
 *
 * Owner-only. Assigns a vet to review and co-sign the record. Sends an
 * email to the chosen vet. Re-pointing to a different vet is allowed
 * while the record is still unverified.
 */
export async function POST(req: Request, ctx: Ctx) {
  const { recordId } = await ctx.params;

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

  const parsed = cosignRequestSchema.safeParse(body);
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
          ownerId: true,
          owner: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (record.pet.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (record.isVerified) {
    return NextResponse.json(
      { error: "Record is already verified" },
      { status: 409 },
    );
  }

  const vet = await prisma.user.findUnique({
    where: { id: parsed.data.vetId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      vetApplicationStatus: true,
      vetPracticeName: true,
    },
  });
  if (!vet || vet.role !== "VET" || vet.vetApplicationStatus !== "APPROVED") {
    return NextResponse.json(
      { error: "That user isn't a verified vet on PawMatch." },
      { status: 400 },
    );
  }

  const updated = await prisma.petHealth.update({
    where: { id: recordId },
    data: {
      requestedVetId: vet.id,
      requestedAt: new Date(),
    },
    include: {
      requestedVet: {
        select: { id: true, name: true, vetPracticeName: true },
      },
    },
  });

  await sendVetCosignRequested({
    to: vet.email,
    vetName: vet.name,
    ownerName: record.pet.owner?.name ?? null,
    petName: record.pet.name,
    recordTitle: record.title,
    recordType: record.type,
  });

  return NextResponse.json({ record: updated });
}

/**
 * DELETE /api/health/[recordId]/request-cosign
 *
 * Owner cancels a pending request before the vet acts.
 */
export async function DELETE(_req: Request, ctx: Ctx) {
  const { recordId } = await ctx.params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const record = await prisma.petHealth.findUnique({
    where: { id: recordId },
    include: { pet: { select: { ownerId: true } } },
  });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (record.pet.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (record.isVerified) {
    return NextResponse.json(
      { error: "Record already verified; nothing to cancel." },
      { status: 409 },
    );
  }

  const updated = await prisma.petHealth.update({
    where: { id: recordId },
    data: { requestedVetId: null, requestedAt: null },
  });

  return NextResponse.json({ record: updated });
}
