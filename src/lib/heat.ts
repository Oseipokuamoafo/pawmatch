/**
 * Heat-cycle helpers. Pure functions over an ordered array of cycles
 * so the same code path serves the pet detail UI, the dashboard
 * widget, and any future scheduling work.
 *
 * Conventions:
 *   - Cycles are sorted by startDate descending in everything we
 *     pass through here (most recent first).
 *   - "Active" means startDate ≤ today AND (endDate is null OR
 *     endDate ≥ today).
 *   - Average cycle gap = mean number of days between consecutive
 *     startDate values, computed over the last up-to-5 cycles.
 *   - Default fertile window when not explicitly marked: day 9-13
 *     of the cycle (canine norm). Cats are induced ovulators so
 *     the same heuristic isn't strictly accurate — UI warns owners
 *     accordingly.
 */

export interface HeatCycleRow {
  id: string;
  startDate: string | Date;
  endDate: string | Date | null;
  peakFertilityStart: string | Date | null;
  peakFertilityEnd: string | Date | null;
  notes?: string | null;
}

export interface HeatSummary {
  /** Currently in heat? */
  isActive: boolean;
  /** Active cycle (id) if any. */
  activeCycleId: string | null;
  /** Cycle most recently *completed* (null while one is active and none prior). */
  lastCompleted: HeatCycleRow | null;
  /** Average gap between cycle starts, in days. Null when < 2 cycles. */
  averageCycleDays: number | null;
  /** Predicted start date of the next cycle. Null when nothing to project from. */
  nextPredictedStart: Date | null;
  /** Days until the next predicted start (negative if overdue). */
  daysUntilNext: number | null;
  /** Fertile window for the active cycle (explicit or estimated). */
  fertileWindow: { start: Date; end: Date } | null;
  /** Total cycles recorded. */
  total: number;
}

const DAY_MS = 86_400_000;

function toDate(d: string | Date): Date {
  return typeof d === "string" ? new Date(d) : d;
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Default 21-day cycle for cats, 6-month for dogs is too coarse;
 *  use whichever the data actually supports (averageCycleDays). */
const FALLBACK_CYCLE_DAYS_DOG = 180;
const FALLBACK_CYCLE_DAYS_CAT = 21;

export function summarizeHeat(
  cycles: HeatCycleRow[],
  species: "DOG" | "CAT",
  now: Date = new Date(),
): HeatSummary {
  if (cycles.length === 0) {
    return {
      isActive: false,
      activeCycleId: null,
      lastCompleted: null,
      averageCycleDays: null,
      nextPredictedStart: null,
      daysUntilNext: null,
      fertileWindow: null,
      total: 0,
    };
  }

  // Defensive sort (most recent first) so the API isn't load-bearing.
  const sorted = [...cycles].sort((a, b) => +toDate(b.startDate) - +toDate(a.startDate));
  const today = startOfDay(now);

  const active = sorted.find((c) => {
    const start = startOfDay(toDate(c.startDate));
    const end = c.endDate ? startOfDay(toDate(c.endDate)) : null;
    return start <= today && (!end || end >= today);
  });

  const lastCompleted = sorted.find((c) => c.endDate && c !== active) ?? null;

  // Average gap between consecutive starts (last up-to-5 pairs).
  let averageCycleDays: number | null = null;
  if (sorted.length >= 2) {
    const gaps: number[] = [];
    for (let i = 0; i < Math.min(sorted.length - 1, 5); i++) {
      const newer = +toDate(sorted[i].startDate);
      const older = +toDate(sorted[i + 1].startDate);
      const gap = Math.round((newer - older) / DAY_MS);
      if (gap > 0) gaps.push(gap);
    }
    if (gaps.length > 0) {
      averageCycleDays = Math.round(
        gaps.reduce((s, n) => s + n, 0) / gaps.length,
      );
    }
  }

  // Project the next cycle start from the most recent cycle.
  const referenceStart = +toDate(sorted[0].startDate);
  const cycleDays =
    averageCycleDays ??
    (species === "CAT" ? FALLBACK_CYCLE_DAYS_CAT : FALLBACK_CYCLE_DAYS_DOG);
  const nextPredictedStart = new Date(referenceStart + cycleDays * DAY_MS);
  const daysUntilNext = Math.round(
    (+startOfDay(nextPredictedStart) - +today) / DAY_MS,
  );

  // Fertile window for an active cycle.
  let fertileWindow: HeatSummary["fertileWindow"] = null;
  if (active) {
    if (active.peakFertilityStart && active.peakFertilityEnd) {
      fertileWindow = {
        start: toDate(active.peakFertilityStart),
        end: toDate(active.peakFertilityEnd),
      };
    } else {
      const start = toDate(active.startDate);
      // Canine norm: peak fertility days 9-13 of the cycle.
      fertileWindow = {
        start: new Date(+start + 8 * DAY_MS),
        end: new Date(+start + 12 * DAY_MS),
      };
    }
  }

  return {
    isActive: Boolean(active),
    activeCycleId: active?.id ?? null,
    lastCompleted,
    averageCycleDays,
    nextPredictedStart,
    daysUntilNext,
    fertileWindow,
    total: cycles.length,
  };
}

/** Friendly relative label: "today", "in 4 days", "2 weeks ago". */
export function formatRelativeDays(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (Math.abs(days) < 14) {
    return days > 0 ? `in ${days} days` : `${Math.abs(days)} days ago`;
  }
  const weeks = Math.round(Math.abs(days) / 7);
  if (weeks < 9) {
    const suffix = weeks === 1 ? "week" : "weeks";
    return days > 0 ? `in ${weeks} ${suffix}` : `${weeks} ${suffix} ago`;
  }
  const months = Math.round(Math.abs(days) / 30);
  const suffix = months === 1 ? "month" : "months";
  return days > 0 ? `in ${months} ${suffix}` : `${months} ${suffix} ago`;
}
