import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createMatchSchema } from "@/lib/validations/match";
import { scoreMatch } from "@/lib/scoring";
import { sendMatchRequestReceived } from "@/lib/email";
import type { Prisma } from "@/generated/prisma";

/* ─── POST /api/matches — initiate a match request ───────────────────── */

export async function POST(req: Request) {
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

  const parsed = createMatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { petAId, petBId } = parsed.data;
  if (petAId === petBId) {
    return NextResponse.json(
      { error: "Cannot match a pet with itself" },
      { status: 400 }
    );
  }

  // Ownership check on petA, fetch both with relations for scoring
  const [petA, petB] = await Promise.all([
    prisma.pet.findUnique({
      where: { id: petAId },
      include: {
        traits: true,
        healthRecords: true,
        breedingGoals: true,
        owner: {
          select: { id: true, name: true, email: true, locationLat: true, locationLng: true },
        },
      },
    }),
    prisma.pet.findUnique({
      where: { id: petBId },
      include: {
        traits: true,
        healthRecords: true,
        breedingGoals: true,
        owner: {
          select: { id: true, name: true, email: true, locationLat: true, locationLng: true },
        },
      },
    }),
  ]);

  if (!petA) return NextResponse.json({ error: "Your pet not found" }, { status: 404 });
  if (petA.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!petB) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  if (petB.ownerId === session.user.id) {
    return NextResponse.json(
      { error: "Cannot match with your own pet" },
      { status: 400 }
    );
  }
  if (!petB.isActive) {
    return NextResponse.json(
      { error: "Candidate is not active" },
      { status: 400 }
    );
  }

  // Dedupe — return the existing record if a non-rejected match already exists
  const existing = await prisma.match.findFirst({
    where: {
      OR: [
        { petAId, petBId },
        { petAId: petBId, petBId: petAId },
      ],
      status: { in: ["PENDING", "ACCEPTED"] },
    },
  });
  if (existing) {
    return NextResponse.json(
      {
        match: existing,
        existed: true,
        message: "A match already exists between these pets.",
      },
      { status: 200 }
    );
  }

  const aLoc =
    petA.owner?.locationLat != null && petA.owner?.locationLng != null
      ? { lat: petA.owner.locationLat, lng: petA.owner.locationLng }
      : undefined;
  const bLoc =
    petB.owner?.locationLat != null && petB.owner?.locationLng != null
      ? { lat: petB.owner.locationLat, lng: petB.owner.locationLng }
      : undefined;
  const result = scoreMatch(petA, petB, aLoc, bLoc);

  const match = await prisma.match.create({
    data: {
      petAId,
      petBId,
      initiatedById: session.user.id,
      receivedById: petB.ownerId,
      score: result.score,
      breakdown: result.breakdown as unknown as Prisma.InputJsonValue,
      flags: result.flags,
      status: "PENDING",
    },
  });

  // Notify the recipient (fire-and-forget — failures log internally)
  if (petB.owner?.email) {
    sendMatchRequestReceived({
      to: petB.owner.email,
      recipientName: petB.owner.name,
      initiatorPetName: petA.name,
      recipientPetName: petB.name,
      score: result.score,
      matchId: match.id,
    }).catch(() => undefined);
  }

  return NextResponse.json(
    { match, scoring: result, existed: false },
    { status: 201 }
  );
}

/* ─── GET /api/matches — list current user's matches ─────────────────── */

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  // Optional ?status= filter (comma-separated supported)
  const url = new URL(req.url);
  const statusRaw = url.searchParams.get("status");
  const statusList = statusRaw
    ? (statusRaw
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter((s) =>
          ["PENDING", "ACCEPTED", "REJECTED", "EXPIRED"].includes(s)
        ) as ("PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED")[])
    : null;

  const matches = await prisma.match.findMany({
    where: {
      OR: [{ initiatedById: userId }, { receivedById: userId }],
      ...(statusList && statusList.length > 0
        ? { status: { in: statusList } }
        : {}),
    },
    include: {
      petA: {
        include: {
          photos: { orderBy: { isPrimary: "desc" }, take: 1 },
          owner: { select: { id: true, name: true, verificationBadge: true } },
        },
      },
      petB: {
        include: {
          photos: { orderBy: { isPrimary: "desc" }, take: 1 },
          owner: { select: { id: true, name: true, verificationBadge: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ matches, userId });
}
