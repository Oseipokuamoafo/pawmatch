import type {
  BreedingGoal,
  Pet,
  PetHealth,
  PetTrait,
} from "@/generated/prisma";

import { haversineDistance } from "./geo";

/* ─── Public types ───────────────────────────────────────────────────── */

export type PetWithRelations = Pet & {
  traits: PetTrait[];
  healthRecords: PetHealth[];
  breedingGoals: BreedingGoal[];
};

export type AutoFlag =
  | "SHARED_RECESSIVE_GENE"
  | "HIGH_COI"
  | "PET_UNDERAGE"
  | "UNVERIFIED_HEALTH";

export interface MatchBreakdown {
  traits: number; // 0–35
  health: number; // 0–30
  diversity: number; // 0–20
  proximity: number; // 0–10
  preferences: number; // 0–5
}

export interface MatchResult {
  score: number; // 0–100 (or capped at HARD_CAP when flagged)
  flags: string[];
  breakdown: MatchBreakdown;
}

/* ─── Tunables ───────────────────────────────────────────────────────── */

/** Score ceiling when any auto-flag fires. */
export const HARD_CAP = 30;
/** COI percentage above which we hard-flag the pairing. */
export const COI_DANGER_THRESHOLD = 12.5;

/** Minimum breeding age in months, per sex. Mirrors Breed seed defaults. */
export function minBreedingAgeMonths(sex: "MALE" | "FEMALE"): number {
  return sex === "MALE" ? 14 : 18;
}

/* ─── Breed-group lookup (static — kept in sync with prisma/seed.ts) ── */

const BREED_GROUPS: Record<string, string> = {
  // Dogs
  "Golden Retriever": "Sporting",
  "Labrador Retriever": "Sporting",
  Labrador: "Sporting",
  "French Bulldog": "Non-Sporting",
  Poodle: "Non-Sporting",
  Bulldog: "Non-Sporting",
  "German Shepherd": "Herding",
  "Border Collie": "Herding",
  Beagle: "Hound",
  Dachshund: "Hound",
  Rottweiler: "Working",
  "Siberian Husky": "Working",
  "Doberman Pinscher": "Working",
  Doberman: "Working",
  "Yorkshire Terrier": "Toy",
  "Shih Tzu": "Toy",
  "Cavalier King Charles Spaniel": "Toy",
  "Cavalier King Charles": "Toy",
  // Cats
  Persian: "Longhair",
  "Maine Coon": "Longhair",
  Ragdoll: "Longhair",
  Siamese: "Shorthair",
  Bengal: "Shorthair",
  "British Shorthair": "Shorthair",
  Sphynx: "Shorthair",
  "Scottish Fold": "Shorthair",
};

function breedsCompatible(a: string, b: string): boolean {
  if (a === b) return true;
  const groupA = BREED_GROUPS[a];
  const groupB = BREED_GROUPS[b];
  return Boolean(groupA && groupB && groupA === groupB);
}

/* ─── Public API ─────────────────────────────────────────────────────── */

/**
 * Score two pets against each other from petA's perspective.
 *
 * Weighting per CLAUDE.md:
 *   - 35  traits      (BreedingGoal.desiredTraits vs candidate PetTrait)
 *   - 30  health      (DNA record, shared recessives, verified records)
 *   - 20  diversity   (candidate coiEstimate vs petA's maxCOI)
 *   - 10  proximity   (Haversine between owner locations)
 *   -  5  preferences (petA's preferredBreeds contains petB's breed)
 *
 * Any auto-flag (SHARED_RECESSIVE_GENE, HIGH_COI, PET_UNDERAGE,
 * UNVERIFIED_HEALTH) caps the final score at HARD_CAP=30.
 *
 * Owner locations are passed in explicitly so the helper stays pure
 * and easy to unit-test; callers extract `{ lat, lng }` from their
 * Prisma `pet.owner` includes.
 */
