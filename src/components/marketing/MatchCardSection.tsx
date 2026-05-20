"use client";

import { motion, useReducedMotion } from "framer-motion";

import { MatchCardPhone } from "./MatchCardPhone";
import { PawDivider } from "./PawDivider";

const DARK = "#1C1008";
const TERRA = "#C94B2A";

/**
 * Section 3 — "A match card that tells the truth."
 * Two-column layout: phone variant left, copy + bullets right.
 * Stacks under 1024px (phone above copy, copy centered).
 */
export function MatchCardSection() {
  const reduce = useReducedMotion();

  return (
    <section className="relative z-10">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2 lg:gap-20">
          {/* LEFT — phone */}
          <motion.div
            className="order-1 flex justify-center lg:order-none"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <MatchCardPhone />
          </motion.div>

          {/* RIGHT — copy */}
          <motion.div
            className="order-2 max-w-xl text-center lg:order-none lg:text-left lg:mx-0"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="eyebrow">In the wild</p>

            <h2
              className="mt-4 text-balance leading-tight tracking-tight text-dark"
              style={{
                fontFamily: "var(--font-playfair, Georgia, serif)",
                fontWeight: 900,
                fontSize: "clamp(2.25rem, 5vw, 3.75rem)",
              }}
            >
              A match card that
              <br />
              <em className="font-italic-serif" style={{ color: TERRA }}>
                tells the truth.
              </em>
            </h2>

            <p
              className="mt-6 max-w-xl leading-relaxed text-balance mx-auto lg:mx-0"
              style={{
                fontFamily: "var(--font-inter, system-ui, sans-serif)",
                fontSize: "1.125rem",
                color: "color-mix(in srgb, var(--color-dark) 75%, transparent)",
              }}
            >
              Every match shows a compatibility score, who&apos;s verified, what&apos;s
              still self-reported — and, when something looks risky, a
              plain-language warning you can&apos;t miss. No hidden risk. No surprise
              paperwork.
            </p>

            <ul className="mx-auto mt-10 max-w-md space-y-6 text-left lg:mx-0">
              {BULLETS.map((b) => (
                <li key={b.title} className="flex gap-4">
                  <span
                    className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: TERRA,
                      color: "#fff",
                      boxShadow: "0 0 0 4px rgba(201,75,42,0.10)",
                    }}
                    aria-hidden="true"
                  >
                    <Check />
                  </span>
                  <div className="min-w-0">
                    <p
                      style={{
                        fontFamily:
                          "var(--font-inter, system-ui, sans-serif)",
                        fontWeight: 600,
                        fontSize: "1rem",
                        color: DARK,
                      }}
                    >
                      {b.title}
                    </p>
                    <p
                      className="mt-1 leading-relaxed"
                      style={{
                        fontFamily:
                          "var(--font-inter, system-ui, sans-serif)",
                        fontSize: "0.875rem",
                        color:
                          "color-mix(in srgb, var(--color-dark) 70%, transparent)",
                      }}
                    >
                      {b.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6">
        <PawDivider />
      </div>
    </section>
  );
}

const BULLETS: { title: string; body: string }[] = [
  {
    title: "Compatibility score",
    body:
      "Traits, health, genetic diversity and proximity — weighted, transparent.",
  },
  {
    title: "Verified status, on every record",
    body:
      "Sage check = verified by a vet. Sand dot = self-reported. Always.",
  },
  {
    title: "Auto-flagged risks",
    body:
      "Shared recessive genes or a COI over 12.5% caps the score at 30.",
  },
];

function Check() {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" fill="none" aria-hidden="true">
      <path
        d="M2 6.5 5 9.5 10 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
