import type { GenePrediction } from "@/lib/punnett";

/**
 * Stacked horizontal bar showing the % of offspring that fall into each
 * outcome (clear / carrier / affected). Same colour vocabulary as the
 * PunnettGrid so the two read as one chart.
 */
export function TraitDistribution({ gene }: { gene: GenePrediction }) {
  const clear = sumByZygosity(gene, "homozygous-dominant");
  const carrier = sumByZygosity(gene, "heterozygous");
  const affected = sumByZygosity(gene, "homozygous-recessive");

  const stops: { value: number; bg: string; color: string; label: string }[] = [];
  if (clear > 0) stops.push({ value: clear, bg: "#1D9E75", color: "#fff", label: "Clear" });
  if (carrier > 0)
    stops.push({ value: carrier, bg: "#E89A2A", color: "#fff", label: "Carrier" });
  if (affected > 0)
    stops.push({ value: affected, bg: "#C94B2A", color: "#fff", label: "Affected" });

  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full">
        {stops.map((s, i) => (
          <span
            key={i}
            title={`${s.label}: ${(s.value * 100).toFixed(0)}%`}
            style={{
              width: `${s.value * 100}%`,
              background: s.bg,
            }}
          />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-3 text-[11px]">
        {stops.map((s, i) => (
          <li key={i} className="inline-flex items-center gap-1.5">
            <span
              className="block h-2 w-2 rounded-full"
              style={{ background: s.bg }}
              aria-hidden="true"
            />
            <span className="font-semibold text-dark">
              {(s.value * 100).toFixed(0)}%
            </span>
            <span className="text-dark-muted">{s.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function sumByZygosity(g: GenePrediction, z: string): number {
  return g.outcomes
    .filter((o) => o.zygosity === z)
    .reduce((s, o) => s + o.prob, 0);
}
