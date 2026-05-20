import { z } from "zod";

export const petStep1Schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50),
  species: z.enum(["DOG", "CAT"]),
  breed: z.string().trim().min(1, "Breed is required").max(50),
  sex: z.enum(["MALE", "FEMALE"]),
  dateOfBirth: z
    .string()
    .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date")
    .refine((s) => new Date(s) <= new Date(), "Date of birth cannot be in the future"),
  color: z.string().max(50).optional(),
  weight: z.number().positive().max(200).optional().nullable(),
  bio: z.string().max(500).optional(),
});

export const photoSchema = z.object({
  url: z.string().url(),
  isPrimary: z.boolean(),
});

export const petStep2Schema = z.object({
  livePhotoUrl: z.string().url("A live verification photo is required"),
  photos: z.array(photoSchema).max(6, "Maximum 6 photos"),
});

export const livePhotoSchema = z.object({
  livePhotoUrl: z.string().url(),
});

export const petStep3Schema = z.object({
  desiredTraits: z.array(z.string()).default([]),
  preferredBreeds: z.array(z.string()).default([]),
  maxCOI: z.number().min(0).max(25),
  goalNotes: z.string().max(500).optional(),
});

export const createPetSchema = petStep1Schema
  .merge(petStep2Schema)
  .merge(petStep3Schema);

export const updatePetSchema = petStep1Schema.partial().extend({
  isActive: z.boolean().optional(),
});

export const healthRecordTypeEnum = z.enum([
  "VACCINE",
  "DNA",
  "VET_VISIT",
  "CERTIFICATE",
]);

export const createHealthRecordSchema = z.object({
  type: healthRecordTypeEnum,
  title: z.string().trim().min(1, "Title is required").max(120),
  recordDate: z
    .string()
    .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date")
    .refine((s) => new Date(s) <= new Date(), "Record date cannot be in the future"),
  fileUrl: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  notes: z.string().max(1000).optional(),
});

export type CreatePetInput = z.infer<typeof createPetSchema>;
export type UpdatePetInput = z.infer<typeof updatePetSchema>;
export type CreateHealthRecordInput = z.infer<typeof createHealthRecordSchema>;
