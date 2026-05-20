import type {
  BreedingGoal,
  Pet,
  PetHealth,
  PetTrait,
  User,
} from "@/generated/prisma";

import { calculateCOI } from "./coi";

/* ─── Public API ─────────────────────────────────────────────────────── */

export interface ScoringPet extends Pet {
  traits: PetTrait[];
  healthRecords: PetHealth[];
  breedingGoals: BreedingGoal[];
  owner?: Pick<User, "id" | "locationLat" | "locationLng"> | null;
}

export interface ScoreResult {
  score: number;
  capped: boolean;
  /** Auto-flag strings that hard-cap the score to 30 */
  flags: string[];
  /** Soft notes that don't cap the score but worth surfacing */
  notes: string[];
  /** Component breakdown for tooltips / debugging */
  breakdown: {
    traits: number; // 0–35
    health: number; // 0–30
    diversity: number; // 0–20
    proximity: number; // 0–10
    preferences: number; // 0–5
    coi: number; // percentage
  };
}

/** Hard cap applied when any auto-flag fires. */
export const HARD_CAP = 30;

/** Min breeding age in months. Dogs/cats — 12 mo is the consensus floor. */
export const MIN_BREEDING_AGE_MONTHS = 12;

/** COI above this percentage is dangerous. */
export const COI_DANGER_THRESHOLD = 12.5;

/**
 * Score two pets against each other from `a`'s perspective.
 *
 * Per CLAUDE.md: 35% traits, 30% health/genetic, 20% diversity (COI delta),
 * 10% proximity, 5% owner preferences. Auto-flags hard-cap score at 30.
 */
export function scoreMatch(a: ScoringPet, b: ScoringPet): ScoreResult {
  const traits = traitCompatibility(a, b);
  const healthRaw = healthSafety(a, b);
  const coi = calculateCOI(a.id, b.id);
  const diversity = diversityScore(coi);
  const proximity = proximityScore(a, b);
  const preferences = ownerPreferenceScore(a, b);

  const flags: string[] = [];
  const notes: string[] = [];

  // ── Hard auto-flags ────────────────────────────────────────────────
  const sharedRecessive = findSharedRecessive(a, b);
  if (sharedRecessive) {
    flags.push(`Shared recessive: ${sharedRecessive}`);
  }
  if (coi > COI_DANGER_THRESHOLD) {
    flags.push(`COI ${coi.toFixed(1)}% exceeds 12.5% threshold`);
  }
  if (
    ageInMonths(a.dateOfBirth) < MIN_BREEDING_AGE_MONTHS ||
    ageInMonths(b.dateOfBirth) < MIN_BREEDING_AGE_MONTHS
  ) {
    flags.push("Pet under minimum breeding age (12 months)");
  }
  if (
    a.healthRecords.length === 0 ||
    !a.healthRecords.some((h) => h.isVerified)
  ) {
    flags.push("Unverified health records on your pet");
  }
  if (
    b.healthRecords.length === 0 ||
    !b.healthRecords.some((h) => h.isVerified)
  ) {
    flags.push("Unverified health records on candidate");
  }

  // ── Soft notes ─────────────────────────────────────────────────────
  if (a.species !== b.species) notes.push("Cross-species pairing");
  if (a.sex === b.sex) notes.push("Same-sex pairing");

  // ── Aggregate ──────────────────────────────────────────────────────
  const baseScore =
    traits + healthRaw + diversity + proximity + preferences;
  const score = flags.length > 0 ? Math.min(HARD_CAP, baseScore) : baseScore;

  return {
    score: Math.round(score),
    capped: flags.length > 0 && baseScore > HARD_CAP,
    flags,
    notes,
    breakdown: {
      traits,
      health: healthRaw,
      diversity,
      proximity,
      preferences,
      coi,
    },
  };
}

/* ─── Component scores ───────────────────────────────────────────────── */