export function scoreMatch(
  petA: PetWithRelations,
  petB: PetWithRelations,
  ownerALocation?: { lat: number; lng: number },
  ownerBLocation?: { lat: number; lng: number }
): MatchResult {
  const flags: string[] = [];

  // ── 1. Traits (0–35) ────────────────────────────────────────────────
  const desired = getDesiredTraits(petA);
  let traitScore = 0;
  if (desired.length > 0) {
    const candidateBag = petB.traits
      .map((t) => `${t.traitName} ${t.traitValue}`.toLowerCase())
      .join(" | ");
    let matched = 0;
    for (const want of desired) {
      if (candidateBag.includes(want.toLowerCase())) matched++;
    }
    traitScore = Math.min(35, matched * 5);
  }
  if (breedsCompatible(petA.breed, petB.breed)) {
    traitScore = Math.min(35, traitScore + 5);
  }

  // ── 2. Health & genetic safety (0–30) ───────────────────────────────
  let healthScore = 30;
  const petBHasDna = petB.healthRecords.some((h) => h.type === "DNA");
  if (!petBHasDna) healthScore -= 10;

  if (sharesRecessiveGene(petA.traits, petB.traits)) {
    flags.push("SHARED_RECESSIVE_GENE");
  }

  const petBRecords = petB.healthRecords;
  if (petBRecords.length > 0 && petBRecords.every((r) => !r.isVerified)) {
    healthScore -= 5;
  }
  healthScore = clamp(healthScore, 0, 30);

  // ── 3. Genetic diversity / COI (0–20) ───────────────────────────────
  const candidateCOI = readCoiEstimate(petB.traits);
  const maxCOI = petA.breedingGoals[0]?.maxCOI ?? null;
  let diversityScore = 10; // neutral default when COI data missing

  if (candidateCOI != null) {
    if (candidateCOI > COI_DANGER_THRESHOLD) {
      diversityScore = 0;
      flags.push("HIGH_COI");
    } else if (maxCOI != null) {
      if (candidateCOI <= maxCOI) diversityScore = 20;
      else if (candidateCOI <= maxCOI + 3) diversityScore = 12;
      else if (candidateCOI <= maxCOI + 6) diversityScore = 6;
      else {
        diversityScore = 0;
        flags.push("HIGH_COI");
      }
    } else {
      // No threshold preference declared — give partial credit if COI looks healthy.
      if (candidateCOI <= 6) diversityScore = 20;
      else if (candidateCOI <= 9) diversityScore = 12;
      else if (candidateCOI <= COI_DANGER_THRESHOLD) diversityScore = 6;
    }
  }

  // ── 4. Proximity (0–10) ─────────────────────────────────────────────
  let proximityScore = 2; // fallback when locations unknown
  if (
    ownerALocation &&
    ownerBLocation &&
    Number.isFinite(ownerALocation.lat) &&
    Number.isFinite(ownerBLocation.lat)
  ) {
    const km = haversineDistance(
      ownerALocation.lat,
      ownerALocation.lng,
      ownerBLocation.lat,
      ownerBLocation.lng
    );
    if (km < 25) proximityScore = 10;
    else if (km < 100) proximityScore = 7;
    else if (km < 300) proximityScore = 4;
    else proximityScore = 2;
  }

  // ── 5. Owner preferences (0–5) ──────────────────────────────────────
  const preferredBreeds = petA.breedingGoals[0]?.preferredBreeds ?? [];
  const preferencesScore =
    preferredBreeds.length > 0 &&
    preferredBreeds.some((b) => b.toLowerCase() === petB.breed.toLowerCase())
      ? 5
      : 0;

  // ── Auto-flags that aren't tied to a specific component ─────────────
  const ageA = ageInMonths(petA.dateOfBirth);
  const ageB = ageInMonths(petB.dateOfBirth);
  if (
    ageA < minBreedingAgeMonths(petA.sex) ||
    ageB < minBreedingAgeMonths(petB.sex)
  ) {
    flags.push("PET_UNDERAGE");
  }

  const noVerifiedAnywhere =
    !petA.healthRecords.some((r) => r.isVerified) ||
    !petB.healthRecords.some((r) => r.isVerified);
  if (noVerifiedAnywhere) flags.push("UNVERIFIED_HEALTH");

  // ── Aggregate ───────────────────────────────────────────────────────
  const breakdown: MatchBreakdown = {
    traits: traitScore,
    health: healthScore,
    diversity: diversityScore,
    proximity: proximityScore,
    preferences: preferencesScore,
  };

  const raw =
    traitScore + healthScore + diversityScore + proximityScore + preferencesScore;
  const score = flags.length > 0 ? Math.min(HARD_CAP, raw) : raw;

  return {
    score: Math.round(score),
    flags,
    breakdown,
  };
}

