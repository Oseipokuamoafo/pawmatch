"use client";

import { motion } from "framer-motion";

interface EmptyMatchesProps {
  onReset: () => void;
}

/**
 * Empty state for the browse feed. Surfaces a paw-mark glyph + a
 * Playfair italic headline + a "Reset filters" CTA. The bible's
 * "trust + considered" tone — empty doesn't have to feel sterile.
 */
export function EmptyMatches({ onReset }: EmptyMatchesProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className="card flex flex-col items-center py-16 text-center"
    >
      <PawConstellation />
      <p
        className="mt-6 leading-tight text-balance text-dark"
        style={{
          fontFamily: "var(--font-playfair, Georgia, serif)",
          fontStyle: "italic",
          fontWeight: 800,
          fontSize: "1.75rem",
        }}
      >
        No matches just yet.
      </p>
      <p className="mt-3 max-w-md text-sm text-dark-muted leading-relaxed">
        Try widening your distance, lowering the health score threshold, or
        removing the live-verified filter.
      </p>
      <button type="button" onClick={onReset} className="btn-primary mt-7">
        Reset filters
      </button>
    </motion.div>
  );
}

/** Small constellation of paw marks. Decorative, fades in subtly. */
function PawConstellation() {
  return (
    <svg
      viewBox="0 0 120 80"
      width="120"
      height="80"
      aria-hidden="true"
      className="text-terracotta"
    >
      <g fill="currentColor" opacity="0.18">
        <Paw cx={22} cy={20} scale={0.7} />
        <Paw cx={92} cy={18} scale={0.55} />
      </g>
      <g fill="currentColor" opacity="0.45">
        <Paw cx={60} cy={42} scale={1} />
      </g>
      <g fill="currentColor" opacity="0.18">
        <Paw cx={32} cy={62} scale={0.5} />
        <Paw cx={88} cy={64} scale={0.65} />
      </g>
    </svg>
  );
}

function Paw({
  cx,
  cy,
  scale,
}: {
  cx: number;
  cy: number;
  scale: number;
}) {
  const s = scale;
  return (
    <g transform={`translate(${cx} ${cy}) scale(${s})`}>
      <ellipse cx="-7" cy="0" rx="2.4" ry="3.2" />
      <ellipse cx="7" cy="0" rx="2.4" ry="3.2" />
      <ellipse cx="-3.5" cy="-6" rx="2" ry="2.7" />
      <ellipse cx="3.5" cy="-6" rx="2" ry="2.7" />
      <path d="M0 0c-4 0-6 3-6 5.5C-6 8.5-4 10 0 10s6-1.5 6-4.5C6 3 4 0 0 0z" />
    </g>
  );
}
