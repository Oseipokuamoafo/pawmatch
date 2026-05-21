import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/** Vet license block — required as a unit when included on sign-up.
 *  User row is created with placeholder role=OWNER and
 *  vetApplicationStatus=PENDING; auto-screen or admin review flips them
 *  to VET. See /admin/vets. */
export const vetApplicationSchema = z.object({
  licenseNumber: z.string().min(2, "License number is required").max(80),
  licenseState: z.string().min(2, "Licensing state/region is required").max(80),
  practiceName: z.string().min(2, "Practice name is required").max(160),
  practiceAddress: z.string().min(2, "Practice address is required").max(400),
  practicePhone: z.string().min(5, "Practice phone is required").max(40),
});

export const signUpSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").max(80),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters").max(128),
    /** Three primary signup intents:
     *   - OWNER   — has pets, here to find matches
     *   - BREEDER — runs a breeding program
     *   - VET     — licensed veterinarian here to verify records (no pet
     *               obligation). Stored with placeholder role=OWNER until
     *               approval flips them to VET. */
    role: z.enum(["OWNER", "BREEDER", "VET"]),
    /** Required when role=VET; optional otherwise (OWNER/BREEDER who
     *  happen to also be vets can opt-in via the same block). */
    vetApplication: vetApplicationSchema.optional(),
  })
  .refine(
    (data) => data.role !== "VET" || Boolean(data.vetApplication),
    {
      message: "License details are required when signing up as a vet.",
      path: ["vetApplication"],
    },
  );

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type VetApplicationInput = z.infer<typeof vetApplicationSchema>;
