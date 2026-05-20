import { test } from "node:test";
import assert from "node:assert/strict";

import {
  scoreMatch,
  batchScoreMatches,
  HARD_CAP,
  type PetWithRelations,
} from "./scoring";

/* ─── Test fixtures ──────────────────────────────────────────────────── */

const now = new Date();
const MONTHS_AGO = (n: number) => {
  const d = new Date(now);
  d.setMonth(d.getMonth() - n);
  return d;
};

function makePet(overrides: Partial<PetWithRelations> = {}): PetWithRelations {
  const base = {
    id: "pet-1",
    name: "Test",
    species: "DOG" as const,
    breed: "Golden Retriever",
    dateOfBirth: MONTHS_AGO(30),
    sex: "MALE" as const,
    color: null,
    weight: null,
    bio: null,
    isActive: true,
    livePhotoUrl: null,
    ownerId: "owner-1",
    createdAt: now,
    updatedAt: now,
    traits: [],
    healthRecords: [],
    breedingGoals: [],
  };
  return { ...base, ...overrides } as PetWithRelations;
}

function trait(name: string, value: string, isDna = false) {
  return {
    id: `t-${name}`,
    petId: "p",
    traitName: name,
    traitValue: value,
    source: isDna ? "DNA_VERIFIED" : "SELF_REPORTED",
  } as PetWithRelations["traits"][number];
}

function healthRecord(opts: {
  type?: "VACCINE" | "DNA" | "VET_VISIT" | "CERTIFICATE";
  verified?: boolean;
  title?: string;
}) {
  return {
    id: `h-${opts.title ?? Math.random()}`,
    petId: "p",
    type: opts.type ?? "VET_VISIT",
    title: opts.title ?? "Checkup",
    fileUrl: null,
    isVerified: opts.verified ?? false,
    verifiedBy: null,
    verifiedAt: null,
    notes: null,
    recordDate: now,
  } as PetWithRelations["healthRecords"][number];
}

function breedingGoal(opts: {
  desired?: string[];
  preferred?: string[];
  maxCOI?: number | null;
}) {
  return {
    id: "g-1",
    petId: "p",
    desiredTraits: opts.desired ?? [],
    preferredBreeds: opts.preferred ?? [],
    maxCOI: opts.maxCOI ?? null,
    notes: null,
  } as PetWithRelations["breedingGoals"][number];
}

/* ─── Tests ──────────────────────────────────────────────────────────── */

test("perfect match: matching traits, verified DNA, low COI, same breed, nearby", () => {
  const petA = makePet({
    id: "A",
    sex: "FEMALE",
    dateOfBirth: MONTHS_AGO(36),
    healthRecords: [
      healthRecord({ type: "DNA", verified: true, title: "DNA panel" }),
      healthRecord({ type: "VACCINE", verified: true, title: "Rabies" }),
    ],
    breedingGoals: [
      breedingGoal({
        desired: ["Friendly", "Calm", "Active"],
        preferred: ["Golden Retriever"],
        maxCOI: 6,
      }),
    ],
  });

  const petB = makePet({
    id: "B",
    sex: "MALE",
    breed: "Golden Retriever",
    dateOfBirth: MONTHS_AGO(30),
    traits: [
      trait("Temperament", "Friendly"),
      trait("Energy", "Calm and Active"),
      trait("coiEstimate", "4.1"),
    ],
    healthRecords: [
      healthRecord({ type: "DNA", verified: true, title: "Embark panel" }),
      healthRecord({ type: "VACCINE", verified: true, title: "Rabies" }),
    ],
  });

  const result = scoreMatch(
    petA,
    petB,
    { lat: 40.7128, lng: -74.006 }, // NYC
    { lat: 40.73, lng: -73.99 } // ~3km
  );

  assert.equal(result.flags.length, 0, "should have no flags");
  // Traits: 3 matched × 5 = 15, +5 breed bonus = 20
  assert.equal(result.breakdown.traits, 20);
  // Health: 30 (verified DNA + verified records)
  assert.equal(result.breakdown.health, 30);
  // Diversity: COI 4.1 ≤ maxCOI 6 → 20
  assert.equal(result.breakdown.diversity, 20);
  // Proximity: ~3km → 10
  assert.equal(result.breakdown.proximity, 10);
  // Preferences: breed matches → 5
  assert.equal(result.breakdown.preferences, 5);
  assert.equal(result.score, 85);
});

test("flagged match: shared HUU recessive caps the score at 30", () => {
  const huu = (name = "Hyperuricosuria (HUU) (health)", value = "carrier") =>
    trait(name, value, true);

  const petA = makePet({
    id: "A",
    sex: "FEMALE",
    dateOfBirth: MONTHS_AGO(36),
    traits: [huu()],
    healthRecords: [healthRecord({ type: "DNA", verified: true })],
    breedingGoals: [
      breedingGoal({
        desired: ["Friendly", "Calm"],
        preferred: ["Golden Retriever"],
        maxCOI: 6,
      }),
    ],
  });
  const petB = makePet({
    id: "B",
    sex: "MALE",
    dateOfBirth: MONTHS_AGO(30),
    breed: "Golden Retriever",
    traits: [huu(), trait("Temperament", "Friendly"), trait("coiEstimate", "4.0")],
    healthRecords: [healthRecord({ type: "DNA", verified: true })],
  });

  const result = scoreMatch(
    petA,
    petB,
    { lat: 40.7128, lng: -74.006 },
    { lat: 40.73, lng: -73.99 }
  );

  assert.ok(
    result.flags.includes("SHARED_RECESSIVE_GENE"),
    "should flag SHARED_RECESSIVE_GENE"
  );
  assert.ok(result.score <= HARD_CAP, "score must be capped at 30");
  // Breakdown still reflects raw component values so the UI can show why
  assert.ok(result.breakdown.traits > 0);
  assert.ok(result.breakdown.health > 0);
});

