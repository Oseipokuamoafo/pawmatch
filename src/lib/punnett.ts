/**
 * Cross-breed trait predictor — Mendelian Punnett-square engine.
 *
 * Two layers:
 *   1. parseGenotype/gameteFrequencies/combineGenotypes — pure math.
 *   2. predictLitter — pulls DNA-verified health/trait PetTraits from
 *      two pets, normalises them to genotypes, and produces a per-gene
 *      offspring distribution plus aggregate health-risk callouts.
 *
 * Real DNA exports report health markers as "clear", "carrier", or
 * "at-risk" / "affected". We map those to {AA, Aa, aa} with dominant
 * (capital) = healthy by convention. For other Mendelian-trait values
 * (e.g. coat dilution) callers can pass an explicit genotype like "Bb".
 */

import type { PetTrait } from "@/generated/prisma";

/* ─── Public types ──────────────────────────────────────────────────── */

export type Allele = string;            // single character, e.g. "A" or "a"
export type Genotype = `${Allele}${Allele}`;

export type Zygosity = "homozygous-dominant" | "heterozygous" | "homozygous-recessive";

export interface OffspringGenotype {
  genotype: Genotype;
  zygosity: Zygosity;
  prob: number;     // 0–1
}

export interface GenePrediction {
  /** Human-readable marker name (e.g. "Hyperuricosuria (HUU)"). */
  name: string;
  /** Phenotype/status label for parents (e.g. "carrier"). */
  parentA: { label: string; genotype: Genotype };
  parentB: { label: string; genotype: Genotype };
  outcomes: OffspringGenotype[];
  /**
   * Probability the offspring is affected (homozygous recessive).
   * For non-health markers this is just the homozygous-recessive
   * probability and may not carry medical significance.
   */
  affectedProb: number;
  /** Probability the offspring is a carrier (heterozygous). */
  carrierProb: number;
  /**
   * Severity class — surfaces as the UI accent on the result card.
   * "danger" = >25% affected, "warn" = >0% affected but ≤25%, "ok" = 0.
   */
  severity: "ok" | "warn" | "danger";
  /** Whether this gene is a health marker (drives the risk summary). */
  isHealth: boolean;
}

export interface LitterPrediction {
  petAId: string;
  petBId: string;
  genes: GenePrediction[];
  /** Genes shared by both pets that produce a non-zero affected risk. */
  riskGenes: GenePrediction[];
  /** Summary risk number (0–100, higher = riskier). Heuristic. */
  riskScore: number;
}

/* ─── Genotype math ────────────────────────────────────────────────── */

