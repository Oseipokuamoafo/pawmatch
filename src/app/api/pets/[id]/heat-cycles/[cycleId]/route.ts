import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateHeatCycleSchema } from "@/lib/validations/heatCycle";

type Ctx = { params: Promise<{ id: string; cycleId: string }> };

async function getOwnedCycle(
  petId: string,
  cycleId: string,
  userId: string,
) {
  const cycle = await prisma.heatCycle.findUnique({
    where: { id: cycleId },
    select: { id: true, petId: true, pet: { select: { ownerId: true } } },
  });
  if (!cycle || cycle.petId !== petId) return { error: "not-found" as const };
  if (cycle.pet.ownerId !== userId) return { error: "forbidden" as const };
  return { cycle };
}

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, cycleId } = await ctx.params;

  const owned = await getOwnedCycle(id, cycleId, session.user.id);
  if (owned.error === "not-found") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (owned.error === "forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateHeatCycleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const cycle = await prisma.heatCycle.update({
    where: { id: cycleId },
    data: parsed.data,
  });
  return NextResponse.json({ cycle });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, cycleId } = await ctx.params;

  const owned = await getOwnedCycle(id, cycleId, session.user.id);
  if (owned.error === "not-found") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (owned.error === "forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.heatCycle.delete({ where: { id: cycleId } });
  return NextResponse.json({ ok: true });
}
