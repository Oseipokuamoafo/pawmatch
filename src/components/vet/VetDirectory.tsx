"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export interface VetDirectoryRow {
  id: string;
  name: string | null;
  practiceName: string | null;
  practiceAddress: string | null;
  licenseState: string | null;
  approvedAt: string | null;
  signatureCount: number;
}

export function VetDirectory({ vets }: { vets: VetDirectoryRow[] }) {
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("all");

  const states = useMemo(() => {
    const set = new Set<string>();
    for (const v of vets) if (v.licenseState) set.add(v.licenseState);
    return Array.from(set).sort();
  }, [vets]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vets.filter((v) => {
      if (stateFilter !== "all" && v.licenseState !== stateFilter) return false;
      if (!q) return true;
      return (
        (v.name?.toLowerCase().includes(q) ?? false) ||
        (v.practiceName?.toLowerCase().includes(q) ?? false) ||
        (v.practiceAddress?.toLowerCase().includes(q) ?? false) ||
        (v.licenseState?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [vets, query, stateFilter]);

  const totalSignatures = vets.reduce((sum, v) => sum + v.signatureCount, 0);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 md:py-14">
      <header className="mb-10 max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-terracotta">
          Trust · vet network
        </p>
        <h1
          className="mt-3 leading-[1.05] tracking-tight text-balance text-dark"
          style={{
            fontFamily: "var(--font-playfair, Georgia, serif)",
            fontWeight: 900,
            fontSize: "clamp(2.5rem, 6vw, 3.5rem)",
          }}
        >
          Verified veterinarians
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-dark-muted">
          Every vet on PawMatch has had their license verified by our admin
          team. They co-sign health records to turn owner self-reports into
          verified trust signals — what owners use to evaluate matches.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-dark-muted">
          <Stat label="Approved vets" value={vets.length} />
          <Stat label="Records signed" value={totalSignatures} />
          <Stat label="States represented" value={states.length} />
        </div>
      </header>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, practice, address, or state…"
          className="w-full max-w-md rounded-2xl border border-sand bg-surface px-4 py-2.5 text-sm text-dark outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/15"
        />
        {states.length > 0 && (
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="rounded-2xl border border-sand bg-surface px-4 py-2.5 text-sm text-dark outline-none focus:border-terracotta"
          >
            <option value="all">All states</option>
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="card py-12 text-center">
          <p className="font-serif text-lg font-bold text-dark">
            No matching vets.
          </p>
          <p className="mt-2 text-sm text-dark-muted">
            Try widening the search or clearing the state filter.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((v) => (
            <li key={v.id}>
              <VetCard vet={v} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function VetCard({ vet }: { vet: VetDirectoryRow }) {
  return (
    <Link
      href={`/vets/${vet.id}`}
      className="card-hover group block h-full rounded-3xl border border-sand bg-surface p-5 transition"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            className="truncate leading-tight text-dark"
            style={{
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontWeight: 800,
              fontSize: "1.25rem",
            }}
          >
            Dr. {vet.name ?? "—"}
          </p>
          {vet.practiceName && (
            <p className="mt-0.5 truncate text-sm text-dark-muted">
              {vet.practiceName}
            </p>
          )}
        </div>
        <SignatureBadge count={vet.signatureCount} />
      </div>

      {vet.practiceAddress && (
        <p className="mt-3 line-clamp-2 text-[12px] text-dark-muted">
          {vet.practiceAddress}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between gap-2 text-[11px] text-dark-muted">
        <span>
          {vet.licenseState ?? "—"}
          {vet.approvedAt && (
            <>
              {" · since "}
              {new Date(vet.approvedAt).toLocaleDateString(undefined, {
                month: "short",
                year: "numeric",
              })}
            </>
          )}
        </span>
        <span className="font-semibold text-terracotta transition group-hover:translate-x-0.5">
          View profile →
        </span>
      </div>
    </Link>
  );
}

function SignatureBadge({ count }: { count: number }) {
  const label = count === 0 ? "New" : `${count} signed`;
  return (
    <span
      className={
        count > 0
          ? "inline-flex shrink-0 items-center rounded-full bg-[#1D9E75]/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#1D9E75] dark:text-[#7FBF88]"
          : "inline-flex shrink-0 items-center rounded-full bg-sand px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-dark-muted"
      }
      title={
        count > 0
          ? `${count} health record${count === 1 ? "" : "s"} verified by this vet`
          : "Newly approved — no signatures yet"
      }
    >
      {label}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="font-serif text-2xl font-extrabold text-dark">
        {value}
      </span>
      <span className="text-[11px] uppercase tracking-wider text-dark-muted">
        {label}
      </span>
    </span>
  );
}
