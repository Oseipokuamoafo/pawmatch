import { z } from "zod";

export const reportReasonEnum = z.enum([
  "SPAM",
  "FAKE_PROFILE",
  "ABUSE",
  "MISLEADING_INFO",
  "ANIMAL_WELFARE",
  "OTHER",
]);

export const REPORT_REASON_LABELS: Record<
  z.infer<typeof reportReasonEnum>,
  { label: string; copy: string }
> = {
  SPAM: { label: "Spam", copy: "Promotional or repetitive content." },
  FAKE_PROFILE: {
    label: "Fake profile",
    copy: "Identity, photos, or pet seems fabricated.",
  },
  ABUSE: { label: "Abuse", copy: "Harassment, threats, hate." },
  MISLEADING_INFO: {
    label: "Misleading info",
    copy: "False breed, health, or pedigree claims.",
  },
  ANIMAL_WELFARE: {
    label: "Animal welfare",
    copy: "Conditions that put the animal at risk.",
  },
  OTHER: { label: "Something else", copy: "Tell us in the description below." },
};

export const createReportSchema = z
  .object({
    targetUserId: z.string().optional(),
    targetPetId: z.string().optional(),
    reason: reportReasonEnum,
    description: z.string().trim().max(500).optional(),
  })
  .refine((d) => Boolean(d.targetUserId) || Boolean(d.targetPetId), {
    message: "A target user or pet is required",
    path: ["targetUserId"],
  });

export const updateReportSchema = z.object({
  status: z.enum(["REVIEWED", "RESOLVED", "DISMISSED"]),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type UpdateReportInput = z.infer<typeof updateReportSchema>;
export type ReportReason = z.infer<typeof reportReasonEnum>;
