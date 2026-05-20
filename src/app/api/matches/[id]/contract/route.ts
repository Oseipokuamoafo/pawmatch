import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createContractSchema } from "@/lib/validations/contract";
import { buildContractContent, type ContractTemplate } from "@/lib/contracts";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/matches/[id]/contract
 *
 * Either creates a draft Contract for the match (template defaults to
 * STANDARD_BREEDING) or returns the existing one. Only the two owners
 * involved in the match can act here.
 */
export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = createContractSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const template: ContractTemplate = parsed.data.template;

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      petA: true,
      petB: true,
      initiatedBy: { select: { id: true, name: true, email: true } },
      receivedBy: { select: { id: true, name: true, email: true } },
      contract: true,
    },
  });
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (
    match.initiatedById !== session.user.id &&
    match.receivedById !== session.user.id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (match.status !== "ACCEPTED") {
    return NextResponse.json(
      { error: "Both sides must accept the match before drafting a contract." },
      { status: 409 }
    );
  }

  // Owners line up: petA owner = initiator, petB owner = recipient
  const ownerA = match.initiatedBy;
  const ownerB = match.receivedBy;
  if (!ownerA || !ownerB) {
    return NextResponse.json(
      { error: "Match is missing owner records" },
      { status: 500 }
    );
  }

  const content = buildContractContent({
    template,
    match,
    petA: match.petA,
    petB: match.petB,
    ownerA,
    ownerB,
  });

  // If a contract already exists, keep its sign state and just refresh the
  // body if the requested template changed.
  const contract = match.contract
    ? await prisma.contract.update({
        where: { id: match.contract.id },
        data: {
          templateType: template,
          content,
        },
      })
    : await prisma.contract.create({
        data: {
          matchId: match.id,
          templateType: template,
          content,
        },
      });

  return NextResponse.json({ contract }, { status: 201 });
}

/* ─── GET — read the draft for either participant ─────────────────── */

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const match = await prisma.match.findUnique({
    where: { id },
    include: { contract: true },
  });
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (
    match.initiatedById !== session.user.id &&
    match.receivedById !== session.user.id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ contract: match.contract ?? null });
}
