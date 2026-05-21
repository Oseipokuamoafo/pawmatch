"use client";

import { AnimatePresence, motion } from "framer-motion";

export interface ActiveChip {
  id: string;
  label: string;
  onRemove: () => void;
}

interface ActiveFiltersRowProps {
  chips: ActiveChip[];
  onClearAll: () => void;
}

/**
 * Row of dismissable filter chips. Hides itself when no filters are active.
 * Each chip animates in/out for a tactile feel.
 */
export function ActiveFiltersRow({ chips, onClearAll }: ActiveFiltersRowProps) {
  return (
    <AnimatePresence initial={false}>
      {chips.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          className="overflow-hidden"
        >
          <div className="flex flex-wrap items-center gap-2 pt-3">
            <AnimatePresence initial={false}>
              {chips.map((c) => (
                <motion.span
                  key={c.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.16, ease: [0.4, 0, 0.2, 1] }}
                  className="inline-flex items-center gap-1 rounded-full border border-terracotta/30 bg-terracotta/5 px-3 py-1 text-[12px] font-semibold text-terracotta"
                >
                  <span>{c.label}</span>
                  <button
                    type="button"
                    onClick={c.onRemove}
                    aria-label={`Remove filter: ${c.label}`}
                    className="grid h-4 w-4 place-items-center rounded-full hover:bg-terracotta/15"
                  >
                    <X />
                  </button>
                </motion.span>
              ))}
            </AnimatePresence>
            <button
              type="button"
              onClick={onClearAll}
              className="ml-auto rounded-full px-2 py-1 text-[12px] font-semibold text-dark-muted transition-colors hover:text-terracotta"
            >
              Clear all
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function X() {
  return (
    <svg viewBox="0 0 12 12" fill="none" className="h-2.5 w-2.5" aria-hidden="true">
      <path
        d="m3 3 6 6M9 3l-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
