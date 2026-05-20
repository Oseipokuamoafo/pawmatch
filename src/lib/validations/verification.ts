import { z } from "zod";

export const verifyRequestSchema = z.object({
  documents: z
    .array(z.string().url("Each document must be a valid URL"))
    .min(1, "Upload at least one supporting document")
    .max(5, "Maximum 5 documents"),
  programDescription: z
    .string()
    .trim()
    .min(50, "Tell us a bit more — at least 50 characters")
    .max(4000, "Description is too long (4000 char max)"),
});

export const verifyActionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  notes: z.string().trim().max(1000).optional(),
});

export type VerifyRequestInput = z.infer<typeof verifyRequestSchema>;
export type VerifyActionInput = z.infer<typeof verifyActionSchema>;
