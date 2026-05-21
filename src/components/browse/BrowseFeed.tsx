"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { ActiveFiltersRow, type ActiveChip } from "./ActiveFiltersRow";
import { EmptyMatches } from "./EmptyMatches";
import { FilterCard } from "./FilterCard";
import { MatchCard } from "./MatchCard";
import { PetSelector, type SelectorPet } from "./PetSelector";
import { ResultsHeader } from "./ResultsHeader";
import type { SortBy } from "./SortMenu";
import type { ScoredPet } from "@/app/api/browse/route";
import type { Species } from "@/generated/prisma";

interface BrowseFeedProps {
  pets: SelectorPet[];
}

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
const DEFAULTS = {
  maxDistance: 200,
  minHealthScore: 0,
  verifiedOnly: false,
  breed: "",
  sortBy: "best" as SortBy,
};

export function BrowseFeed({ pets }: BrowseFeedProps) {
  const initialPet = pets[0];

  const [filters, setFilters] = useState<FiltersState>({
    petId: initialPet.id,
    species: initialPet.species,
    ...DEFAULTS,
  });

  const [results, setResults] = useState<ScoredPet[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());

  /* ── Fetcher ───────────────────────────────────────────────────────── */
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
    [filters],
  );

  // Debounced re-fetch on any filter change
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchPage(1, true);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [fetchPage]);

  const visible = useMemo(
    () => results.filter((p) => !skippedIds.has(p.id)),
    [results, skippedIds],
  );

  function onSkip(id: string) {
    setSkippedIds((s) => new Set(s).add(id));
  }
  function onSent(id: string) {
    setSkippedIds((s) => new Set(s).add(id));
  }

  /* ── Active-filter chips ──────────────────────────────────────────── */
  const chips: ActiveChip[] = [];
  if (filters.maxDistance !== DEFAULTS.maxDistance) {
    chips.push({
      id: "distance",
      label:
        filters.maxDistance === 500
          ? "Any distance"
          : `≤ ${filters.maxDistance} km`,
      onRemove: () =>
        setFilters((f) => ({ ...f, maxDistance: DEFAULTS.maxDistance })),
    });
  }
  if (filters.minHealthScore > 0) {
    chips.push({
      id: "health",
      label: `Health ${filters.minHealthScore}+`,
      onRemove: () => setFilters((f) => ({ ...f, minHealthScore: 0 })),
    });
  }
  if (filters.verifiedOnly) {
    chips.push({
      id: "verified",
      label: "Live verified",
      onRemove: () => setFilters((f) => ({ ...f, verifiedOnly: false })),
    });
  }
  if (filters.breed.trim()) {
    chips.push({
      id: "breed",
      label: `Breed: ${filters.breed.trim()}`,
      onRemove: () => setFilters((f) => ({ ...f, breed: "" })),
    });
  }

  function resetSecondaryFilters() {
    setFilters((f) => ({
      ...f,
      maxDistance: DEFAULTS.maxDistance,
      minHealthScore: 0,
      verifiedOnly: false,
      breed: "",
    }));
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 md:py-14">
      <header className="mb-6">
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
      </header>

      <div className="mb-6">
        <PetSelector
          pets={pets}
          activeId={filters.petId}
          onChange={(p) =>
            setFilters((f) => ({ ...f, petId: p.id, species: p.species }))
          }
        />
      </div>

      <FilterCard
        species={filters.species}
        onSpeciesChange={(species) => setFilters((f) => ({ ...f, species }))}
        maxDistance={filters.maxDistance}
        onMaxDistanceChange={(maxDistance) =>
          setFilters((f) => ({ ...f, maxDistance }))
        }
        minHealthScore={filters.minHealthScore}
        onMinHealthScoreChange={(minHealthScore) =>
          setFilters((f) => ({ ...f, minHealthScore }))
        }
        verifiedOnly={filters.verifiedOnly}
        onVerifiedOnlyChange={(verifiedOnly) =>
          setFilters((f) => ({ ...f, verifiedOnly }))
        }
        breed={filters.breed}
        onBreedChange={(breed) => setFilters((f) => ({ ...f, breed }))}
      />

      <ActiveFiltersRow chips={chips} onClearAll={resetSecondaryFilters} />

      <div className="mt-7">
        <ResultsHeader
          visibleCount={visible.length}
          totalCount={total}
          loading={loading}
          sortBy={filters.sortBy}
          onSortChange={(sortBy) => setFilters((f) => ({ ...f, sortBy }))}
        />
      </div>

      {error && (
        <p className="mt-5 rounded-2xl bg-terracotta/10 px-4 py-3 text-center text-sm text-terracotta">
          {error}
        </p>
      )}

      {/* Results — preserve previous results at 40% opacity while loading */}
      <div className="mt-5">
        {!loading && visible.length === 0 && !error ? (
          <EmptyMatches onReset={resetSecondaryFilters} />
        ) : (
          <motion.div
            animate={{ opacity: loading && visible.length > 0 ? 0.4 : 1 }}
            transition={{ duration: 0.18 }}
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            <AnimatePresence initial={false} mode="popLayout">
              {visible.map((p, i) => (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{
                    duration: 0.24,
                    ease: [0.4, 0, 0.2, 1],
                    delay: Math.min(i * 0.03, 0.18),
                  }}
                >
                  <MatchCard
                    candidate={p}
                    myPetId={filters.petId}
                    onSkip={onSkip}
                    onSent={onSent}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

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
