"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Species } from "@/generated/prisma";

import { RangeSlider } from "./RangeSlider";
import { SpeciesToggle } from "./SpeciesToggle";

interface FilterCardProps {
  species: Species;
  onSpeciesChange: (v: Species) => void;

  maxDistance: number;
  onMaxDistanceChange: (v: number) => void;

  minHealthScore: number;
  onMinHealthScoreChange: (v: number) => void;

  verifiedOnly: boolean;
  onVerifiedOnlyChange: (v: boolean) => void;

  breed: string;
  onBreedChange: (v: string) => void;
}

/**
 * Grouped filter card. Four columns separated by hairline dividers on
 * wide viewports; stacks gracefully on narrow ones. "More" disclosure
 * hosts verified-only + breed input.
 */
export function FilterCard(props: FilterCardProps) {
  const moreCount =
    (props.verifiedOnly ? 1 : 0) + (props.breed.trim() ? 1 : 0);

  return (
    <section className="rounded-3xl border border-sand bg-surface/85 backdrop-blur-sm shadow-[0_2px_8px_rgba(28,16,8,0.05)]">
      <div className="grid grid-cols-1 gap-5 p-5 md:gap-0 md:p-0 md:grid-cols-[auto_1fr_1fr_auto] md:items-stretch md:divide-x md:divide-sand">
        <Cell className="md:py-5 md:px-6">
          <SpeciesToggle
            value={props.species}
            onChange={props.onSpeciesChange}
          />
        </Cell>

        <Cell className="md:py-5 md:px-6">
          <RangeSlider
            label="Distance"
            value={props.maxDistance}
            min={10}
            max={500}
            step={10}
            ariaLabel="Maximum distance in kilometres"
            sentinelAtMax="any"
            format={(v) => `≤ ${v} km`}
            onChange={props.onMaxDistanceChange}
          />
        </Cell>

        <Cell className="md:py-5 md:px-6">
          <RangeSlider
            label="Health score"
            value={props.minHealthScore}
            min={0}
            max={100}
            step={5}
            ariaLabel="Minimum candidate health score"
            sentinelAtMin="any"
            format={(v) => `${v}+`}
            onChange={props.onMinHealthScoreChange}
          />
        </Cell>

        <Cell className="md:py-5 md:px-6 md:flex md:items-center">
          <MoreMenu
            count={moreCount}
            verifiedOnly={props.verifiedOnly}
            onVerifiedOnlyChange={props.onVerifiedOnlyChange}
            breed={props.breed}
            onBreedChange={props.onBreedChange}
          />
        </Cell>
      </div>
    </section>
  );
}

function Cell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

/* ─── "More filters" popover ─────────────────────────────────────────── */

function MoreMenu({
  count,
  verifiedOnly,
  onVerifiedOnlyChange,
  breed,
  onBreedChange,
}: {
  count: number;
  verifiedOnly: boolean;
  onVerifiedOnlyChange: (v: boolean) => void;
  breed: string;
  onBreedChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState(breed);

  // Keep draft in sync if external changes happen
  useEffect(() => {
    setDraft(breed);
  }, [breed]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative w-full md:w-auto" ref={rootRef}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-full border border-sand bg-surface/80 px-4 py-2 text-[13px] font-semibold text-dark transition-colors hover:border-terracotta/40 hover:text-terracotta md:w-auto"
      >
        <span className="inline-flex items-center gap-1.5">
          <SlidersIcon />
          More
        </span>
        {count > 0 && (
          <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-terracotta px-1.5 text-[10px] font-bold text-white">
            {count}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="More filters"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className="absolute right-0 top-[calc(100%+8px)] z-30 w-[280px] rounded-2xl border border-sand bg-surface p-4 shadow-[0_18px_48px_-18px_rgba(28,16,8,0.22),0_6px_18px_-8px_rgba(28,16,8,0.10)] dark:bg-[#261810]"
            style={{ transformOrigin: "top right" }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-dark-muted">
              Trust
            </p>
            <button
              type="button"
              aria-pressed={verifiedOnly}
              onClick={() => onVerifiedOnlyChange(!verifiedOnly)}
              className={`mt-2 inline-flex w-full items-center gap-2 rounded-full px-3 py-2 text-[13px] font-semibold transition-all hover:scale-[1.02] ${
                verifiedOnly
                  ? "bg-sage/20 text-sage shadow-[0_4px_12px_-4px_rgba(122,158,126,0.40)]"
                  : "bg-sand/40 text-dark"
              }`}
            >
              <CameraIcon />
              <span className="flex-1 text-left">Live verified only</span>
              <span
                className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${
                  verifiedOnly ? "bg-sage" : "bg-sand"
                }`}
                aria-hidden="true"
              >
                <motion.span
                  layout
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow ${
                    verifiedOnly ? "left-[18px]" : "left-0.5"
                  }`}
                />
              </span>
            </button>

            <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-dark-muted">
              Breed
            </p>
            <input
              type="search"
              value={draft}
              placeholder="e.g. Golden Retriever"
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => onBreedChange(draft)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onBreedChange(draft);
                  setOpen(false);
                }
              }}
              className="mt-2 w-full rounded-full border border-sand bg-cream px-4 py-2 text-sm text-dark outline-none transition-[border-color,background] duration-150 focus:border-terracotta focus:bg-surface focus:ring-2 focus:ring-terracotta/15"
            />
            <p className="mt-1.5 px-1 text-[11px] text-dark-muted">
              Press Enter to apply. Partial match — &quot;gold&quot; matches Golden Retriever.
            </p>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full bg-terracotta px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-[#A33820]"
              >
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SlidersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M4 6h11M19 6h1M4 12h5M13 12h7M4 18h13M21 18h-1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="17" cy="6" r="2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="11" cy="12" r="2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="19" cy="18" r="2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L17 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
