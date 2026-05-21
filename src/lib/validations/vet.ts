import { z } from "zod";

/** Admin's verdict on a pending vet application. */
export const vetApplicationActionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  notes: z.string().max(2000).optional().nullable(),
});

export type VetApplicationActionInput = z.infer<typeof vetApplicationActionSchema>;

/** Owner asks a specific vet to co-sign a health record. */
export const cosignRequestSchema = z.object({
  vetId: z.string().min(1, "Pick a vet"),
});
export type CosignRequestInput = z.infer<typeof cosignRequestSchema>;

/** Vet either signs the record or declines (with optional notes). */
export const cosignActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("sign"),
    notes: z.string().max(2000).optional().nullable(),
  }),
  z.object({
    action: z.literal("decline"),
    notes: z.string().max(2000).optional().nullable(),
  }),
]);
export type CosignActionInput = z.infer<typeof cosignActionSchema>;
