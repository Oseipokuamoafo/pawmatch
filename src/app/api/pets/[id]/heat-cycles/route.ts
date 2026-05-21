import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createHeatCycleSchema } from "@/lib/validations/heatCycle";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;

  const pet = await prisma.pet.findUnique({
    where: { id },
    select: { ownerId: true, sex: true },
  });
  if (!pet) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (pet.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cycles = await prisma.heatCycle.findMany({
    where: { petId: id },
    orderBy: { startDate: "desc" },
  });
  return NextResponse.json({ cycles });
}

export async function POST(req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;

  const pet = await prisma.pet.findUnique({
    where: { id },
    select: { ownerId: true, sex: true },
  });
  if (!pet) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (pet.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (pet.sex !== "FEMALE") {
    return NextResponse.json(
      { error: "Heat cycles can only be tracked for female pets." },
      { status: 422 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createHeatCycleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const cycle = await prisma.heatCycle.create({
    data: {
      petId: id,
      startDate: data.startDate,
      endDate: data.endDate ?? null,
      peakFertilityStart: data.peakFertilityStart ?? null,
      peakFertilityEnd: data.peakFertilityEnd ?? null,
      notes: data.notes ?? null,
    },
  });

  return NextResponse.json({ cycle }, { status: 201 });
}
