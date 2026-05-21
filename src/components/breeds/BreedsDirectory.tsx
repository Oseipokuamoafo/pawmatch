"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Species } from "@/generated/prisma";

export interface BreedCardData {
  id: string;
  slug: string;
  name: string;
  species: Species;
  group: string | null;
  averageCOI: number | null;
  heroImageUrl: string | null;
  temperament: string[];
  lifespanMinYears: number | null;
  lifespanMaxYears: number | null;
  petCount: number;
}

type Filter = "all" | "dogs" | "cats";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All breeds" },
  { id: "dogs", label: "Dogs" },
  { id: "cats", label: "Cats" },
];

export function BreedsDirectory({ breeds }: { breeds: BreedCardData[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return breeds.filter((b) => {
      if (filter === "dogs" && b.species !== "DOG") return false;
      if (filter === "cats" && b.species !== "CAT") return false;
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        (b.group?.toLowerCase().includes(q) ?? false) ||
        b.temperament.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [breeds, filter, query]);

  const dogCount = breeds.filter((b) => b.species === "DOG").length;
  const catCount = breeds.filter((b) => b.species === "CAT").length;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 md:py-14">
      <header className="mb-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-terracotta">
          Breed directory
        </p>
        <h1
          className="mt-3 leading-[1.05] tracking-tight text-balance text-dark"
          style={{
            fontFamily: "var(--font-playfair, Georgia, serif)",
            fontWeight: 900,
            fontSize: "clamp(2.5rem, 6vw, 3.5rem)",
          }}
        >
          Every breed, traced.
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-dark-muted">
          {breeds.length} breeds curated for responsible breeders — average COI ranges,
          common recessive markers, conservative breeding-age floors, and the pets on
          PawMatch carrying each lineage.
        </p>
      </header>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`rounded-pill px-4 py-1.5 text-sm font-semibold transition-all ${
                  active
                    ? "bg-terracotta text-white shadow-[0_4px_14px_-6px_rgba(201,75,42,0.4)]"
                    : "bg-sand/60 text-dark hover:bg-sand"
                }`}
              >
                {f.label}
                <span className="ml-1.5 text-[10px] opacity-70">
                  {f.id === "all" ? breeds.length : f.id === "dogs" ? dogCount : catCount}
                </span>
              </button>
            );
          })}
        </div>

        <label className="relative flex w-full max-w-sm items-center">
          <SearchIcon className="absolute left-3 h-4 w-4 text-dark-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, group, or temperament…"
            className="w-full rounded-pill border border-sand bg-cream/60 py-2 pl-9 pr-4 text-sm text-dark outline-none transition-[border-color,background] duration-150 focus:border-terracotta focus:bg-surface focus:ring-2 focus:ring-terracotta/15 dark:placeholder-[#7A5C48]"
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center py-16 text-center">
          <p className="text-2xl">🐾</p>
          <p className="mt-3 font-serif text-xl font-bold text-dark">
            No breeds match &ldquo;{query}&rdquo;
          </p>
          <p className="mt-2 max-w-sm text-sm text-dark-muted leading-relaxed">
            Try a different keyword, or switch back to All breeds.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((b) => (
            <li key={b.id}>
              <BreedCard breed={b} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BreedCard({ breed }: { breed: BreedCardData }) {
  return (
    <Link
      href={`/breeds/${breed.slug}`}
      className="card card-hover group relative flex flex-col overflow-hidden !p-0"
    >
      <div className="relative h-44 w-full overflow-hidden bg-sand">
        {breed.heroImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={breed.heroImageUrl}
            alt={breed.name}
            className="card-image h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl">
            {breed.species === "DOG" ? "🐕" : "🐈"}
          </div>
        )}
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-cream/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-dark-muted shadow-sm dark:bg-[#2A1A10]/95 dark:text-[#C4A882]">
          {breed.species === "DOG" ? "🐕 Dog" : "🐈 Cat"}
        </span>
        {breed.petCount > 0 && (
          <span className="absolute left-3 bottom-3 inline-flex items-center gap-1 rounded-full bg-terracotta px-2 py-0.5 text-[10px] font-semibold text-white shadow-[0_2px_6px_rgba(201,75,42,0.35)]">
            {breed.petCount} on PawMatch
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2 p-5">
        <div>
          <p
            className="leading-tight text-dark"
            style={{
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontWeight: 900,
              fontSize: "1.35rem",
            }}
          >
            {breed.name}
          </p>
          <p className="mt-1 text-[12px] text-dark-muted">
            {breed.group ?? "Mixed"}
            {breed.lifespanMinYears && breed.lifespanMaxYears && (
              <> · {breed.lifespanMinYears}-{breed.lifespanMaxYears} yrs</>
            )}
          </p>
        </div>

        {breed.temperament.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {breed.temperament.slice(0, 3).map((t) => (
              <span
                key={t}
                className="inline-flex items-center rounded-full bg-sand/70 px-2 py-0.5 text-[10px] font-medium text-dark"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="mt-1 flex items-baseline justify-between border-t border-sand pt-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-dark-muted">
              Avg COI
            </p>
            <p className="mt-0.5 font-serif text-lg font-bold text-terracotta">
              {breed.averageCOI != null ? `${breed.averageCOI.toFixed(1)}%` : "—"}
            </p>
          </div>
          <span className="text-[11px] font-semibold text-terracotta transition-transform group-hover:translate-x-0.5">
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
