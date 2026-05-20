import { z } from "zod";

export const createMatchSchema = z.object({
  /** The user's own pet making the request */
  petAId: z.string().min(1),
  /** The candidate pet */
  petBId: z.string().min(1),
});

export const updateMatchSchema = z.object({
  status: z.enum(["ACCEPTED", "REJECTED"]),
});

export type CreateMatchInput = z.infer<typeof createMatchSchema>;
export type UpdateMatchInput = z.infer<typeof updateMatchSchema>;
