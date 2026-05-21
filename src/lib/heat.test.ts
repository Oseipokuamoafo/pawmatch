import { test } from "node:test";
import assert from "node:assert/strict";

import {
  summarizeHeat,
  formatRelativeDays,
  type HeatCycleRow,
} from "./heat";

const DAY = 86_400_000;
const at = (msFromNow: number, now: Date) =>
  new Date(now.getTime() + msFromNow);

function cycle(
  id: string,
  startOffsetDays: number,
  durationDays: number | null,
  now: Date,
): HeatCycleRow {
  const start = at(startOffsetDays * DAY, now);
  const end =
    durationDays === null ? null : at((startOffsetDays + durationDays) * DAY, now);
  return {
    id,
    startDate: start,
    endDate: end,
    peakFertilityStart: null,
    peakFertilityEnd: null,
  };
}

/* ─── summarizeHeat ──────────────────────────────────────────────────── */

test("empty history returns zeroed summary", () => {
  const s = summarizeHeat([], "DOG");
  assert.equal(s.total, 0);
  assert.equal(s.isActive, false);
  assert.equal(s.nextPredictedStart, null);
  assert.equal(s.daysUntilNext, null);
  assert.equal(s.averageCycleDays, null);
  assert.equal(s.fertileWindow, null);
});

test("single closed cycle projects next via species fallback (canine = 180d)", () => {
  const now = new Date("2026-01-15T00:00:00Z");
  const cycles = [cycle("a", -30, 14, now)];
  const s = summarizeHeat(cycles, "DOG", now);
  assert.equal(s.isActive, false);
  assert.equal(s.total, 1);
  assert.equal(s.averageCycleDays, null);
  // start was -30d, fallback 180d → next start is +150 days
  assert.equal(s.daysUntilNext, 150);
});

test("single cycle for a cat uses 21-day fallback", () => {
  const now = new Date("2026-01-15T00:00:00Z");
  const cycles = [cycle("a", -7, 5, now)];
  const s = summarizeHeat(cycles, "CAT", now);
  assert.equal(s.daysUntilNext, 14); // -7 + 21 = +14
});

test("multiple cycles compute rolling average gap", () => {
  const now = new Date("2026-01-15T00:00:00Z");
  // Cycles every 200 days, three of them. Most recent first.
  const cycles = [
    cycle("c", -10, 14, now),
    cycle("b", -210, 14, now),
    cycle("a", -410, 14, now),
  ];
  const s = summarizeHeat(cycles, "DOG", now);
  assert.equal(s.averageCycleDays, 200);
  assert.equal(s.daysUntilNext, 190); // -10 + 200 = +190
  assert.equal(s.total, 3);
});

test("active cycle flips isActive and computes fertile window heuristic", () => {
  const now = new Date("2026-01-15T00:00:00Z");
  // Started 5 days ago, no end yet — currently in heat.
  const cycles = [cycle("a", -5, null, now)];
  const s = summarizeHeat(cycles, "DOG", now);
  assert.equal(s.isActive, true);
  assert.equal(s.activeCycleId, "a");
  assert.ok(s.fertileWindow);
  // Heuristic: days 9-13 of the cycle (8-12 day offsets from start).
  const expectedStart = at(-5 * DAY + 8 * DAY, now).getTime();
  const expectedEnd = at(-5 * DAY + 12 * DAY, now).getTime();
  assert.equal(s.fertileWindow!.start.getTime(), expectedStart);
  assert.equal(s.fertileWindow!.end.getTime(), expectedEnd);
});

test("explicit fertile window overrides the heuristic", () => {
  const now = new Date("2026-01-15T00:00:00Z");
  const explicitStart = at(-2 * DAY, now);
  const explicitEnd = at(2 * DAY, now);
  const cycles: HeatCycleRow[] = [
    {
      id: "a",
      startDate: at(-5 * DAY, now),
      endDate: null,
      peakFertilityStart: explicitStart,
      peakFertilityEnd: explicitEnd,
    },
  ];
  const s = summarizeHeat(cycles, "DOG", now);
  assert.equal(s.fertileWindow!.start.getTime(), explicitStart.getTime());
  assert.equal(s.fertileWindow!.end.getTime(), explicitEnd.getTime());
});

test("input order doesn't matter — internal sort is defensive", () => {
  const now = new Date("2026-01-15T00:00:00Z");
  const a = cycle("a", -400, 14, now);
  const b = cycle("b", -200, 14, now);
  // Pass in ascending — should still resolve `b` as the most-recent reference.
  const s = summarizeHeat([a, b], "DOG", now);
  assert.equal(s.averageCycleDays, 200);
  assert.equal(s.daysUntilNext, 0); // -200 + 200 = today
});

/* ─── formatRelativeDays ─────────────────────────────────────────────── */

test("formatRelativeDays handles edges + units", () => {
  assert.equal(formatRelativeDays(0), "today");
  assert.equal(formatRelativeDays(1), "tomorrow");
  assert.equal(formatRelativeDays(-1), "yesterday");
  assert.equal(formatRelativeDays(7), "in 7 days");
  assert.equal(formatRelativeDays(-10), "10 days ago");
  assert.equal(formatRelativeDays(14), "in 2 weeks");
  assert.equal(formatRelativeDays(-21), "3 weeks ago");
  assert.equal(formatRelativeDays(60), "in 2 months");
});
