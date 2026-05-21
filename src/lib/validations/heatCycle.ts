import { z } from "zod";

// ISO 8601 date or full datetime — Zod's coerce keeps the boundary forgiving
// while everything downstream sees a real Date.
const dateLike = z.coerce.date();

// Cross-field check used by both create + update schemas. Returns true when
// the boundaries are internally consistent.
function datesAreOrdered(v: {
  startDate?: Date | null;
  endDate?: Date | null;
  peakFertilityStart?: Date | null;
  peakFertilityEnd?: Date | null;
}): boolean {
  if (v.endDate && v.startDate && v.endDate.getTime() < v.startDate.getTime()) {
    return false;
  }
  if (
    v.peakFertilityStart &&
    v.peakFertilityEnd &&
    v.peakFertilityEnd.getTime() < v.peakFertilityStart.getTime()
  ) {
    return false;
  }
  return true;
}

const ORDER_ERROR = {
  message: "End dates must be on or after their start dates.",
};

export const createHeatCycleSchema = z
  .object({
    startDate: dateLike,
    endDate: dateLike.optional().nullable(),
    peakFertilityStart: dateLike.optional().nullable(),
    peakFertilityEnd: dateLike.optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
  })
  .refine(datesAreOrdered, ORDER_ERROR);

export const updateHeatCycleSchema = z
  .object({
    startDate: dateLike.optional(),
    endDate: dateLike.optional().nullable(),
    peakFertilityStart: dateLike.optional().nullable(),
    peakFertilityEnd: dateLike.optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
  })
  .refine(datesAreOrdered, ORDER_ERROR);

export type CreateHeatCycleInput = z.infer<typeof createHeatCycleSchema>;
export type UpdateHeatCycleInput = z.infer<typeof updateHeatCycleSchema>;
