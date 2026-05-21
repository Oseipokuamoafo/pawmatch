"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import { PawDivider } from "./PawDivider";

const DARK = "#1C1008";
const TERRA = "#C94B2A";

/**
 * Marketing section that sells the vet network — the trust pillar.
 *
 * Three columns of features above a stats panel pulled from /api/vets-public
 * (or a sensible fallback when the API isn't reachable). Mirrors the
 * editorial rhythm of PromisesSection: eyebrow → serif headline → grid.
 */
export function VetNetworkSection() {
  const reduce = useReducedMotion();

  return (
    <section className="relative z-10">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <header className="max-w-3xl">
          <p className="eyebrow">A network of real vets</p>
          <h2
            className="mt-4 text-balance leading-tight tracking-tight text-dark"
            style={{
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontWeight: 900,
              fontSize: "clamp(2.25rem, 5vw, 3.75rem)",
            }}
          >
            Every record,{" "}
            <em style={{ color: TERRA, fontStyle: "italic" }}>signed</em>
            <br className="hidden sm:block" /> by a licensed vet.
          </h2>
          <p
            className="mt-6 max-w-2xl leading-relaxed"
            style={{
              fontFamily: "var(--font-inter, system-ui, sans-serif)",
              fontSize: 17,
              color: "color-mix(in srgb, var(--color-dark) 78%, transparent)",
            }}
          >
            We cross-reference every applying veterinarian against their state
            board, then a human reviewer signs off. The vets who pass become
            the only ones who can verify health records on PawMatch — so when
            you see a vet-signed badge, it actually means something.
          </p>
        </header>

        {/* ── Three features ─────────────────────────────────────────── */}
        <div className="mt-16 grid grid-cols-1 gap-12 md:mt-20 md:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.article
              key={f.title}
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
                <f.Icon />
              </div>
              <h3
                className="mt-6 leading-snug text-balance"
                style={{
                  fontFamily: "var(--font-playfair, Georgia, serif)",
                  fontWeight: 700,
                  fontSize: "1.5rem",
                  color: DARK,
                }}
              >
                {f.title}
              </h3>
              <p
                className="mt-3 leading-relaxed"
                style={{
                  fontFamily: "var(--font-inter, system-ui, sans-serif)",
                  fontSize: "1rem",
                  color:
                    "color-mix(in srgb, var(--color-dark) 75%, transparent)",
                }}
              >
                {f.body}
              </p>
            </motion.article>
          ))}
        </div>

        {/* ── CTA strip ──────────────────────────────────────────────── */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-20 flex flex-wrap items-center justify-between gap-6 rounded-3xl border border-sand bg-surface/60 px-6 py-8 md:px-10 md:py-10"
        >
          <div className="max-w-xl">
            <p className="eyebrow">For veterinarians</p>
            <p
              className="mt-2 leading-snug"
              style={{
                fontFamily: "var(--font-playfair, Georgia, serif)",
                fontWeight: 800,
                fontSize: "1.5rem",
                color: DARK,
              }}
            >
              You don&apos;t need a pet to join.
            </p>
            <p className="mt-2 text-sm text-dark-muted leading-relaxed">
              Apply as a vet, get auto-screened against your state board, and
              start co-signing records the next day. No breeding interest,
              no pet profile — just your license.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/vets"
              className="rounded-full border border-sand bg-surface px-5 py-2.5 text-sm font-semibold text-dark transition hover:border-terracotta/40 hover:text-terracotta"
            >
              See our vets →
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-terracotta px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#B03E22]"
            >
              Apply as a vet
            </Link>
          </div>
        </motion.div>
      </div>

      <div className="mx-auto max-w-6xl px-6">
        <PawDivider />
      </div>
    </section>
  );
}

/* ─── Feature data ───────────────────────────────────────────────────── */

const FEATURES: {
  title: string;
  body: string;
  Icon: () => React.ReactElement;
}[] = [
  {
    title: "State-board verified",
    body:
      "Every vet's license is cross-referenced against their state veterinary medical board. If the record doesn't match, they don't get the badge.",
    Icon: StethoscopeIcon,
  },
  {
    title: "Auto-screened in minutes",
    body:
      "Our AI screen drafts a verdict the moment a vet applies — cited evidence, confidence score. A human admin signs off; high-confidence matches are approved within minutes.",
    Icon: BoltIcon,
  },
  {
    title: "Co-signed records, not just claimed",
    body:
      "When an owner self-reports a vaccine or DNA result, they can request a real vet's co-signature. Signed records carry the vet's name and practice — front and centre on every match.",
    Icon: SignedIcon,
  },
];

/* ─── Icons (terracotta stroke via currentColor) ─────────────────────── */

function StethoscopeIcon() {
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
      <path d="M7.5 4 v6 a5 5 0 0 0 10 0 v-6" />
      <path d="M12.5 18 a5 5 0 0 0 10 0 v-3" />
      <circle cx="22.5" cy="15" r="2.5" />
      <path d="M9 18.5 L11 19" />
    </svg>
  );
}

function BoltIcon() {
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
      <path d="M15.5 3 L7 16 H13 L12.5 25 L21 12 H15 L15.5 3 Z" />
    </svg>
  );
}

function SignedIcon() {
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
      <rect x="3.5" y="5.5" width="21" height="14" rx="2.5" />
      <path d="M6 11 L11 11 M6 14 L14 14" />
      <path
        d="M16 18 c1.5 -2.5 3.5 -4 5.5 -4 c-2 2 -3 3.5 -3 5 L21 19"
        strokeWidth="1.7"
      />
    </svg>
  );
}
