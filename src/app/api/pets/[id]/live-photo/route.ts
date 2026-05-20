import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { livePhotoSchema } from "@/lib/validations/pet";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pet = await prisma.pet.findUnique({ where: { id }, select: { ownerId: true } });
  if (!pet) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (pet.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = livePhotoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const updated = await prisma.pet.update({
    where: { id },
    data: { livePhotoUrl: parsed.data.livePhotoUrl },
    select: { id: true, livePhotoUrl: true },
  });

  return NextResponse.json({ pet: updated });
}
