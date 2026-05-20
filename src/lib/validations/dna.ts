import { z } from "zod";

/**
 * Normalized DNA-test payload that lands in the dna-import endpoint.
 * Both Embark and Wisdom Panel exports are mapped to this shape client-side.
 */

export const dnaProviderEnum = z.enum(["Embark", "Wisdom Panel", "Other"]);

export const breedCompositionItemSchema = z.object({
  name: z.string().trim().min(1).max(80),
  percent: z.number().min(0).max(100),
});

export const healthMarkerItemSchema = z.object({
  name: z.string().trim().min(1).max(160),
  status: z.string().trim().min(1).max(40),
});

export const traitItemSchema = z.object({
  name: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(160),
});

export const dnaImportSchema = z.object({
  provider: dnaProviderEnum,
  breedComposition: z.array(breedCompositionItemSchema).max(20).default([]),
  healthMarkers: z.array(healthMarkerItemSchema).max(80).default([]),
  traits: z.array(traitItemSchema).max(80).default([]),
  coi: z.number().min(0).max(100).optional(),
  testedOn: z
    .string()
    .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date")
    .optional(),
});

export type DnaImportInput = z.infer<typeof dnaImportSchema>;
export type DnaProvider = z.infer<typeof dnaProviderEnum>;
export type BreedCompositionItem = z.infer<typeof breedCompositionItemSchema>;
export type HealthMarkerItem = z.infer<typeof healthMarkerItemSchema>;
export type TraitItem = z.infer<typeof traitItemSchema>;

/* ─── Client-side parsers ────────────────────────────────────────────── */

/**
 * Try to normalize any of the supported formats. Returns the parsed payload
 * or throws with a user-friendly error message.
 */
export function parseDnaJson(raw: unknown): DnaImportInput {
  if (!raw || typeof raw !== "object") {
    throw new Error("File doesn't look like a DNA export (not a JSON object).");
  }
  const obj = raw as Record<string, unknown>;

  if (isEmbark(obj)) return parseEmbark(obj);
  if (isWisdomPanel(obj)) return parseWisdomPanel(obj);

  // Fall back: try a generic shape (already normalized)
  const generic = dnaImportSchema.safeParse(obj);
  if (generic.success) return generic.data;

  throw new Error(
    "Unrecognized format. Use an Embark or Wisdom Panel JSON export, or see the format help below."
  );
}

/* ─── Embark ─────────────────────────────────────────────────────────── */

function isEmbark(obj: Record<string, unknown>): boolean {
  if (typeof obj.provider === "string" && obj.provider.toLowerCase().includes("embark"))
    return true;
  // Heuristic: Embark exports use `breeds` + `healthResults`
  return Array.isArray(obj.breeds) && Array.isArray(obj.healthResults);
}

function parseEmbark(obj: Record<string, unknown>): DnaImportInput {
  const breedComposition = asArray(obj.breeds).map((b) => {
    const r = b as Record<string, unknown>;
    return {
      name: String(r.name ?? r.breed ?? "Unknown"),
      percent: toNumber(r.percentage ?? r.percent ?? 0),
    };
  });

  const healthMarkers = asArray(obj.healthResults).map((h) => {
    const r = h as Record<string, unknown>;
    return {
      name: String(r.name ?? r.test ?? "Unknown"),
      status: String(r.status ?? r.result ?? "unknown"),
    };
  });

  const traits = asArray(obj.traits).map((t) => {
    const r = t as Record<string, unknown>;
    return {
      name: String(r.name ?? r.trait ?? "Unknown"),
      value: String(r.value ?? r.result ?? "unknown"),
    };
  });

  return dnaImportSchema.parse({
    provider: "Embark",
    breedComposition,
    healthMarkers,
    traits,
    coi: typeof obj.coi === "number" ? obj.coi : undefined,
    testedOn: typeof obj.testedOn === "string" ? obj.testedOn : undefined,
  });
}

/* ─── Wisdom Panel ───────────────────────────────────────────────────── */

function isWisdomPanel(obj: Record<string, unknown>): boolean {
  if (
    typeof obj.provider === "string" &&
    obj.provider.toLowerCase().includes("wisdom")
  )
    return true;
  return (
    Array.isArray(obj.breedComposition) &&
    (Array.isArray(obj.healthTests) || Array.isArray(obj.traitTests))
  );
}

function parseWisdomPanel(obj: Record<string, unknown>): DnaImportInput {
  const breedComposition = asArray(obj.breedComposition).map((b) => {
    const r = b as Record<string, unknown>;
    return {
      name: String(r.breed ?? r.name ?? "Unknown"),
      percent: toNumber(r.percent ?? r.percentage ?? 0),
    };
  });

  const healthMarkers = asArray(obj.healthTests).map((h) => {
    const r = h as Record<string, unknown>;
    return {
      name: String(r.test ?? r.name ?? "Unknown"),
      status: String(r.result ?? r.status ?? "unknown"),
    };
  });

  const traits = asArray(obj.traitTests).map((t) => {
    const r = t as Record<string, unknown>;
    return {
      name: String(r.trait ?? r.name ?? "Unknown"),
      value: String(r.result ?? r.value ?? "unknown"),
    };
  });

  const coiRaw = obj.inbreedingCoefficient ?? obj.coi;
  return dnaImportSchema.parse({
    provider: "Wisdom Panel",
    breedComposition,
    healthMarkers,
    traits,
    coi: typeof coiRaw === "number" ? coiRaw : undefined,
  });
}

/* ─── Helpers ────────────────────────────────────────────────────────── */

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}
function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace("%", ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}
