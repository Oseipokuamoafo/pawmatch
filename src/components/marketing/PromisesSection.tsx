"use client";

import { motion, useReducedMotion } from "framer-motion";

import { PawDivider } from "./PawDivider";

const DARK = "#1C1008";

/**
 * Section 2 — "Three Promises". Three-column grid with line-art icons,
 * Roman numerals in serif italic, headlines, body copy. Cream surface
 * (theme-aware), closes with a paw divider.
 */
export function PromisesSection() {
  const reduce = useReducedMotion();

  return (
    <section className="relative z-10">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <header className="max-w-3xl">
          <p className="eyebrow">What you can trust</p>
          <h2
            className="mt-4 text-balance leading-tight tracking-tight text-dark"
            style={{
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontWeight: 900,
              fontSize: "clamp(2.25rem, 5vw, 3.75rem)",
            }}
          >
            Three small promises
            <br className="hidden sm:block" /> that change everything.
          </h2>
        </header>

        <div className="mt-16 grid grid-cols-1 gap-12 md:mt-20 md:grid-cols-3">
          {PROMISES.map((p, i) => (
            <motion.article
              key={p.numeral}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{
                duration: 0.6,
                delay: i * 0.08,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="text-terracotta"
            >
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-terracotta/25 bg-terracotta/[0.06]">
                <p.Icon />
              </div>

              <p
                className="mt-8 leading-none"
                style={{
                  fontFamily: "var(--font-playfair, Georgia, serif)",
                  fontStyle: "italic",
                  fontWeight: 700,
                  fontSize: "2.5rem",
                  color: "#C94B2A",
                }}
              >
                {p.numeral}
              </p>

              <h3
                className="mt-3 leading-snug text-balance"
                style={{
                  fontFamily: "var(--font-playfair, Georgia, serif)",
                  fontWeight: 700,
                  fontSize: "1.5rem",
                  color: DARK,
                }}
              >
                {p.title}
              </h3>

              <p
                className="mt-4 leading-relaxed text-balance"
                style={{
                  fontFamily: "var(--font-inter, system-ui, sans-serif)",
                  fontSize: "1rem",
                  color: "color-mix(in srgb, var(--color-dark) 75%, transparent)",
                }}
              >
                {p.body}
              </p>
            </motion.article>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6">
        <PawDivider />
      </div>
    </section>
  );
}

/* ─── Promises data ──────────────────────────────────────────────────── */

const PROMISES: {
  numeral: string;
  title: string;
  body: string;
  Icon: () => React.ReactElement;
}[] = [
  {
    numeral: "I.",
    title: "Live photo verification",
    body:
      "Every profile begins with a live capture — no gallery uploads, no stock photos, no doubt about who's on the other side of the screen.",
    Icon: CameraIcon,
  },
  {
    numeral: "II.",
    title: "Verified vs. self-reported",
    body:
      "Health and DNA records are clearly marked — what's been verified by a vet, what hasn't, and what we're still waiting on. No grey area.",
    Icon: ShieldCheckIcon,
  },
  {
    numeral: "III.",
    title: "Risks, flagged automatically",
    body:
      "Shared recessive genes, dangerous COI, underage pairings — the algorithm catches them before you do. Soft warnings, hard caps where it matters.",
    Icon: SparkleIcon,
  },
];

/* ─── Inline SVG icons (terracotta stroke via currentColor) ──────────── */

function CameraIcon() {
  return (
    <svg
      viewBox="0 0 28 28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="28"
      height="28"
      aria-hidden="true"
    >
      <rect x="2.5" y="7.5" width="23" height="16" rx="3" />
      <path d="M9 7.5l1.8-3h6.4l1.8 3" />
      <circle cx="14" cy="15.5" r="4.5" />
      <path d="M11.8 15.7 L13.5 17.4 L16.4 14.3" strokeWidth="1.6" />
      <circle cx="21.5" cy="11" r="0.8" fill="currentColor" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg
      viewBox="0 0 28 28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="28"
      height="28"
      aria-hidden="true"
    >
      <path d="M14 3 L24 6 V14 c0 6 -4.2 10.6 -10 12.5 C8.2 24.6 4 20 4 14 V6 L14 3 Z" />
      <path d="M9 14 L12.5 17.5 L19 11" strokeWidth="1.7" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg
      viewBox="0 0 28 28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="28"
      height="28"
      aria-hidden="true"
    >
      <path d="M14 3 L16 12 L25 14 L16 16 L14 25 L12 16 L3 14 L12 12 Z" />
      <circle cx="22.5" cy="6" r="0.9" fill="currentColor" />
      <circle cx="5.5" cy="22.5" r="0.75" fill="currentColor" />
    </svg>
  );
}
