"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { SortMenu, type SortBy } from "./SortMenu";

interface ResultsHeaderProps {
  visibleCount: number;
  totalCount: number;
  loading: boolean;
  sortBy: SortBy;
  onSortChange: (next: SortBy) => void;
}

/**
 * Animated count + sort dropdown. Pulses the count when it changes.
 */
export function ResultsHeader({
  visibleCount,
  totalCount,
  loading,
  sortBy,
  onSortChange,
}: ResultsHeaderProps) {
  const [pulse, setPulse] = useState(false);
  const lastTotal = useRef(totalCount);
  useEffect(() => {
    if (lastTotal.current !== totalCount) {
      setPulse(true);
      const t = window.setTimeout(() => setPulse(false), 420);
      lastTotal.current = totalCount;
      return () => window.clearTimeout(t);
    }
  }, [totalCount]);

  const isAll = visibleCount === totalCount;
  const pluralized = `${totalCount} ${totalCount === 1 ? "candidate" : "candidates"}`;
  const text = loading
    ? "Searching…"
    : isAll
      ? pluralized
      : `${visibleCount} of ${pluralized}`;

  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-terracotta">
          Results
        </p>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.p
            key={text}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className={`mt-1 text-base font-semibold text-dark transition-colors ${pulse ? "text-terracotta" : ""}`}
          >
            {text}
          </motion.p>
        </AnimatePresence>
      </div>
      <SortMenu value={sortBy} onChange={onSortChange} />
    </div>
  );
}
