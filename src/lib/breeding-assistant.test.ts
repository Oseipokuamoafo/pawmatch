import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildSystemPrompt,
  MAX_USER_MESSAGE_CHARS,
  MAX_THREAD_TURNS,
  type PetContextInput,
} from "./breeding-assistant";

const basePet: PetContextInput["pet"] = {
  id: "p1",
  name: "Luna",
  species: "DOG",
  breed: "Labrador Retriever",
  sex: "FEMALE",
  dateOfBirth: new Date("2022-04-15"),
  color: "Black",
  weight: 28,
  bio: null,
};

function ctx(over: Partial<PetContextInput> = {}): PetContextInput {
  return {
    pet: basePet,
    healthRecords: [],
    traits: [],
    breedingGoals: [],
    breed: null,
    heatCycles: [],
    heatSummary: null,
    ...over,
  };
}

/* ─── Pet core ───────────────────────────────────────────────────────── */

test("buildSystemPrompt includes the pet's identifying fields", () => {
  const out = buildSystemPrompt(ctx());
  assert.match(out, /Name: Luna/);
  assert.match(out, /Species: DOG/);
  assert.match(out, /Breed: Labrador Retriever/);
  assert.match(out, /Sex: FEMALE/);
  assert.match(out, /Color: Black/);
  assert.match(out, /Weight: 28 kg/);
});

test("buildSystemPrompt omits optional fields when missing", () => {
  const out = buildSystemPrompt(
    ctx({ pet: { ...basePet, color: null, weight: null, bio: null } }),
  );
  assert.doesNotMatch(out, /Color:/);
  assert.doesNotMatch(out, /Weight:/);
  assert.doesNotMatch(out, /Owner bio:/);
});

/* ─── Health records ─────────────────────────────────────────────────── */

test("buildSystemPrompt tags vet-verified vs self-reported records", () => {
  const out = buildSystemPrompt(
    ctx({
      healthRecords: [
        {
          type: "VACCINE",
          title: "Rabies",
          recordDate: new Date("2024-05-01"),
          isVerified: true,
          verifiedByVetId: "vet1",
          notes: null,
        },
        {
          type: "VET_VISIT",
          title: "Annual checkup",
          recordDate: new Date("2024-06-01"),
          isVerified: false,
          verifiedByVetId: null,
          notes: "No issues",
        },
      ],
    }),
  );
  assert.match(out, /\[VET-VERIFIED\] VACCINE: Rabies/);
  assert.match(out, /\[self-reported\] VET_VISIT: Annual checkup/);
  assert.match(out, /No issues/); // notes flow through
});

test("buildSystemPrompt notes when no health records on file", () => {
  const out = buildSystemPrompt(ctx());
  // Match "Health records" followed (somewhere after) by "(none on file)"
  // — avoid the `s` regex flag which the tsconfig target doesn't allow.
  assert.match(out, /--- Health records ---/);
  assert.match(out, /\(none on file\)/);
});

/* ─── Traits ─────────────────────────────────────────────────────────── */

test("buildSystemPrompt distinguishes DNA-verified from self-reported traits", () => {
  const out = buildSystemPrompt(
    ctx({
      traits: [
        {
          traitName: "MDR1",
          traitValue: "carrier",
          source: "DNA_VERIFIED",
        },
        {
          traitName: "Coat color",
          traitValue: "black",
          source: "SELF_REPORTED",
        },
      ],
    }),
  );
  assert.match(out, /MDR1: carrier \(DNA-verified\)/);
  assert.match(out, /Coat color: black \(self-reported\)/);
});

/* ─── Breed reference ────────────────────────────────────────────────── */

test("buildSystemPrompt surfaces recessive markers from breed reference", () => {
  const out = buildSystemPrompt(
    ctx({
      breed: {
        name: "Labrador Retriever",
        group: "Sporting",
        averageCOI: 0.055,
        commonRecessiveGenes: ["EIC", "PRA-prcd", "CNM"],
        lifespanMinYears: 10,
        lifespanMaxYears: 12,
        temperament: ["friendly", "outgoing"],
      },
    }),
  );
  assert.match(out, /Average breed COI: 5\.5%/);
  assert.match(out, /Known recessive markers in breed: EIC, PRA-prcd, CNM/);
  assert.match(out, /Typical lifespan: 10-12 years/);
});

test("buildSystemPrompt skips breed block when no reference is loaded", () => {
  const out = buildSystemPrompt(ctx({ breed: null }));
  assert.doesNotMatch(out, /Breed reference/);
});

/* ─── Breeding goals ─────────────────────────────────────────────────── */

test("buildSystemPrompt renders breeding goals with max COI %", () => {
  const out = buildSystemPrompt(
    ctx({
      breedingGoals: [
        {
          desiredTraits: { temperament: "calm" },
          preferredBreeds: ["Labrador Retriever", "Golden Retriever"],
          maxCOI: 0.08,
          notes: "Looking for show-line",
        },
      ],
    }),
  );
  assert.match(out, /Preferred breeds: Labrador Retriever, Golden Retriever/);
  assert.match(out, /Max acceptable COI: 8\.0%/);
  assert.match(out, /Looking for show-line/);
});

