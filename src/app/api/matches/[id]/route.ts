import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  updateMatchSchema,
  normalizeMatchAction,
} from "@/lib/validations/match";
import { sendMatchAccepted } from "@/lib/email";

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
      {
        error:
          "Validation failed — expected { action: 'accept' | 'reject' }",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }
  const targetStatus = normalizeMatchAction(parsed.data);

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      petA: { select: { id: true, name: true, ownerId: true } },
      petB: { select: { id: true, name: true, ownerId: true } },
      initiatedBy: { select: { id: true, name: true, email: true } },
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
    data: { status: targetStatus },
  });

  // Notify the initiator on accept (fire-and-forget)
  if (targetStatus === "ACCEPTED" && match.initiatedBy?.email) {
    sendMatchAccepted({
      to: match.initiatedBy.email,
      initiatorName: match.initiatedBy.name,
      initiatorPetName: match.petA.name,
      recipientPetName: match.petB.name,
      matchId: match.id,
    }).catch(() => undefined);
  }

  return NextResponse.json({ match: updated });
}
