import type { LitterPrediction, GenePrediction } from "@/lib/punnett";

import { PunnettGrid } from "./PunnettGrid";
import { TraitDistribution } from "./TraitDistribution";

interface PredictPanelProps {
  prediction: LitterPrediction;
  petAName: string;
  petBName: string;
}

/**
 * Full prediction surface. Three sections, in order of "what matters
 * most for a breeder decision":
 *   1. Risk summary (any gene that could produce an affected offspring)
 *   2. Per-gene predictions (Punnett + distribution)
 *   3. Empty state when there's nothing in common to predict
 */
export function PredictPanel({
  prediction,
  petAName,
  petBName,
}: PredictPanelProps) {
  if (prediction.genes.length === 0) {
    return <EmptyState petAName={petAName} petBName={petBName} />;
  }

  const riskTone =
    prediction.riskScore >= 25
      ? { bg: "rgba(201,75,42,0.10)", border: "rgba(201,75,42,0.30)", color: "#C94B2A" }
      : prediction.riskScore > 0
        ? { bg: "rgba(232,154,42,0.12)", border: "rgba(232,154,42,0.30)", color: "#B0731A" }
        : { bg: "rgba(29,158,117,0.10)", border: "rgba(29,158,117,0.30)", color: "#1D9E75" };

  return (
    <div className="space-y-8">
      {/* ── Risk summary ─────────────────────────────────────────── */}
      <section
        className="rounded-3xl border p-6"
        style={{ background: riskTone.bg, borderColor: riskTone.border }}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: riskTone.color }}
            >
              Predicted genetic risk
            </p>
            <p
              className="mt-1 leading-none text-dark"
              style={{
                fontFamily: "var(--font-playfair, Georgia, serif)",
                fontWeight: 900,
                fontSize: "clamp(2rem, 4vw, 2.5rem)",
              }}
            >
              {prediction.riskScore}
              <span className="ml-1 text-base font-normal text-dark-muted">
                / 100
              </span>
            </p>
            <p className="mt-2 text-sm text-dark-muted">
              {prediction.riskGenes.length === 0
                ? "No shared recessive risk detected across compared genes."
                : `${prediction.riskGenes.length} gene${prediction.riskGenes.length === 1 ? "" : "s"} with shared recessive risk.`}
            </p>
          </div>
          {prediction.riskGenes.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {prediction.riskGenes.map((g) => (
                <li
                  key={g.name}
                  className="inline-flex items-center gap-1 rounded-full bg-cream px-2 py-0.5 text-[11px] font-semibold"
                  style={{ color: riskTone.color }}
                  title={`${g.affectedProb.toFixed(2)} affected probability`}
                >
                  ⚠ {g.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ── Per-gene predictions ────────────────────────────────── */}
      <section>
        <header className="mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-terracotta">
            Per-gene predictions
          </p>
          <h2
            className="mt-2 leading-tight text-dark"
            style={{
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontWeight: 900,
              fontSize: "1.75rem",
            }}
          >
            What this litter could carry
          </h2>
          <p className="mt-1 text-sm text-dark-muted">
            Mendelian probabilities only — assumes a single-gene autosomal
            pattern with the dominant allele healthy.
          </p>
        </header>

        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {prediction.genes.map((g) => (
            <li key={g.name}>
              <GeneCard gene={g} />
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs text-dark-muted text-balance">
        These probabilities are derived from each pet&apos;s DNA-verified
        and self-reported traits. They do not account for incomplete
        penetrance, polygenic interactions, or modifier loci. Use a vet
        and a certified geneticist for any high-stakes pairing decision.
      </p>
    </div>
  );
}

/* ─── Per-gene card ──────────────────────────────────────────────────── */

function GeneCard({ gene }: { gene: GenePrediction }) {
  const accent =
    gene.severity === "danger"
      ? "#C94B2A"
      : gene.severity === "warn"
        ? "#B0731A"
        : "#1D9E75";
  return (
    <article className="card flex flex-col gap-4">
      <header className="flex items-baseline justify-between gap-3">
        <h3
          className="leading-tight text-dark"
          style={{
            fontFamily: "var(--font-playfair, Georgia, serif)",
            fontWeight: 700,
            fontSize: "1.25rem",
          }}
        >
          {gene.name}
          {gene.isHealth && (
            <span className="ml-2 inline-flex items-center rounded-full bg-sand px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-dark-muted align-middle">
              Health
            </span>
          )}
        </h3>
        <SeverityChip severity={gene.severity} accent={accent} />
      </header>

      <div className="grid grid-cols-[auto_1fr] gap-5 items-start">
        <PunnettGrid gene={gene} />
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-dark-muted">
              Offspring distribution
            </p>
            <div className="mt-2">
              <TraitDistribution gene={gene} />
            </div>
          </div>
          {gene.severity !== "ok" && (
            <p
              className="text-xs leading-relaxed"
              style={{ color: accent }}
            >
              <strong>Note:</strong>{" "}
              {gene.severity === "danger"
                ? `${(gene.affectedProb * 100).toFixed(0)}% of offspring are predicted to be affected. Consider an outcross or testing each parent before pairing.`
                : `${(gene.carrierProb * 100).toFixed(0)}% carrier rate — manageable, but downstream pairings should screen for this marker.`}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function SeverityChip({
  severity,
  accent,
}: {
  severity: GenePrediction["severity"];
  accent: string;
}) {
  const label =
    severity === "danger"
      ? "Action needed"
      : severity === "warn"
        ? "Watch"
        : "Clear";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
      style={{ background: `${accent}1F`, color: accent }}
    >
      {severity === "danger" ? "⚠" : severity === "warn" ? "◆" : "✓"} {label}
    </span>
  );
}

/* ─── Empty state ────────────────────────────────────────────────────── */

function EmptyState({
  petAName,
  petBName,
}: {
  petAName: string;
  petBName: string;
}) {
  return (
    <div className="card flex flex-col items-center py-12 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-sand text-2xl">
        🧬
      </div>
      <p
        className="text-xl font-bold text-dark"
        style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}
      >
        No overlapping genes to predict yet
      </p>
      <p className="mt-2 max-w-md text-sm text-dark-muted leading-relaxed">
        <strong>{petAName}</strong> and <strong>{petBName}</strong> don&apos;t
        share any DNA-verified or hand-entered traits we can compare. Import
        a DNA test for either pet to unlock per-gene predictions.
      </p>
    </div>
  );
}
