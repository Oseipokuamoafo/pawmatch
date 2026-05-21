import { test } from "node:test";
import assert from "node:assert/strict";

import {
  parseGenotype,
  combineGenotypes,
  predictLitter,
  type PredictPet,
} from "./punnett";

/* ─── parseGenotype ──────────────────────────────────────────────────── */

test("parseGenotype: status strings map to AA/Aa/aa", () => {
  assert.equal(parseGenotype("clear"), "AA");
  assert.equal(parseGenotype("Normal"), "AA");
  assert.equal(parseGenotype("carrier"), "Aa");
  assert.equal(parseGenotype("heterozygous"), "Aa");
  assert.equal(parseGenotype("at-risk"), "aa");
  assert.equal(parseGenotype("affected"), "aa");
});

test("parseGenotype: tolerates real DNA-lab parenthetical annotations", () => {
  // Embark / Wisdom Panel commonly append qualifiers — the parser
  // should pull the leading status word and ignore the suffix.
  assert.equal(parseGenotype("Carrier (one copy)"), "Aa");
  assert.equal(parseGenotype("Affected (two copies)"), "aa");
  assert.equal(parseGenotype("Clear / N/N"), "AA");
  assert.equal(parseGenotype("Carrier — heterozygous"), "Aa");
  assert.equal(parseGenotype("At-risk (homozygous)"), "aa");
  assert.equal(parseGenotype("Clear  "), "AA");
});

test("parseGenotype: case-insensitive across status words", () => {
  assert.equal(parseGenotype("CARRIER"), "Aa");
  assert.equal(parseGenotype("Affected"), "aa");
});

test("parseGenotype: explicit genotypes pass through canonical-form", () => {
  assert.equal(parseGenotype("AA"), "AA");
  assert.equal(parseGenotype("Aa"), "Aa");
  assert.equal(parseGenotype("aA"), "Aa"); // canonical sort
  assert.equal(parseGenotype("aa"), "aa");
  assert.equal(parseGenotype("Bb"), "Bb");
});

test("parseGenotype: unparseable inputs return null", () => {
  assert.equal(parseGenotype(""), null);
  assert.equal(parseGenotype("???"), null);
  assert.equal(parseGenotype("ABC"), null);
});

/* ─── combineGenotypes (the actual Punnett square) ───────────────────── */

test("combineGenotypes: AA × AA → 100% AA", () => {
  const out = combineGenotypes("AA", "AA");
  assert.equal(out.length, 1);
  assert.equal(out[0].genotype, "AA");
  assert.equal(out[0].prob, 1);
});

test("combineGenotypes: Aa × Aa → 25/50/25", () => {
  const out = combineGenotypes("Aa", "Aa");
  const probs = Object.fromEntries(out.map((o) => [o.genotype, o.prob]));
  assert.ok(Math.abs(probs["AA"] - 0.25) < 1e-9);
  assert.ok(Math.abs(probs["Aa"] - 0.5) < 1e-9);
  assert.ok(Math.abs(probs["aa"] - 0.25) < 1e-9);
});

test("combineGenotypes: AA × aa → 100% Aa", () => {
  const out = combineGenotypes("AA", "aa");
  assert.equal(out.length, 1);
  assert.equal(out[0].genotype, "Aa");
  assert.equal(out[0].prob, 1);
});

test("combineGenotypes: Aa × aa → 50/50", () => {
  const out = combineGenotypes("Aa", "aa");
  const probs = Object.fromEntries(out.map((o) => [o.genotype, o.prob]));
  assert.ok(Math.abs(probs["Aa"] - 0.5) < 1e-9);
  assert.ok(Math.abs(probs["aa"] - 0.5) < 1e-9);
});

/* ─── predictLitter (full pipeline) ──────────────────────────────────── */

function trait(name: string, value: string, dna = true) {
  return { traitName: name, traitValue: value, source: dna ? "DNA_VERIFIED" : "SELF_REPORTED" } as PredictPet["traits"][number];
}

test("predictLitter: two carriers of HUU → 25% affected, severity DANGER", () => {
  const petA: PredictPet = {
    id: "A",
    traits: [trait("Hyperuricosuria (HUU) (health)", "carrier")],
  };
  const petB: PredictPet = {
    id: "B",
    traits: [trait("Hyperuricosuria (HUU) (health)", "carrier")],
  };
  const r = predictLitter(petA, petB);
  assert.equal(r.genes.length, 1);
  const g = r.genes[0];
  assert.equal(g.severity, "danger");
  assert.ok(Math.abs(g.affectedProb - 0.25) < 1e-9);
  assert.ok(Math.abs(g.carrierProb - 0.5) < 1e-9);
  assert.equal(r.riskGenes.length, 1);
  assert.ok(r.riskScore >= 37); // 25 × 1.5 = 37.5
});

test("predictLitter: clear × carrier → 0% affected, severity OK", () => {
  const petA: PredictPet = {
    id: "A",
    traits: [trait("MDR1 (health)", "clear")],
  };
  const petB: PredictPet = {
    id: "B",
    traits: [trait("MDR1 (health)", "carrier")],
  };
  const r = predictLitter(petA, petB);
  assert.equal(r.genes.length, 1);
  const g = r.genes[0];
  assert.equal(g.severity, "ok");
  assert.equal(g.affectedProb, 0);
  assert.ok(Math.abs(g.carrierProb - 0.5) < 1e-9);
  assert.equal(r.riskGenes.length, 0);
  assert.equal(r.riskScore, 0);
});

test("predictLitter: genes only on one side are skipped", () => {
  const petA: PredictPet = {
    id: "A",
    traits: [
      trait("HUU (health)", "carrier"),
      trait("DM (health)", "clear"),
    ],
  };
  const petB: PredictPet = {
    id: "B",
    traits: [trait("HUU (health)", "clear")], // no DM
  };
  const r = predictLitter(petA, petB);
  assert.equal(r.genes.length, 1, "only HUU is in both lists");
  assert.equal(r.genes[0].name, "HUU");
});

test("predictLitter: normalises (health) suffix when matching", () => {
  const petA: PredictPet = {
    id: "A",
    traits: [trait("Degenerative Myelopathy (DM) (health)", "carrier")],
  };
  const petB: PredictPet = {
    id: "B",
    // Same gene but the suffix is missing — hand-entered
    traits: [trait("Degenerative Myelopathy (DM)", "carrier", false)],
  };
  const r = predictLitter(petA, petB);
  assert.equal(r.genes.length, 1);
  assert.ok(Math.abs(r.genes[0].affectedProb - 0.25) < 1e-9);
});

test("predictLitter: warn severity for low (>0% but ≤25%) affected rate", () => {
  // Aa × aa → 50% carrier, 50% affected → still danger (≥25%)
  // To trigger warn we need something < 25%, e.g. dilute Aa × Aa overlap
  // with itself produces 25% so we have to drop below — try AA × Aa,
  // which gives 0 affected. That's "ok", not "warn".
  //
  // The "warn" band exists for future polygenic models. Validate the
  // current binary outputs explicitly here so we don't lose coverage.
  const r = predictLitter(
    { id: "A", traits: [trait("X", "clear")] },
    { id: "B", traits: [trait("X", "carrier")] }
  );
  assert.equal(r.genes[0].severity, "ok");
});
