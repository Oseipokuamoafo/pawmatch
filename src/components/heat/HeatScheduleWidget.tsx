import Link from "next/link";

import { formatRelativeDays } from "@/lib/heat";

export interface HeatScheduleEntry {
  petId: string;
  petName: string;
  petPhotoUrl: string | null;
  species: "DOG" | "CAT";
  /** Whether the pet is currently in heat. */
  isActive: boolean;
  /** ISO string — null if there's no projection yet. */
  nextPredictedStart: string | null;
  daysUntilNext: number | null;
  fertileWindow: { start: string; end: string } | null;
}

/**
 * Dashboard widget surfacing every female pet's upcoming or current
 * heat. Renders nothing when there's no female pet with any cycle
 * history (so it stays invisible until the user has logged a cycle).
 */
export function HeatScheduleWidget({ entries }: { entries: HeatScheduleEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <section className="card !p-0 overflow-hidden">
      <header className="flex items-baseline justify-between border-b border-sand px-5 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta">
            Reproductive schedule
          </p>
          <h2
            className="mt-1 leading-tight text-dark"
            style={{
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontWeight: 900,
              fontSize: "1.25rem",
            }}
          >
            Heat forecast
          </h2>
        </div>
        <p className="text-[11px] text-dark-muted">
          {entries.length} pet{entries.length === 1 ? "" : "s"}
        </p>
      </header>

      <ul className="divide-y divide-sand">
        {entries.map((e) => (
          <li key={e.petId}>
            <Link
              href={`/dashboard/pets/${e.petId}#heat-cycles`}
              className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-cream/60"
            >
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-sand">
                {e.petPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.petPhotoUrl} alt={e.petName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg">
                    {e.species === "CAT" ? "🐈" : "🐕"}
                  </div>
                )}
                {e.isActive && (
                  <span
                    aria-label="In heat"
                    className="absolute -right-0.5 -top-0.5 inline-block h-3 w-3 rounded-full bg-terracotta ring-2 ring-cream dark:ring-[var(--color-cream)]"
                    style={{
                      animation: "hw-pulse 1.8s ease-in-out infinite",
                    }}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-dark">
                  {e.petName}
                </p>
                <p className="mt-0.5 text-[12px] text-dark-muted">
                  <StatusLine entry={e} />
                </p>
              </div>
              <span
                className={`shrink-0 rounded-pill px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                  e.isActive
                    ? "bg-terracotta text-white"
                    : e.daysUntilNext != null && e.daysUntilNext <= 14
                      ? "bg-[#E89A2A]/20 text-[#B0731A] dark:bg-[#E89A2A]/30 dark:text-[#E89A2A]"
                      : "bg-sage/20 text-[#1D9E75] dark:text-[#7FBF88]"
                }`}
              >
                {e.isActive
                  ? "In heat"
                  : e.daysUntilNext != null && e.daysUntilNext <= 14
                    ? "Soon"
                    : "Tracked"}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <style>{`
        @keyframes hw-pulse {
          0%, 100% { transform: scale(1);   opacity: 1; }
          50%      { transform: scale(1.4); opacity: 0.55; }
        }
      `}</style>
    </section>
  );
}

function StatusLine({ entry }: { entry: HeatScheduleEntry }) {
  if (entry.isActive && entry.fertileWindow) {
    return (
      <>
        Fertile {fmt(new Date(entry.fertileWindow.start))}–
        {fmt(new Date(entry.fertileWindow.end))}
      </>
    );
  }
  if (entry.isActive) return <>Currently in heat</>;
  if (entry.daysUntilNext != null && entry.nextPredictedStart) {
    return (
      <>
        Next heat {formatRelativeDays(entry.daysUntilNext)}{" "}
        <span className="text-dark-muted/70">
          · {fmt(new Date(entry.nextPredictedStart))}
        </span>
      </>
    );
  }
  return <>Tracking — log another cycle to refine prediction.</>;
}

function fmt(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