export function parseGenotype(value: string): Genotype | null {
  const v = value.trim();
  // Strip parenthetical annotations that DNA labs commonly append
  // ("Carrier (one copy)", "Affected (two copies)", "Clear / N/N",
  // "Carrier — heterozygous", etc.). Match the leading status keyword.
  const lowered = v.toLowerCase();
  const head = lowered.split(/[\s(/[—–-]/)[0]?.trim() ?? "";

  // Direct genotype form like "Aa" / "BB" / "bb" / "Tt"
  if (/^[A-Za-z]{2}$/.test(v)) {
    return normaliseGenotype(v[0], v[1]);
  }

  // Health-status convention — match the leading word so suffixes like
  // "(one copy)" or "/ N" don't break the lookup.
  if (/^(clear|normal|unaffected|negative|n\/n)$/.test(head)) return "AA";
  if (/^(carrier|heterozygous|het)$/.test(head)) return "Aa";
  if (/^(at[-\s]?risk|affected|positive|homozygous)$/.test(head)) return "aa";

  // Fallback: also try the full string for the at-risk multi-word case.
  if (/^at[-\s]?risk\b/.test(lowered)) return "aa";

  return null;
}

export function gameteFrequencies(geno: Genotype): { allele: Allele; prob: number }[] {
  const [a1, a2] = [geno[0], geno[1]];
  if (a1 === a2) return [{ allele: a1, prob: 1 }];
  return [
    { allele: a1, prob: 0.5 },
    { allele: a2, prob: 0.5 },
  ];
}

export function combineGenotypes(a: Genotype, b: Genotype): OffspringGenotype[] {
  const gA = gameteFrequencies(a);
  const gB = gameteFrequencies(b);
  const buckets = new Map<Genotype, number>();
  for (const x of gA) {
    for (const y of gB) {
      const g = normaliseGenotype(x.allele, y.allele);
      buckets.set(g, (buckets.get(g) ?? 0) + x.prob * y.prob);
    }
  }
  return [...buckets.entries()]
    .map<OffspringGenotype>(([genotype, prob]) => ({
      genotype,
      prob,
      zygosity: zygosityOf(genotype),
    }))
    .sort((x, y) => y.prob - x.prob);
}

export function zygosityOf(g: Genotype): Zygosity {
  const [a, b] = [g[0], g[1]];
  if (a === b) {
    return isDominant(a) ? "homozygous-dominant" : "homozygous-recessive";
  }
  return "heterozygous";
}

/* ─── Higher-level prediction ───────────────────────────────────────── */

export interface PredictPet {
  id: string;
  traits: Pick<PetTrait, "traitName" | "traitValue" | "source">[];
}

/**
 * Run Mendelian predictions for every gene that appears in BOTH parents'
 * trait lists.
 *
 * Genes are matched by a normalised name (lowercase, "(health)" suffix
 * stripped) so the DNA-import convention `<Marker> (health)` lines up
 * with hand-entered traits.
 *
 * Returns an empty prediction set if no overlapping genes have parseable
 * genotypes — the UI surfaces a friendly "import DNA to see predictions"
 * message in that case.
 */
export function predictLitter(petA: PredictPet, petB: PredictPet): LitterPrediction {
  const byName = (traits: PredictPet["traits"]) => {
    const m = new Map<string, { label: string; geno: Genotype; isHealth: boolean }>();
    for (const t of traits) {
      const normalised = normaliseTraitName(t.traitName);
      const geno = parseGenotype(t.traitValue);
      if (!geno) continue;
      const isHealth = /\(health\)|recessive/i.test(t.traitName);
      // Prefer DNA-verified rows when duplicates exist
      const existing = m.get(normalised);
      const promote =
        !existing || (t.source === "DNA_VERIFIED" && existing.label === t.traitValue);
      if (!existing || promote) {
        m.set(normalised, { label: t.traitValue, geno, isHealth });
      }
    }
    return m;
  };

  const aMap = byName(petA.traits);
  const bMap = byName(petB.traits);

  const genes: GenePrediction[] = [];
  for (const [normalised, a] of aMap) {
    const b = bMap.get(normalised);
    if (!b) continue;
    const outcomes = combineGenotypes(a.geno, b.geno);
    const affectedProb = sumProb(outcomes, "homozygous-recessive");
    const carrierProb = sumProb(outcomes, "heterozygous");
    const severity: GenePrediction["severity"] =
      affectedProb >= 0.25 ? "danger" : affectedProb > 0 ? "warn" : "ok";
    genes.push({
      name: prettifyTraitName(normalised),
      parentA: { label: a.label, genotype: a.geno },
      parentB: { label: b.label, genotype: b.geno },
      outcomes,
      affectedProb,
      carrierProb,
      severity,
      isHealth: a.isHealth || b.isHealth,
    });
  }

  genes.sort((x, y) => {
    // Severity desc, then risk desc, then name asc
    const sevWeight = { danger: 2, warn: 1, ok: 0 } as const;
    const ds = sevWeight[y.severity] - sevWeight[x.severity];
    if (ds !== 0) return ds;
    if (y.affectedProb !== x.affectedProb) return y.affectedProb - x.affectedProb;
    return x.name.localeCompare(y.name);
  });

  const riskGenes = genes.filter((g) => g.affectedProb > 0 && g.isHealth);
  const riskScore = Math.min(
    100,
    Math.round(
      riskGenes.reduce(
        (acc, g) => acc + g.affectedProb * 100 * (g.severity === "danger" ? 1.5 : 1),
        0
      )
    )
  );

  return { petAId: petA.id, petBId: petB.id, genes, riskGenes, riskScore };
}

/* ─── Internals ────────────────────────────────────────────────────── */

function normaliseGenotype(a: Allele, b: Allele): Genotype {
  // Keep uppercase first so "Aa" === "aA" canonically.
  const dominantFirst = isDominant(a) ? `${a}${b}` : `${b}${a}`;
  return dominantFirst as Genotype;
}

function isDominant(allele: Allele): boolean {
  return allele === allele.toUpperCase() && allele !== allele.toLowerCase();
}

function sumProb(outcomes: OffspringGenotype[], z: Zygosity): number {
  return outcomes.filter((o) => o.zygosity === z).reduce((s, o) => s + o.prob, 0);
}

function normaliseTraitName(raw: string): string {
  return raw
    .replace(/\s*\(health\)\s*$/i, "")
    .replace(/\s*\(genotype\)\s*$/i, "")
    .trim()
    .toLowerCase();
}

function prettifyTraitName(normalised: string): string {
  // Title-case but keep ALL-CAPS acronyms intact (HUU, MDR1, PRA, etc.)
  return normalised
    .split(/\s+/)
    .map((word) => {
      if (/^[a-z]+\d*$/i.test(word) && word.length <= 5 && /[a-z]/i.test(word)) {
        // Short tokens — uppercase if they look like acronyms (HUU, DM, PRA)
        if (word.length <= 4) return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ")
    .replace(/\(([a-z]+)\)/gi, (_m, inner: string) => `(${inner.toUpperCase()})`);
}
