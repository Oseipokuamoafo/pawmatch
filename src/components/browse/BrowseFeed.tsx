"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { MatchCard } from "./MatchCard";
import type { ScoredPet } from "@/app/api/browse/route";
import type { Species } from "@/generated/prisma";

interface UserPet {
  id: string;
  name: string;
  species: Species;
}

interface BrowseFeedProps {
  pets: UserPet[];
}

type SortBy = "best" | "nearest" | "newest";

interface FiltersState {
  petId: string;
  species: Species;
  maxDistance: number;
  minHealthScore: number;
  verifiedOnly: boolean;
  breed: string;
  sortBy: SortBy;
}

const PAGE_SIZE = 12;

/**
 * Full browse feed: pet switcher, filter bar, results grid with
 * "Load more" pagination and in-session skip.
 */
export function BrowseFeed({ pets }: BrowseFeedProps) {
  const initialPet = pets[0];

  const [filters, setFilters] = useState<FiltersState>({
    petId: initialPet.id,
    species: initialPet.species,
    maxDistance: 200,
    minHealthScore: 0,
    verifiedOnly: false,
    breed: "",
    sortBy: "best",
  });

  const [results, setResults] = useState<ScoredPet[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());

  // Debounce filter changes (search/sliders fire fast) and re-fetch
  const reqIdRef = useRef(0);
  const fetchPage = useCallback(
    async (pageNum: number, replace: boolean) => {
      const reqId = ++reqIdRef.current;
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        petId: filters.petId,
        species: filters.species,
        maxDistance: String(filters.maxDistance),
        minHealthScore: String(filters.minHealthScore),
        verifiedOnly: String(filters.verifiedOnly),
        sortBy: filters.sortBy,
        page: String(pageNum),
        limit: String(PAGE_SIZE),
      });
      if (filters.breed.trim()) params.set("breed", filters.breed.trim());

      try {
        const res = await fetch(`/api/browse?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `Request failed (${res.status})`);
        }
        const data = (await res.json()) as {
          pets: ScoredPet[];
          total: number;
          hasMore: boolean;
        };
        // Drop stale responses if the user kept tweaking filters
        if (reqId !== reqIdRef.current) return;
        setResults((prev) => (replace ? data.pets : [...prev, ...data.pets]));
        setTotal(data.total);
        setHasMore(data.hasMore);
        setPage(pageNum);
      } catch (err) {
        if (reqId !== reqIdRef.current) return;
        setError(err instanceof Error ? err.message : "Could not load matches");
      } finally {
        if (reqId === reqIdRef.current) setLoading(false);
      }
    },
    [filters]
  );

  // Debounce — re-fetch from page 1 when filters change
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchPage(1, true);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [fetchPage]);

  const visible = useMemo(
    () => results.filter((p) => !skippedIds.has(p.id)),
    [results, skippedIds]
  );

  function onSkip(id: string) {
    setSkippedIds((s) => new Set(s).add(id));
  }
  function onSent(id: string) {
    // Sent requests should also drop out of the candidate set
    setSkippedIds((s) => new Set(s).add(id));
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 md:py-14">
      <Header pets={pets} filters={filters} setFilters={setFilters} />

      <FilterBar filters={filters} setFilters={setFilters} />

      <div className="my-4 flex items-baseline justify-between text-sm text-dark-muted">
        <span>
          {loading && results.length === 0
            ? "Searching…"
            : `${visible.length} of ${total} candidate${total === 1 ? "" : "s"}`}
        </span>
        <SortControl
          value={filters.sortBy}
          onChange={(sortBy) => setFilters((f) => ({ ...f, sortBy }))}
        />
      </div>

      {error && (
        <p className="rounded-2xl bg-terracotta/10 px-4 py-3 text-center text-sm text-terracotta">
          {error}
        </p>
      )}

      {!loading && visible.length === 0 && !error ? (
        <EmptyState
          onReset={() =>
            setFilters((f) => ({
              ...f,
              maxDistance: 500,
              minHealthScore: 0,
              verifiedOnly: false,
              breed: "",
            }))
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => (
            <MatchCard
              key={p.id}
              candidate={p}
              myPetId={filters.petId}
              onSkip={onSkip}
              onSent={onSent}
            />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => void fetchPage(page + 1, false)}
            disabled={loading}
            className="btn-secondary"
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Header + pet switcher ──────────────────────────────────────────── */

function Header({
  pets,
  filters,
  setFilters,
}: {
  pets: UserPet[];
  filters: FiltersState;
  setFilters: React.Dispatch<React.SetStateAction<FiltersState>>;
}) {
  const activePet = pets.find((p) => p.id === filters.petId) ?? pets[0];

  return (
    <header className="mb-8 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-terracotta">
          Browse · Find a Match
        </p>
        <h1
          className="mt-3 leading-[1.05] tracking-tight text-balance text-dark"
          style={{
            fontFamily: "var(--font-playfair, Georgia, serif)",
            fontWeight: 900,
            fontSize: "clamp(2.25rem, 5vw, 3.25rem)",
          }}
        >
          Find a Match
        </h1>
        <p className="mt-3 max-w-lg text-base text-dark-muted">
          Matching for <strong className="text-dark">{activePet.name}</strong>{" "}
          ({activePet.species === "DOG" ? "Dog" : "Cat"}).
        </p>
      </div>

      {pets.length > 1 && (
        <label className="flex items-center gap-2 text-sm">
          <span className="text-dark-muted">Matching for:</span>
          <select
            value={filters.petId}
            onChange={(e) => {
              const next = pets.find((p) => p.id === e.target.value);
              if (!next) return;
              setFilters((f) => ({
                ...f,
                petId: next.id,
                species: next.species,
              }));
            }}
            className="rounded-full border border-sand bg-cream px-4 py-2 text-sm font-semibold text-dark focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/15"
          >
            {pets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.species === "DOG" ? "Dog" : "Cat"})
              </option>
            ))}
          </select>
        </label>
      )}
    </header>
  );
}

/* ─── Filter bar ─────────────────────────────────────────────────────── */

function FilterBar({
  filters,
  setFilters,
}: {
  filters: FiltersState;
  setFilters: React.Dispatch<React.SetStateAction<FiltersState>>;
}) {
  return (
    <section className="rounded-3xl border border-sand bg-surface/60 p-4 md:p-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[auto_1fr_1fr_auto_auto] lg:items-center">
        {/* Species toggle */}
        <div className="inline-flex rounded-full bg-cream p-1 self-start">
          {(["DOG", "CAT"] as Species[]).map((s) => {
            const active = filters.species === s;
            return (
              <button
                key={s}
                type="button"
                aria-pressed={active}
                onClick={() => setFilters((f) => ({ ...f, species: s }))}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-terracotta text-white"
                    : "text-dark-muted hover:text-terracotta"
                }`}
              >
                {s === "DOG" ? "Dogs" : "Cats"}
              </button>
            );
          })}
        </div>

        {/* Distance slider */}
        <SliderField
          label="Max distance"
          value={filters.maxDistance}
          min={10}
          max={500}
          step={10}
          format={(v) => `${v} km`}
          onChange={(v) => setFilters((f) => ({ ...f, maxDistance: v }))}
        />

        {/* Health score slider */}
        <SliderField
          label="Min health score"
          value={filters.minHealthScore}
          min={0}
          max={100}
          step={5}
          format={(v) => (v === 0 ? "any" : String(v))}
          onChange={(v) => setFilters((f) => ({ ...f, minHealthScore: v }))}
        />

        {/* Verified toggle */}
        <label className="inline-flex items-center gap-2 self-end justify-self-start text-sm text-dark-muted lg:self-center lg:justify-self-end">
          <input
            type="checkbox"
            checked={filters.verifiedOnly}
            onChange={(e) =>
              setFilters((f) => ({ ...f, verifiedOnly: e.target.checked }))
            }
            className="h-4 w-4 rounded border-sand accent-terracotta"
          />
          Live verified only
        </label>

        {/* Breed search */}
        <input
          type="search"
          placeholder="Breed…"
          value={filters.breed}
          onChange={(e) =>
            setFilters((f) => ({ ...f, breed: e.target.value }))
          }
          className="w-full rounded-full border border-sand bg-cream px-4 py-2 text-sm text-dark outline-none transition-[border-color] duration-150 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 lg:max-w-[180px]"
        />
      </div>
    </section>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs text-dark-muted">
        <span>{label}</span>
        <span className="font-semibold text-dark">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-terracotta"
      />
    </div>
  );
}

/* ─── Sort + empty ──────────────────────────────────────────────────── */

function SortControl({
  value,
  onChange,
}: {
  value: SortBy;
  onChange: (v: SortBy) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-xs text-dark-muted">
      Sort
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortBy)}
        className="rounded-full border border-sand bg-cream px-3 py-1.5 text-xs font-semibold text-dark focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/15"
      >
        <option value="best">Best match</option>
        <option value="nearest">Nearest</option>
        <option value="newest">Newest</option>
      </select>
    </label>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="card flex flex-col items-center py-16 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-sand text-2xl">
        🔎
      </div>
      <p
        className="text-xl font-bold text-dark"
        style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}
      >
        Nothing matches those filters
      </p>
      <p className="mt-2 max-w-sm text-sm text-dark-muted">
        Try widening the distance, lowering the health score, or turning off
        the verified-only filter.
      </p>
      <button type="button" onClick={onReset} className="btn-primary mt-6">
        Reset filters
      </button>
    </div>
  );
}