/**
 * Batch helper — score `pet` against every candidate and return them
 * sorted descending by score. Stable ordering across equal scores.
 */
export function batchScoreMatches(
  pet: PetWithRelations,
  candidates: Array<{
    pet: PetWithRelations;
    ownerLocation?: { lat: number; lng: number };
  }>,
  petOwnerLocation?: { lat: number; lng: number }
): Array<{
  pet: PetWithRelations;
  result: MatchResult;
}> {
  const scored = candidates.map((c) => ({
    pet: c.pet,
    result: scoreMatch(pet, c.pet, petOwnerLocation, c.ownerLocation),
  }));
  // Decorate-sort-undecorate so equal scores keep input order.
  return scored
    .map((s, i) => ({ ...s, i }))
    .sort((a, b) => b.result.score - a.result.score || a.i - b.i)
    .map(({ i: _ignore, ...rest }) => rest);
}

/* ─── Internals ──────────────────────────────────────────────────────── */

function getDesiredTraits(pet: PetWithRelations): string[] {
  return pet.breedingGoals
    .flatMap((g) =>
      Array.isArray(g.desiredTraits)
        ? (g.desiredTraits as unknown[]).filter(
            (v): v is string => typeof v === "string"
          )
        : []
    )
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Detect a shared recessive-gene marker between two pet trait sets.
 *
 * Convention (set by the DNA import path): health-marker traits are stored
 * as `{ traitName: "<Marker name> (health)", traitValue: "<status>" }`.
 * A pair is flagged when both pets carry the SAME marker name with a
 * status that is not "clear" / "normal" / "unknown".
 *
 * Also matches a handful of well-known shorthand keys (HUU, DM, PRCD,
 * MDR1, CEA, PRA) that may appear inside trait names so legacy / hand-
 * entered data still triggers.
 */
function sharesRecessiveGene(aTraits: PetTrait[], bTraits: PetTrait[]): boolean {
  const aMarkers = collectRecessiveMarkers(aTraits);
  const bMarkers = collectRecessiveMarkers(bTraits);
  for (const m of aMarkers) {
    if (bMarkers.has(m)) return true;
  }
  return false;
}

const SHORTHAND_KEYS = ["huu", "dm", "prcd", "mdr1", "cea", "pra"] as const;

function collectRecessiveMarkers(traits: PetTrait[]): Set<string> {
  const out = new Set<string>();
  for (const t of traits) {
    const name = t.traitName.toLowerCase();
    const value = t.traitValue.toLowerCase().trim();
    const isHealth = name.includes("(health)") || /recessive/.test(name);
    const isCarrier = !/^(clear|normal|unknown|absent)\b/.test(value);

    if (isHealth && isCarrier) {
      // Normalize "Hyperuricosuria (HUU) (health)" → "hyperuricosuria (huu)"
      out.add(name.replace(/\s*\(health\)\s*$/, "").trim());
    }
    // Catch shorthand keys mentioned anywhere in the trait name
    for (const k of SHORTHAND_KEYS) {
      if (name.includes(k) && isCarrier) out.add(k);
    }
  }
  return out;
}

function readCoiEstimate(traits: PetTrait[]): number | null {
  for (const t of traits) {
    const n = t.traitName.toLowerCase();
    if (n === "coiestimate" || n === "coi" || n === "inbreeding coefficient") {
      const parsed = parseFloat(t.traitValue.replace("%", "").trim());
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function ageInMonths(dob: Date | string): number {
  const d = typeof dob === "string" ? new Date(dob) : dob;
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return Infinity;
  const now = new Date();
  return (
    (now.getFullYear() - d.getFullYear()) * 12 +
    (now.getMonth() - d.getMonth()) -
    (now.getDate() < d.getDate() ? 1 : 0)
  );
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
