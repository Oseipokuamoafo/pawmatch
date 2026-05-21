"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { StatsRow } from "./StatsRow";
import { FilterBar, type DashboardFilter } from "./FilterBar";
import { DashboardPetCard } from "./DashboardPetCard";
import { TopMatchesPanel, type TopMatch } from "./TopMatchesPanel";
import { ActivityFeed } from "./ActivityFeed";
import { AddPetModal } from "./AddPetModal";
import { VerifyCTA } from "./VerifyCTA";
import {
  HeatScheduleWidget,
  type HeatScheduleEntry,
} from "@/components/heat/HeatScheduleWidget";
import type {
  ActivityEvent,
  DashboardPet,
  DashboardStats,
} from "@/lib/dashboard-stats";
import { useToast } from "@/components/toast/ToastProvider";
import type { VerificationStatus } from "@/generated/prisma";

interface DashboardClientProps {
  firstName: string;
  pets: DashboardPet[];
  stats: DashboardStats;
  topMatches: TopMatch[];
  activity: ActivityEvent[];
  heatEntries: HeatScheduleEntry[];
  /** When set, render the breeder-verification banner. */
  verifyCTA?: { status: VerificationStatus | null } | null;
}

const VARIANT_FILTERS: DashboardFilter[] = [
  "all",
  "dogs",
  "cats",
  "male",
  "female",
  "verified",
];

export function DashboardClient({
  firstName,
  pets,
  stats,
  topMatches,
  activity,
  heatEntries,
  verifyCTA,
}: DashboardClientProps) {
  const router = useRouter();
  const toast = useToast();
  const [filter, setFilter] = useState<DashboardFilter>("all");
  const [modalOpen, setModalOpen] = useState(false);

  const counts = useMemo<Record<DashboardFilter, number>>(() => {
    const out = {} as Record<DashboardFilter, number>;
    for (const f of VARIANT_FILTERS) out[f] = pets.filter(matcher(f)).length;
    return out;
  }, [pets]);

  const filtered = useMemo(() => pets.filter(matcher(filter)), [pets, filter]);

  return (
    <>
      <div className="mx-auto max-w-6xl px-6 py-10 md:py-14">
        {/* ── Greeting header ──────────────────────────────────────── */}
        <header className="mb-8 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-terracotta">
              {greeting()}
            </p>
            <h1
              className="mt-3 leading-[1.05] tracking-tight text-balance text-dark"
              style={{
                fontFamily: "var(--font-playfair, Georgia, serif)",
                fontWeight: 900,
                fontSize: "clamp(2.25rem, 5vw, 3.25rem)",
              }}
            >
              Hi, <em style={{ color: "#C94B2A" }}>{firstName}</em>.
            </h1>
            <p className="mt-3 max-w-lg text-base text-dark-muted leading-relaxed">
              {pets.length === 0
                ? "Add your first pet to start finding compatible, responsible matches."
                : `${pets.length} pet${pets.length === 1 ? "" : "s"} in your registry${
                    stats.newMatches > 0
                      ? ` · ${stats.newMatches} new ${stats.newMatches === 1 ? "request" : "requests"} waiting`
                      : ""
                  }.`}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <span aria-hidden="true">+</span> Add pet
          </button>
        </header>

        {/* ── Stats ────────────────────────────────────────────────── */}
        <StatsRow stats={stats} />

        {/* ── Breeder verification CTA (unverified breeders only) ── */}
        {verifyCTA && (
          <div className="mt-8">
            <VerifyCTA status={verifyCTA.status} />
          </div>
        )}

        {/* ── Filter + grid ────────────────────────────────────────── */}
        <section className="mt-10">
          <div className="mb-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <h2
              className="text-dark"
              style={{
                fontFamily: "var(--font-playfair, Georgia, serif)",
                fontWeight: 900,
                fontSize: "1.5rem",
              }}
            >
              My pets
            </h2>
            {pets.length > 0 && (
              <FilterBar active={filter} onChange={setFilter} counts={counts} />
            )}
          </div>

          {pets.length === 0 ? (
            <EmptyState onAdd={() => setModalOpen(true)} />
          ) : filtered.length === 0 ? (
            <EmptyFilter onReset={() => setFilter("all")} />
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((pet) => (
                <DashboardPetCard key={pet.id} pet={pet} />
              ))}
            </div>
          )}
        </section>

        {/* ── Heat-cycle forecast (when there's anything to show) ── */}
        {heatEntries.length > 0 && (
          <section className="mt-12">
            <HeatScheduleWidget entries={heatEntries} />
          </section>
        )}

        {/* ── Bottom two-column: top matches + activity ───────────── */}
        <section className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TopMatchesPanel matches={topMatches} />
          <ActivityFeed events={activity} />
        </section>
      </div>

      {/* ── Modal ──────────────────────────────────────────────────── */}
      <AddPetModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(pet) => {
          toast.success("Pet added", `${pet.name} joined your registry.`);
          router.refresh();
        }}
      />
    </>
  );
}

