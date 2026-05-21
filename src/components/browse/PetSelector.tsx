"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Species, Sex } from "@/generated/prisma";

import { calculateAge } from "@/lib/utils/age";

export interface SelectorPet {
  id: string;
  name: string;
  species: Species;
  sex: Sex;
  breed: string;
  dateOfBirth: string;
  photoUrl: string | null;
  livePhotoUrl: string | null;
  ownerVerified: boolean;
}

interface PetSelectorProps {
  pets: SelectorPet[];
  activeId: string;
  onChange: (next: SelectorPet) => void;
}

/**
 * Hero pet selector. Renders as a wide pill-card at the top of /browse with
 * the active pet's avatar + name + meta line. Click → dropdown of every
 * pet the user owns with photo, breed, age, and verified-badge.
 *
 * Single source of truth for "which pet am I matching from" — removes the
 * old subtitle/dropdown duplication.
 */
export function PetSelector({ pets, activeId, onChange }: PetSelectorProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = pets.find((p) => p.id === activeId) ?? pets[0];

  /* Click-outside + Escape to close ─────────────────────────────────── */
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

  if (!active) return null;

  const onlyOne = pets.length === 1;

  return (
    <div className="relative w-full" ref={rootRef}>
      <button
        type="button"
        onClick={() => !onlyOne && setOpen((v) => !v)}
        disabled={onlyOne}
        aria-haspopup={onlyOne ? undefined : "listbox"}
        aria-expanded={onlyOne ? undefined : open}
        className={`group flex w-full items-center gap-4 rounded-3xl border border-sand bg-surface px-4 py-3 text-left transition-all ${
          onlyOne ? "cursor-default" : "hover:border-terracotta/40 hover:shadow-[0_2px_12px_-6px_rgba(201,75,42,0.25)]"
        }`}
      >
        <Avatar pet={active} size={44} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta">
            Finding matches for
          </p>
          <p
            className="mt-0.5 truncate text-dark"
            style={{
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontWeight: 800,
              fontSize: "1.25rem",
              lineHeight: 1.15,
            }}
          >
            {active.name}
          </p>
          <p className="mt-0.5 truncate text-[12px] text-dark-muted">
            {active.species === "DOG" ? "Dog" : "Cat"} · {active.breed} ·{" "}
            {calculateAge(active.dateOfBirth)}
            {active.ownerVerified && " · Verified"}
          </p>
        </div>
        {!onlyOne && (
          <Chevron
            className={`shrink-0 text-dark-muted transition-transform ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-2xl border border-sand bg-surface p-1.5 shadow-[0_18px_48px_-18px_rgba(28,16,8,0.22),0_6px_18px_-8px_rgba(28,16,8,0.10)] dark:bg-[#261810]"
            style={{ transformOrigin: "top" }}
          >
            <ul className="max-h-[60vh] overflow-y-auto">
              {pets.map((p) => {
                const isActive = p.id === active.id;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => {
                        onChange(p);
                        setOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        isActive
                          ? "bg-terracotta/10 text-terracotta"
                          : "text-dark hover:bg-cream/70 dark:hover:bg-[#2A1A10]"
                      }`}
                    >
                      <Avatar pet={p} size={36} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {p.name}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-dark-muted">
                          {p.breed} · {calculateAge(p.dateOfBirth)} ·{" "}
                          {p.sex === "MALE" ? "♂" : "♀"}
                        </p>
                      </div>
                      {isActive && <Check className="shrink-0 h-4 w-4 text-terracotta" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Bits ───────────────────────────────────────────────────────────── */

function Avatar({ pet, size }: { pet: SelectorPet; size: number }) {
  const url = pet.photoUrl ?? pet.livePhotoUrl;
  return (
    <span
      className="relative inline-block shrink-0 overflow-hidden rounded-full bg-sand"
      style={{ width: size, height: size }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={pet.name} className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-base">
          {pet.species === "DOG" ? "🐕" : "🐈"}
        </span>
      )}
    </span>
  );
}

function Chevron({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`h-4 w-4 ${className}`} aria-hidden="true">
      <path
        d="m6 9 6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Check({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="m5 12 5 5L20 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
