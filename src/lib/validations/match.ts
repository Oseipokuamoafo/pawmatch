import { z } from "zod";

export const createMatchSchema = z.object({
  /** The user's own pet making the request */
  petAId: z.string().min(1),
  /** The candidate pet */
  petBId: z.string().min(1),
});

/**
 * Accepts the spec's `{ action: "accept" | "reject" }` shape and also the
 * pre-existing `{ status: "ACCEPTED" | "REJECTED" }` shape for backward
 * compatibility with already-deployed clients.
 */
export const updateMatchSchema = z.union([
  z.object({ action: z.enum(["accept", "reject"]) }),
  z.object({ status: z.enum(["ACCEPTED", "REJECTED"]) }),
]);

export function normalizeMatchAction(
  input: { action: "accept" | "reject" } | { status: "ACCEPTED" | "REJECTED" }
): "ACCEPTED" | "REJECTED" {
  if ("status" in input) return input.status;
  return input.action === "accept" ? "ACCEPTED" : "REJECTED";
}

export type CreateMatchInput = z.infer<typeof createMatchSchema>;
export type UpdateMatchInput = z.infer<typeof updateMatchSchema>;
