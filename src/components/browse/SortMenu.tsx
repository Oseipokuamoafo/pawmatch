"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type SortBy = "best" | "nearest" | "newest";

export const SORT_OPTIONS: {
  id: SortBy;
  label: string;
  subtitle: string;
}[] = [
  {
    id: "best",
    label: "Best match",
    subtitle: "Weighted by traits, health, diversity, proximity.",
  },
  {
    id: "nearest",
    label: "Closest",
    subtitle: "Lowest distance first — useful for in-person meets.",
  },
  {
    id: "newest",
    label: "Newest",
    subtitle: "Recently added pets surface first.",
  },
];

interface SortMenuProps {
  value: SortBy;
  onChange: (next: SortBy) => void;
}

export function SortMenu({ value, onChange }: SortMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = SORT_OPTIONS.find((o) => o.id === value) ?? SORT_OPTIONS[0];

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
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border border-sand bg-surface/80 px-3 py-1.5 text-xs font-semibold text-dark transition-colors hover:border-terracotta/40 hover:text-terracotta"
      >
        <SortIcon />
        <span className="hidden sm:inline">Sort:</span>
        <span>{current.label}</span>
        <Caret className={open ? "rotate-180" : ""} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className="absolute right-0 top-[calc(100%+8px)] z-30 w-[260px] rounded-2xl border border-sand bg-surface p-1.5 shadow-[0_18px_48px_-18px_rgba(28,16,8,0.22),0_6px_18px_-8px_rgba(28,16,8,0.10)] dark:bg-[#261810]"
            style={{ transformOrigin: "top right" }}
          >
            {SORT_OPTIONS.map((opt) => {
              const active = opt.id === value;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    onChange(opt.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    active
                      ? "bg-terracotta/10 text-terracotta"
                      : "text-dark hover:bg-cream/70 dark:hover:bg-[#2A1A10]"
                  }`}
                >
                  <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center">
                    {active && <DotMark />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{opt.label}</span>
                    <span className="mt-0.5 block text-[11px] text-dark-muted leading-snug">
                      {opt.subtitle}
                    </span>
                  </span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SortIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
      <path
        d="M7 4v16m0 0-3-3m3 3 3-3M17 20V4m0 0-3 3m3-3 3 3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Caret({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      className={`h-2.5 w-2.5 transition-transform ${className}`}
      aria-hidden="true"
    >
      <path
        d="m3 4.5 3 3 3-3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DotMark() {
  return <span className="block h-2 w-2 rounded-full bg-terracotta" />;
}