/** 0–35: how well candidate matches owner's desired traits. */
function traitCompatibility(a: ScoringPet, b: ScoringPet): number {
  const desired = a.breedingGoals
    .flatMap((g) =>
      Array.isArray(g.desiredTraits)
        ? (g.desiredTraits as unknown[]).filter(
            (v): v is string => typeof v === "string"
          )
        : []
    )
    .map((s) => s.toLowerCase());

  if (desired.length === 0) {
    // No preferences declared — give middle credit so a candidate isn't
    // unfairly penalized for the user not filling in goals.
    return 18;
  }

  const candidateTraits = b.traits.map((t) =>
    `${t.traitName} ${t.traitValue}`.toLowerCase()
  );

  let hits = 0;
  for (const want of desired) {
    if (candidateTraits.some((c) => c.includes(want))) hits++;
  }
  const ratio = hits / desired.length;
  return Math.round(ratio * 35);
}

/** 0–30: health verification + clean recessive record. */
function healthSafety(a: ScoringPet, b: ScoringPet): number {
  const aVerified = a.healthRecords.filter((h) => h.isVerified).length;
  const bVerified = b.healthRecords.filter((h) => h.isVerified).length;
  // 6 points per side for "has any verified", up to 18 for breadth (3+ on b).
  let score = 0;
  if (aVerified > 0) score += 6;
  if (bVerified > 0) score += 6;
  score += Math.min(18, bVerified * 4);
  return Math.min(30, score);
}

/** 0–20: lower COI = higher diversity. */
function diversityScore(coiPct: number): number {
  if (coiPct >= COI_DANGER_THRESHOLD) return 0;
  // Linear: 0% COI → 20 points, 12.5% COI → 0 points.
  const ratio = 1 - coiPct / COI_DANGER_THRESHOLD;
  return Math.round(ratio * 20);
}

/** 0–10: Haversine distance using rounded lat/lng (privacy rule). */
function proximityScore(a: ScoringPet, b: ScoringPet): number {
  const aLat = a.owner?.locationLat;
  const aLng = a.owner?.locationLng;
  const bLat = b.owner?.locationLat;
  const bLng = b.owner?.locationLng;
  if (
    aLat == null ||
    aLng == null ||
    bLat == null ||
    bLng == null
  ) {
    return 5; // unknown → neutral
  }

  const distanceKm = haversineKm(aLat, aLng, bLat, bLng);
  if (distanceKm < 25) return 10;
  if (distanceKm < 100) return 8;
  if (distanceKm < 250) return 6;
  if (distanceKm < 500) return 4;
  if (distanceKm < 1000) return 2;
  return 1;
}

/** 0–5: misc owner preferences (verified breeder, etc.). */
function ownerPreferenceScore(_a: ScoringPet, b: ScoringPet): number {
  // Placeholder — bump if the candidate's owner is a verified breeder.
  // We don't have owner on `b` typed here for verified flag yet; default low.
  return 3;
}

/* ─── Helpers ────────────────────────────────────────────────────────── */

function ageInMonths(dob: Date | string): number {
  const d = typeof dob === "string" ? new Date(dob) : dob;
  const now = new Date();
  return (
    (now.getFullYear() - d.getFullYear()) * 12 +
    (now.getMonth() - d.getMonth()) -
    (now.getDate() < d.getDate() ? 1 : 0)
  );
}

function findSharedRecessive(a: ScoringPet, b: ScoringPet): string | null {
  const RECESSIVE_KEYS = ["recessive", "huu", "dm", "prcd", "mdr1"];
  const aTraits = a.traits.map(
    (t) => `${t.traitName} ${t.traitValue}`.toLowerCase()
  );
  const bTraits = b.traits.map(
    (t) => `${t.traitName} ${t.traitValue}`.toLowerCase()
  );
  for (const key of RECESSIVE_KEYS) {
    if (aTraits.some((s) => s.includes(key)) && bTraits.some((s) => s.includes(key))) {
      return key.toUpperCase();
    }
  }
  return null;
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