test("underage pet flags PET_UNDERAGE and caps the score", () => {
  const petA = makePet({
    id: "A",
    sex: "FEMALE",
    dateOfBirth: MONTHS_AGO(36),
    healthRecords: [healthRecord({ type: "DNA", verified: true })],
    breedingGoals: [breedingGoal({ desired: ["Active"], maxCOI: 6 })],
  });
  const petB = makePet({
    id: "B",
    sex: "MALE",
    breed: "Golden Retriever",
    dateOfBirth: MONTHS_AGO(8), // way under 14mo male threshold
    traits: [trait("Temperament", "Active"), trait("coiEstimate", "3.5")],
    healthRecords: [healthRecord({ type: "DNA", verified: true })],
  });

  const result = scoreMatch(petA, petB);

  assert.ok(result.flags.includes("PET_UNDERAGE"));
  assert.ok(result.score <= HARD_CAP);
});

test("missing COI data falls back to neutral 10 in diversity", () => {
  const petA = makePet({
    id: "A",
    sex: "FEMALE",
    dateOfBirth: MONTHS_AGO(36),
    healthRecords: [healthRecord({ type: "DNA", verified: true })],
    breedingGoals: [breedingGoal({ desired: [], maxCOI: 6 })],
  });
  const petB = makePet({
    id: "B",
    sex: "MALE",
    breed: "Border Collie",
    dateOfBirth: MONTHS_AGO(30),
    // no coiEstimate trait
    traits: [trait("Coat", "Black")],
    healthRecords: [healthRecord({ type: "DNA", verified: true })],
  });

  const result = scoreMatch(petA, petB);

  assert.equal(result.breakdown.diversity, 10, "neutral diversity score");
  // Different breed AND no group overlap (Border Collie=Herding) — traits 0
  assert.equal(result.breakdown.traits, 0);
  // No location → fallback 2
  assert.equal(result.breakdown.proximity, 2);
});

test("HIGH_COI flag fires when candidate COI exceeds maxCOI + 6", () => {
  const petA = makePet({
    id: "A",
    sex: "FEMALE",
    dateOfBirth: MONTHS_AGO(36),
    healthRecords: [healthRecord({ type: "DNA", verified: true })],
    breedingGoals: [breedingGoal({ desired: [], maxCOI: 5 })],
  });
  const petB = makePet({
    id: "B",
    sex: "MALE",
    breed: "Bulldog",
    dateOfBirth: MONTHS_AGO(30),
    traits: [trait("coiEstimate", "14.0")], // > 12.5 → also crosses danger threshold
    healthRecords: [healthRecord({ type: "DNA", verified: true })],
  });

  const result = scoreMatch(petA, petB);

  assert.ok(result.flags.includes("HIGH_COI"));
  assert.equal(result.breakdown.diversity, 0);
  assert.ok(result.score <= HARD_CAP);
});

test("no DNA record on candidate docks 10 from health (no flag)", () => {
  const petA = makePet({
    id: "A",
    sex: "FEMALE",
    dateOfBirth: MONTHS_AGO(36),
    healthRecords: [healthRecord({ type: "DNA", verified: true })],
    breedingGoals: [breedingGoal({ desired: [], maxCOI: 6 })],
  });
  const petB = makePet({
    id: "B",
    sex: "MALE",
    breed: "Golden Retriever",
    dateOfBirth: MONTHS_AGO(30),
    traits: [trait("coiEstimate", "4.0")],
    // Vet visit only, no DNA
    healthRecords: [healthRecord({ type: "VET_VISIT", verified: true })],
  });

  const result = scoreMatch(petA, petB);

  assert.equal(result.breakdown.health, 20, "30 - 10 for missing DNA = 20");
  assert.ok(!result.flags.includes("SHARED_RECESSIVE_GENE"));
});

test("batchScoreMatches returns candidates sorted by score descending", () => {
  const petA = makePet({
    id: "A",
    sex: "FEMALE",
    dateOfBirth: MONTHS_AGO(36),
    healthRecords: [healthRecord({ type: "DNA", verified: true })],
    breedingGoals: [breedingGoal({ desired: ["Calm"], maxCOI: 6 })],
  });

  // Higher score: same breed, matched trait, healthy COI
  const great = makePet({
    id: "great",
    sex: "MALE",
    breed: "Golden Retriever",
    dateOfBirth: MONTHS_AGO(30),
    traits: [trait("Temperament", "Calm"), trait("coiEstimate", "4.0")],
    healthRecords: [healthRecord({ type: "DNA", verified: true })],
  });
  // Mid: different breed, no matched trait
  const mid = makePet({
    id: "mid",
    sex: "MALE",
    breed: "Beagle",
    dateOfBirth: MONTHS_AGO(30),
    traits: [trait("coiEstimate", "5.5")],
    healthRecords: [healthRecord({ type: "DNA", verified: true })],
  });
  // Low: underage → flagged → capped
  const low = makePet({
    id: "low",
    sex: "MALE",
    breed: "Golden Retriever",
    dateOfBirth: MONTHS_AGO(6),
    traits: [trait("Temperament", "Calm"), trait("coiEstimate", "4.0")],
    healthRecords: [healthRecord({ type: "DNA", verified: true })],
  });

  const results = batchScoreMatches(petA, [
    { pet: low },
    { pet: mid },
    { pet: great },
  ]);

  const ids = results.map((r) => r.pet.id);
  assert.equal(ids[0], "great");
  assert.equal(ids[2], "low");
  assert.ok(results[0].result.score >= results[1].result.score);
  assert.ok(results[1].result.score >= results[2].result.score);
});
