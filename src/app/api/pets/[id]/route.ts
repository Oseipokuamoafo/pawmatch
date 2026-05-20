import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updatePetSchema } from "@/lib/validations/pet";

type Ctx = { params: Promise<{ id: string }> };

async function requireOwner(petId: string, userId: string) {
  const pet = await prisma.pet.findUnique({ where: { id: petId }, select: { ownerId: true } });
  if (!pet) return { error: "Not found", status: 404 as const };
  if (pet.ownerId !== userId) return { error: "Forbidden", status: 403 as const };
  return { ok: true as const };
}

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pet = await prisma.pet.findUnique({
    where: { id },
    include: {
      photos: { orderBy: { isPrimary: "desc" } },
      healthRecords: { orderBy: { recordDate: "desc" } },
      traits: true,
      breedingGoals: true,
      owner: { select: { id: true, name: true, image: true, verificationBadge: true } },
    },
  });

  if (!pet) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (pet.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ pet });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const check = await requireOwner(id, session.user.id);
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updatePetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { dateOfBirth, ...rest } = parsed.data;
  const pet = await prisma.pet.update({
    where: { id },
    data: {
      ...rest,
      ...(dateOfBirth ? { dateOfBirth: new Date(dateOfBirth) } : {}),
    },
    include: { photos: true, breedingGoals: true },
  });

  return NextResponse.json({ pet });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const check = await requireOwner(id, session.user.id);
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });

  await prisma.pet.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
