import Link from "next/link";

import type { DashboardStats } from "@/lib/dashboard-stats";

export function StatsRow({ stats }: { stats: DashboardStats }) {
  const verifiedPct = Math.round(stats.verifiedRatio * 100);

  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-4">
      <Stat
        label="Pets"
        value={stats.petCount}
        hint={stats.petCount === 1 ? "in your registry" : "in your registry"}
      />
      <Stat
        label="New matches"
        value={stats.newMatches}
        hint={
          stats.newMatches > 0
            ? "pending your response"
            : "all caught up"
        }
        href={stats.newMatches > 0 ? "/dashboard/matches?tab=incoming" : undefined}
        accent={stats.newMatches > 0}
      />
      <Stat
        label="Avg health"
        value={`${stats.avgHealthScore}`}
        suffix=" / 100"
        hint="trust score"
      />
      <Stat
        label="Live verified"
        value={`${verifiedPct}%`}
        hint={`${stats.verifiedCount} of ${stats.petCount || 0} pets`}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  suffix,
  hint,
  href,
  accent = false,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  hint?: string;
  href?: string;
  accent?: boolean;
}) {
  const body = (
    <div
      className="card relative h-full overflow-hidden p-5"
      style={{
        background: accent ? "var(--color-surface)" : "var(--color-surface)",
      }}
    >
      {accent && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-8 -right-8 h-28 w-28 rounded-full"
          style={{ background: "rgba(201,75,42,0.10)" }}
        />
      )}
      <p
        className={`relative text-[11px] font-semibold uppercase tracking-[0.18em] ${
          accent
            ? "text-[#C94B2A]"
            : "text-[#3D2A1A] dark:text-[#C4A882]"
        }`}
      >
        {label}
      </p>
      <p
        className="relative mt-3 leading-none text-dark"
        style={{
          fontFamily: "var(--font-playfair, Georgia, serif)",
          fontWeight: 900,
          fontSize: "clamp(2rem, 4vw, 2.5rem)",
        }}
      >
        {value}
        {suffix && (
          <span className="text-base font-normal text-dark-muted">
            {suffix}
          </span>
        )}
      </p>
      {hint && (
        <p className="relative mt-1.5 text-xs text-dark-muted">{hint}</p>
      )}
    </div>
  );

  return href ? <Link href={href}>{body}</Link> : body;
}
