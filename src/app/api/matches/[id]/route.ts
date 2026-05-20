import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateMatchSchema } from "@/lib/validations/match";

type Ctx = { params: Promise<{ id: string }> };

/* ─── PATCH /api/matches/[id] — recipient accepts or rejects ─────────── */

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;

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

  const parsed = updateMatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      petB: { select: { ownerId: true } },
    },
  });
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only the recipient (petB's owner, who is NOT the initiator) can accept/reject
  if (match.petB.ownerId !== session.user.id) {
    return NextResponse.json(
      { error: "Only the recipient can respond to this match" },
      { status: 403 }
    );
  }
  if (match.initiatedById === session.user.id) {
    return NextResponse.json(
      { error: "Initiator cannot accept their own request" },
      { status: 403 }
    );
  }
  if (match.status !== "PENDING") {
    return NextResponse.json(
      { error: `Match is already ${match.status.toLowerCase()}` },
      { status: 409 }
    );
  }

  const updated = await prisma.match.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  return NextResponse.json({ match: updated });
}
