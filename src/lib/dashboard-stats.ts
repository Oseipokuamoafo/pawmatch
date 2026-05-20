import type {
  Match,
  MatchStatus,
  Pet,
  PetHealth,
  PetPhoto,
  Sex,
  Species,
} from "@/generated/prisma";

/* ─── Types ──────────────────────────────────────────────────────────── */

export type PetWithExtras = Pet & {
  photos: PetPhoto[];
  healthRecords: PetHealth[];
  breedingGoals: unknown[];
};

export interface DashboardPet {
  id: string;
  name: string;
  species: Species;
  breed: string;
  sex: Sex;
  dateOfBirth: Date;
  livePhotoUrl: string | null;
  isActive: boolean;
  photoUrl: string | null;
  healthScore: number;
  bestMatchScore: number | null;
  /** True if the pet's owner carries the Verified Breeder badge. */
  ownerVerified: boolean;
}

export interface DashboardStats {
  petCount: number;
  newMatches: number;
  avgHealthScore: number;
  verifiedRatio: number; // 0–1
  verifiedCount: number;
  acceptedMatches: number;
}

export type ActivityEvent =
  | {
      kind: "match.created";
      at: Date;
      petName: string;
      counterpartName: string;
      youAreInitiator: boolean;
    }
  | {
      kind: "match.accepted";
      at: Date;
      petName: string;
      counterpartName: string;
    }
  | {
      kind: "match.rejected";
      at: Date;
      petName: string;
      counterpartName: string;
    }
  | { kind: "pet.added"; at: Date; petName: string }
  | { kind: "health.added"; at: Date; petName: string; title: string };

/* ─── Health/trust score ─────────────────────────────────────────────── */

/**
 * Per-pet trust score (0–100). Same formula as the pet detail page so
 * dashboard + detail stay in sync.
 */
export function computeHealthScore(pet: {
  livePhotoUrl: string | null;
  healthRecords: { isVerified: boolean }[];
  breedingGoals: unknown[];
  photos: unknown[];
  bio: string | null;
}): number {
  let s = 0;
  if (pet.livePhotoUrl) s += 35;
  if (pet.photos.length >= 1) s += 10;
  if (pet.photos.length >= 3) s += 5;
  if (pet.bio) s += 5;
  if (pet.breedingGoals.length > 0) s += 15;
  const verifiedHealth = pet.healthRecords.filter((h) => h.isVerified).length;
  s += Math.min(verifiedHealth * 6, 24);
  if (pet.healthRecords.length > 0) s += 6;
  return Math.min(100, s);
}

/* ─── Aggregates ─────────────────────────────────────────────────────── */

export function computeStats(
  pets: PetWithExtras[],
  matches: (Match & { initiatedById: string; receivedById: string })[],
  userId: string
): DashboardStats {
  const petCount = pets.length;
  const verifiedCount = pets.filter((p) => Boolean(p.livePhotoUrl)).length;
  const avgHealthScore =
    pets.length === 0
      ? 0
      : Math.round(
          pets.reduce((sum, p) => sum + computeHealthScore(p), 0) / pets.length
        );

  const newMatches = matches.filter(
    (m) => m.status === "PENDING" && m.receivedById === userId
  ).length;

  const acceptedMatches = matches.filter((m) => m.status === "ACCEPTED").length;

  return {
    petCount,
    newMatches,
    avgHealthScore,
    verifiedRatio: petCount === 0 ? 0 : verifiedCount / petCount,
    verifiedCount,
    acceptedMatches,
  };
}

/* ─── Best match per pet ─────────────────────────────────────────────── */

export function bestMatchScoresByPet(
  matches: { petAId: string; petBId: string; status: MatchStatus; score: number }[]
): Map<string, number> {
  const map = new Map<string, number>();
  for (const m of matches) {
    if (m.status === "REJECTED" || m.status === "EXPIRED") continue;
    for (const petId of [m.petAId, m.petBId]) {
      const prev = map.get(petId);
      if (prev == null || m.score > prev) map.set(petId, m.score);
    }
  }
  return map;
}

/* ─── Pet projection for client ──────────────────────────────────────── */

export function toDashboardPets(
  pets: PetWithExtras[],
  bestMatchByPet: Map<string, number>,
  /** Defaults to false; pass the owner's verificationBadge in for a single-owner dashboard. */
  ownerVerified = false
): DashboardPet[] {
  return pets.map((p) => ({
    id: p.id,
    name: p.name,
    species: p.species,
    breed: p.breed,
    sex: p.sex,
    dateOfBirth: p.dateOfBirth,
    livePhotoUrl: p.livePhotoUrl,
    isActive: p.isActive,
    photoUrl: p.photos.find((ph) => ph.isPrimary)?.url ?? p.photos[0]?.url ?? null,
    healthScore: computeHealthScore(p),
    bestMatchScore: bestMatchByPet.get(p.id) ?? null,
    ownerVerified,
  }));
}
