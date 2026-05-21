import { test } from "node:test";
import assert from "node:assert/strict";

import {
  computeHealthScore,
  computeStats,
  bestMatchScoresByPet,
} from "./dashboard-stats";

/* ─── computeHealthScore ─────────────────────────────────────────────── */

const baseHealth = {
  livePhotoUrl: null as string | null,
  healthRecords: [] as { isVerified: boolean }[],
  breedingGoals: [] as unknown[],
  photos: [] as unknown[],
  bio: null as string | null,
};

test("computeHealthScore caps at 100", () => {
  const score = computeHealthScore({
    livePhotoUrl: "x",
    healthRecords: Array.from({ length: 20 }, () => ({ isVerified: true })),
    breedingGoals: [{}, {}],
    photos: [1, 2, 3, 4, 5],
    bio: "yes",
  });
  assert.ok(score <= 100);
  assert.equal(score, 100);
});

test("computeHealthScore weights live photo heaviest", () => {
  const withLive = computeHealthScore({ ...baseHealth, livePhotoUrl: "x" });
  const without = computeHealthScore(baseHealth);
  assert.equal(withLive - without, 35);
});

test("computeHealthScore caps the verified-records bonus at 24", () => {
  const many = computeHealthScore({
    ...baseHealth,
    healthRecords: Array.from({ length: 10 }, () => ({ isVerified: true })),
  });
  // 24 (capped verified) + 6 (any record bonus) = 30
  assert.equal(many, 30);
});

/* ─── computeStats ───────────────────────────────────────────────────── */

const PET_BASE = {
  livePhotoUrl: null as string | null,
  healthRecords: [],
  breedingGoals: [],
  photos: [],
  bio: null as string | null,
};

test("computeStats returns zeros for an empty owner", () => {
  const stats = computeStats([], [], "user-1");
  assert.deepEqual(stats, {
    petCount: 0,
    newMatches: 0,
    avgHealthScore: 0,
    verifiedRatio: 0,
    verifiedCount: 0,
    acceptedMatches: 0,
  });
});

test("computeStats counts pending received matches as newMatches", () => {
  // Three matches; only one is PENDING + receivedById = me.
  const matches = [
    { status: "PENDING", receivedById: "me", initiatedById: "x" },
    { status: "PENDING", receivedById: "other", initiatedById: "me" },
    { status: "ACCEPTED", receivedById: "me", initiatedById: "x" },
  ] as Parameters<typeof computeStats>[1];

  const stats = computeStats([], matches, "me");
  assert.equal(stats.newMatches, 1);
  assert.equal(stats.acceptedMatches, 1);
});

test("computeStats verifiedRatio reflects live-photo coverage", () => {
  const pets = [
    { ...PET_BASE, livePhotoUrl: "yes" },
    { ...PET_BASE, livePhotoUrl: null },
  ] as unknown as Parameters<typeof computeStats>[0];

  const stats = computeStats(pets, [], "me");
  assert.equal(stats.petCount, 2);
  assert.equal(stats.verifiedCount, 1);
  assert.equal(stats.verifiedRatio, 0.5);
});

/* ─── bestMatchScoresByPet ───────────────────────────────────────────── */

test("bestMatchScoresByPet keeps the highest non-rejected score per pet", () => {
  const map = bestMatchScoresByPet([
    { petAId: "p1", petBId: "p2", status: "PENDING", score: 60 },
    { petAId: "p1", petBId: "p3", status: "ACCEPTED", score: 82 },
    { petAId: "p1", petBId: "p4", status: "REJECTED", score: 95 }, // ignored
    { petAId: "p3", petBId: "p5", status: "PENDING", score: 70 },
  ]);
  assert.equal(map.get("p1"), 82);
  assert.equal(map.get("p3"), 82); // higher of 82 (from p1↔p3) and 70 (from p3↔p5)
  assert.equal(map.get("p4"), undefined); // only saw it on a REJECTED match
});
