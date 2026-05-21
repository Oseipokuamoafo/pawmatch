import type { GenePrediction } from "@/lib/punnett";

/**
 * Classic 2×2 Punnett square. Cells colour by zygosity:
 *   - homozygous-dominant → sage  (healthy / clear)
 *   - heterozygous        → amber (carrier)
 *   - homozygous-recessive → terracotta (affected)
 */
export function PunnettGrid({ gene }: { gene: GenePrediction }) {
  const a = gene.parentA.genotype;
  const b = gene.parentB.genotype;
  const aA = a[0];
  const aB = a[1];
  const bA = b[0];
  const bB = b[1];

  const cells = [
    crossCell(aA, bA, gene),
    crossCell(aA, bB, gene),
    crossCell(aB, bA, gene),
    crossCell(aB, bB, gene),
  ];

  return (
    <div className="inline-block">
      <table className="border-separate border-spacing-1">
        <thead>
          <tr>
            <th />
            <ColHead label={bA} />
            <ColHead label={bB} />
          </tr>
        </thead>
        <tbody>
          <tr>
            <RowHead label={aA} />
            <Cell {...cells[0]} />
            <Cell {...cells[1]} />
          </tr>
          <tr>
            <RowHead label={aB} />
            <Cell {...cells[2]} />
            <Cell {...cells[3]} />
          </tr>
        </tbody>
      </table>
      <p className="mt-1.5 text-[10px] text-dark-muted">
        Parents: <strong>{gene.parentA.genotype}</strong> ({gene.parentA.label})
        {" × "}
        <strong>{gene.parentB.genotype}</strong> ({gene.parentB.label})
      </p>
    </div>
  );
}

/* ─── Cells ──────────────────────────────────────────────────────────── */

function crossCell(a: string, b: string, gene: GenePrediction) {
  const genotype = normalise(a, b);
  const outcome = gene.outcomes.find((o) => o.genotype === genotype);
  return {
    label: genotype,
    zygosity: outcome?.zygosity ?? "heterozygous",
    prob: outcome?.prob ?? 0,
  };
}

function normalise(a: string, b: string) {
  const isAUpper = a === a.toUpperCase() && a !== a.toLowerCase();
  return isAUpper ? `${a}${b}` : `${b}${a}`;
}

function Cell({
  label,
  zygosity,
  prob,
}: {
  label: string;
  zygosity: string;
  prob: number;
}) {
  const tone =
    zygosity === "homozygous-dominant"
      ? { bg: "rgba(29,158,117,0.18)", color: "#1D9E75" }
      : zygosity === "homozygous-recessive"
        ? { bg: "rgba(201,75,42,0.18)", color: "#C94B2A" }
        : { bg: "rgba(232,154,42,0.18)", color: "#B0731A" };

  return (
    <td
      className="h-16 w-16 rounded-card text-center align-middle"
      style={{ background: tone.bg, color: tone.color, minWidth: 64 }}
    >
      <div className="font-bold leading-none" style={{ fontFamily: "var(--font-playfair, Georgia, serif)", fontSize: "1.125rem" }}>
        {label}
      </div>
      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider opacity-80">
        {(prob * 100).toFixed(0)}%
      </div>
    </td>
  );
}

function ColHead({ label }: { label: string }) {
  return (
    <th className="w-16 pb-1 text-[10px] font-semibold uppercase tracking-wider text-dark-muted">
      {label}
    </th>
  );
}

function RowHead({ label }: { label: string }) {
  return (
    <th className="pr-2 align-middle text-[10px] font-semibold uppercase tracking-wider text-dark-muted">
      {label}
    </th>
  );
}