/* ─── Heat cycles ────────────────────────────────────────────────────── */

test("buildSystemPrompt renders heat cycle section for FEMALE w/ cycles", () => {
  const out = buildSystemPrompt(
    ctx({
      heatCycles: [
        {
          id: "h1",
          startDate: new Date("2026-02-01"),
          endDate: new Date("2026-02-21"),
          peakFertilityStart: null,
          peakFertilityEnd: null,
        },
        {
          id: "h2",
          startDate: new Date("2025-08-15"),
          endDate: new Date("2025-09-04"),
          peakFertilityStart: null,
          peakFertilityEnd: null,
        },
      ],
      heatSummary: {
        isActive: false,
        activeCycleId: null,
        lastCompleted: null,
        averageCycleDays: 170,
        nextPredictedStart: new Date("2026-07-21"),
        daysUntilNext: 14,
        fertileWindow: null,
        total: 2,
      },
    }),
  );
  assert.match(out, /--- Heat cycle history ---/);
  assert.match(out, /Total cycles logged: 2/);
  assert.match(out, /Currently in heat: no/);
  assert.match(out, /Average gap between cycles: 170 days/);
  assert.match(out, /Next predicted cycle start: 2026-07-21 \(in 14 days\)/);
  assert.match(out, /2026-02-01 → 2026-02-21/);
});

test("buildSystemPrompt notes when FEMALE has no cycles logged", () => {
  const out = buildSystemPrompt(ctx());
  assert.match(out, /--- Heat cycle history ---/);
  assert.match(out, /\(none logged — owner has not tracked heat cycles yet\)/);
});

test("buildSystemPrompt omits heat cycle section entirely for MALE pets", () => {
  const out = buildSystemPrompt(
    ctx({ pet: { ...basePet, sex: "MALE" } }),
  );
  assert.doesNotMatch(out, /Heat cycle history/);
});

test("buildSystemPrompt renders fertile window when actively in heat", () => {
  const out = buildSystemPrompt(
    ctx({
      heatCycles: [
        {
          id: "h1",
          startDate: new Date("2026-05-15"),
          endDate: null,
          peakFertilityStart: new Date("2026-05-23"),
          peakFertilityEnd: new Date("2026-05-27"),
        },
      ],
      heatSummary: {
        isActive: true,
        activeCycleId: "h1",
        lastCompleted: null,
        averageCycleDays: null,
        nextPredictedStart: null,
        daysUntilNext: null,
        fertileWindow: {
          start: new Date("2026-05-23"),
          end: new Date("2026-05-27"),
        },
        total: 1,
      },
    }),
  );
  assert.match(out, /Currently in heat: YES/);
  assert.match(out, /Fertile window \(this cycle\): 2026-05-23 → 2026-05-27/);
});

test("buildSystemPrompt flags overdue cycles", () => {
  const out = buildSystemPrompt(
    ctx({
      heatCycles: [
        {
          id: "h1",
          startDate: new Date("2025-01-01"),
          endDate: new Date("2025-01-21"),
          peakFertilityStart: null,
          peakFertilityEnd: null,
        },
      ],
      heatSummary: {
        isActive: false,
        activeCycleId: null,
        lastCompleted: null,
        averageCycleDays: 180,
        nextPredictedStart: new Date("2025-07-01"),
        daysUntilNext: -45,
        fertileWindow: null,
        total: 1,
      },
    }),
  );
  assert.match(out, /Next predicted cycle start: 2025-07-01 \(45 days overdue\)/);
});

/* ─── Rubric invariants ──────────────────────────────────────────────── */

test("buildSystemPrompt grounds the assistant in record data + flags self-reported", () => {
  const out = buildSystemPrompt(ctx());
  // Rubric explicitly tells the model to ground answers in the record
  assert.match(out, /GROUND EVERY ANSWER IN THE PET'S RECORD/);
  // And to distinguish verified from self-reported
  assert.match(out, /DISTINGUISH VERIFIED FROM SELF-REPORTED/);
  // And to be conservative on genetic risk
  assert.match(out, /CONSERVATIVE ON GENETIC RISK/);
});

/* ─── Guard constants ────────────────────────────────────────────────── */

test("MAX_USER_MESSAGE_CHARS is a sane positive integer", () => {
  assert.equal(Number.isInteger(MAX_USER_MESSAGE_CHARS), true);
  assert.ok(MAX_USER_MESSAGE_CHARS > 500);
  assert.ok(MAX_USER_MESSAGE_CHARS < 100_000);
});

test("MAX_THREAD_TURNS caps the conversation length", () => {
  assert.equal(Number.isInteger(MAX_THREAD_TURNS), true);
  assert.ok(MAX_THREAD_TURNS >= 10);
  assert.ok(MAX_THREAD_TURNS <= 500);
});
