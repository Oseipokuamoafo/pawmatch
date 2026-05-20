import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  batchScoreMatches,
  type PetWithRelations,
  type MatchResult,
} from "@/lib/scoring";
import { haversineDistance } from "@/lib/geo";
import { computeHealthScore } from "@/lib/dashboard-stats";
import type { Sex, Species } from "@/generated/prisma";

/* ─── Query schema ───────────────────────────────────────────────────── */

const querySchema = z.object({
  petId: z.string().min(1, "petId is required"),
  species: z.enum(["DOG", "CAT"]).optional(),
  maxDistance: z.coerce.number().min(1).max(20_000).optional(),
  minHealthScore: z.coerce.number().min(0).max(100).optional(),
  verifiedOnly: z.coerce.boolean().optional(),
  breed: z.string().trim().optional(),
  sortBy: z.enum(["best", "nearest", "newest"]).default("best"),
  page: z.coerce.number().min(1).max(500).default(1),
  limit: z.coerce.number().min(1).max(48).default(12),
});

export interface ScoredPet {
  id: string;
  name: string;
  species: Species;
  breed: string;
  sex: Sex;
  dateOfBirth: string;
  livePhotoUrl: string | null;
  isActive: boolean;
  photoUrl: string | null;
  ownerName: string | null;
  ownerVerified: boolean;
  hasVerifiedHealth: boolean;
  healthScore: number;
  distanceKm: number | null;
  score: number;
  flags: string[];
  breakdown: MatchResult["breakdown"];
}

/**
 * GET /api/browse?petId=...&species=DOG&maxDistance=200&minHealthScore=40
 *   &verifiedOnly=true&breed=Golden&sortBy=best&page=1&limit=12
 *
 * Returns candidate pets scored against `petId`, after filtering by the
 * supplied criteria. Excludes the caller's own pets, pets that already
 * have a non-rejected match against `petId`, and inactive pets.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const q = parsed.data;
  const userId = session.user.id;

  // ── Load the user's pet for scoring ────────────────────────────────
  const myPet = await prisma.pet.findUnique({
    where: { id: q.petId },
    include: {
      traits: true,
      healthRecords: true,
      breedingGoals: true,
      owner: {
        select: { id: true, locationLat: true, locationLng: true },
      },
    },
  });
  if (!myPet) {
    return NextResponse.json({ error: "Pet not found" }, { status: 404 });
  }
  if (myPet.ownerId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Exclude pets that already have a pending/accepted match ──────
  const existingMatches = await prisma.match.findMany({
    where: {
      OR: [{ petAId: myPet.id }, { petBId: myPet.id }],
      status: { in: ["PENDING", "ACCEPTED"] },
    },
    select: { petAId: true, petBId: true },
  });
  const excludeIds = new Set<string>([myPet.id]);
  for (const m of existingMatches) {
    excludeIds.add(m.petAId);
    excludeIds.add(m.petBId);
  }

  // ── Candidate pool ───────────────────────────────────────────────
  const wantSpecies = q.species ?? myPet.species;
  const oppositeSex = myPet.sex === "MALE" ? "FEMALE" : "MALE";
  const candidates = await prisma.pet.findMany({
    where: {
      species: wantSpecies,
      sex: oppositeSex,
      isActive: true,
      ownerId: { not: userId },
      id: { notIn: Array.from(excludeIds) },
      ...(q.breed
        ? { breed: { contains: q.breed, mode: "insensitive" } }
        : {}),
      ...(q.verifiedOnly ? { livePhotoUrl: { not: null } } : {}),
    },
    include: {
      photos: { orderBy: { isPrimary: "desc" }, take: 1 },
      traits: true,
      healthRecords: true,
      breedingGoals: true,
      owner: {
        select: {
          id: true,
          name: true,
          locationLat: true,
          locationLng: true,
          verificationBadge: true,
        },
      },
    },
    take: 240, // Hard cap so big DBs don't OOM in the in-memory pipeline
  });

  // ── Score, distance, health, then filter ─────────────────────────
  const myLocation =
    myPet.owner?.locationLat != null && myPet.owner?.locationLng != null
      ? { lat: myPet.owner.locationLat, lng: myPet.owner.locationLng }
      : undefined;

  const scoredBatch = batchScoreMatches(
    myPet as PetWithRelations,
    candidates.map((c) => ({
      pet: c as unknown as PetWithRelations,
      ownerLocation:
        c.owner?.locationLat != null && c.owner?.locationLng != null
          ? { lat: c.owner.locationLat, lng: c.owner.locationLng }
          : undefined,
    })),
    myLocation
  );

  const enriched: ScoredPet[] = scoredBatch.map((s) => {
    const c = candidates.find((x) => x.id === s.pet.id)!;
    const distanceKm =
      myLocation && c.owner?.locationLat != null && c.owner?.locationLng != null
        ? haversineDistance(
            myLocation.lat,
            myLocation.lng,
            c.owner.locationLat,
            c.owner.locationLng
          )
        : null;
    const hasVerifiedHealth = c.healthRecords.some((h) => h.isVerified);
    const healthScore = computeHealthScore(c);
    return {
      id: c.id,
      name: c.name,
      species: c.species,
      breed: c.breed,
      sex: c.sex,
      dateOfBirth: c.dateOfBirth.toISOString(),
      livePhotoUrl: c.livePhotoUrl,
      isActive: c.isActive,
      photoUrl: c.photos[0]?.url ?? null,
      ownerName: c.owner?.name ?? null,
      ownerVerified: Boolean(c.owner?.verificationBadge),
      hasVerifiedHealth,
      healthScore,
      distanceKm,
      score: s.result.score,
      flags: s.result.flags,
      breakdown: s.result.breakdown,
    };
  });

  // Post-score filters
  let filtered = enriched;
  if (q.maxDistance != null) {
    filtered = filtered.filter(
      (p) => p.distanceKm == null || p.distanceKm <= q.maxDistance!
    );
  }
  if (q.minHealthScore != null) {
    filtered = filtered.filter((p) => p.healthScore >= q.minHealthScore!);
  }

  // Sort
  if (q.sortBy === "nearest") {
    filtered.sort((a, b) => {
      const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
      const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
      return da - db;
    });
  } else if (q.sortBy === "newest") {
    filtered.sort(
      (a, b) =>
        new Date(b.dateOfBirth).getTime() - new Date(a.dateOfBirth).getTime()
    );
  }
  // Default sortBy === "best" — already sorted by score desc from batchScoreMatches

  // Paginate
  const total = filtered.length;
  const start = (q.page - 1) * q.limit;
  const pets = filtered.slice(start, start + q.limit);
  const hasMore = start + pets.length < total;

  return NextResponse.json({ pets, total, hasMore });
}
