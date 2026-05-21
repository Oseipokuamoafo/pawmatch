"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import type { Species } from "@/generated/prisma";

interface SpeciesToggleProps {
  value: Species;
  onChange: (next: Species) => void;
}

const OPTIONS: { id: Species; label: string; emoji: string }[] = [
  { id: "DOG", label: "Dogs", emoji: "🐕" },
  { id: "CAT", label: "Cats", emoji: "🐈" },
];

/**
 * iOS-style segmented control with framer-motion layoutId sliding pill.
 * Roving focus + arrow-key navigation per the radiogroup ARIA pattern.
 */
export function SpeciesToggle({ value, onChange }: SpeciesToggleProps) {
  const layoutId = useRef(
    `species-pill-${Math.random().toString(36).slice(2, 9)}`,
  ).current;

  function move(direction: 1 | -1) {
    const i = OPTIONS.findIndex((o) => o.id === value);
    const next = (i + direction + OPTIONS.length) % OPTIONS.length;
    onChange(OPTIONS[next].id);
  }

  return (
    <div
      role="radiogroup"
      aria-label="Species"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          move(1);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          move(-1);
        }
      }}
      className="inline-flex items-center rounded-full bg-sand/50 p-1 dark:bg-[rgba(232,213,183,0.12)]"
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(opt.id)}
            className={`relative inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors duration-150 ${
              active ? "text-white" : "text-dark hover:text-terracotta"
            }`}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-full bg-terracotta shadow-[0_1px_2px_rgba(28,16,8,0.18),0_4px_12px_-4px_rgba(201,75,42,0.40)]"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <span className="relative" aria-hidden="true">
              {opt.emoji}
            </span>
            <span className="relative">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