/* ─── Filter logic ───────────────────────────────────────────────────── */

function matcher(f: DashboardFilter) {
  return (p: DashboardPet) => {
    switch (f) {
      case "all":
        return true;
      case "dogs":
        return p.species === "DOG";
      case "cats":
        return p.species === "CAT";
      case "male":
        return p.sex === "MALE";
      case "female":
        return p.sex === "FEMALE";
      case "verified":
        return Boolean(p.livePhotoUrl);
    }
  };
}

/* ─── Time-of-day greeting ───────────────────────────────────────────── */

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Hello";
}

/* ─── Empty states ───────────────────────────────────────────────────── */

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-sand/60 bg-surface/85 p-10 text-center md:p-14 backdrop-blur">
      <div className="pointer-events-none absolute -right-8 -top-8 opacity-[0.08]">
        <PawMark className="h-44 w-44 text-terracotta" />
      </div>
      <div className="pointer-events-none absolute -bottom-10 -left-6 rotate-12 opacity-[0.08]">
        <PawMark className="h-36 w-36 text-terracotta" />
      </div>

      <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-terracotta/10 ring-1 ring-terracotta/30">
        <PawMark className="h-10 w-10 text-terracotta" />
      </div>

      <h2
        className="mx-auto mt-6 max-w-md leading-tight tracking-tight text-dark"
        style={{
          fontFamily: "var(--font-playfair, Georgia, serif)",
          fontWeight: 900,
          fontSize: "1.875rem",
        }}
      >
        A profile for every pet, built on trust.
      </h2>
      <p className="mx-auto mt-3 max-w-md text-dark-muted leading-relaxed">
        Live photo + health records + breeding goals. We&apos;ll mark what&apos;s verified
        and flag what isn&apos;t.
      </p>
      <button type="button" onClick={onAdd} className="btn-primary mt-8 inline-flex">
        Create your first profile
      </button>
    </div>
  );
}

function EmptyFilter({ onReset }: { onReset: () => void }) {
  return (
    <div className="card flex flex-col items-center py-12 text-center">
      <p
        className="text-lg font-bold text-dark"
        style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}
      >
        Nothing in this filter
      </p>
      <p className="mt-2 max-w-md text-sm text-dark-muted">
        Try a different filter, or clear it to see everyone.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-5 rounded-full border border-sand bg-transparent px-4 py-2 text-sm font-medium text-dark-muted hover:border-terracotta/40 hover:text-terracotta"
      >
        Show all pets
      </button>
    </div>
  );
}

function PawMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" className={className} aria-hidden="true">
      <ellipse cx="7" cy="14" rx="3" ry="4" />
      <ellipse cx="25" cy="14" rx="3" ry="4" />
      <ellipse cx="12" cy="7" rx="2.6" ry="3.4" />
      <ellipse cx="20" cy="7" rx="2.6" ry="3.4" />
      <path d="M16 14c-5.5 0-8 4-8 7.5C8 25.5 11.5 28 16 28s8-2.5 8-6.5C24 18 21.5 14 16 14z" />
    </svg>
  );
}

{
  /* unused references kept for tree-shake awareness */ Link;
}
