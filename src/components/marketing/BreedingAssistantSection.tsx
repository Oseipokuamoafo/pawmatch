"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import { PawDivider } from "./PawDivider";

const DARK = "#1C1008";
const TERRA = "#C94B2A";

/**
 * Marketing section that sells the Phase 4 Claude API breeding assistant.
 *
 * Left column: an editorial chat-preview "card" that mimics the real
 * assistant UI (sand bubbles + terracotta bubbles, eyebrow label) —
 * rendered as static CSS, no API call. Right column: copy + CTA. Stacks
 * vertically under lg.
 */
export function BreedingAssistantSection() {
  const reduce = useReducedMotion();

  return (
    <section className="relative z-10">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2 lg:gap-20">
          {/* LEFT — chat preview */}
          <motion.div
            className="order-1 flex justify-center lg:order-none"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <ChatPreview />
          </motion.div>

          {/* RIGHT — copy */}
          <motion.div
            className="order-2 max-w-xl text-center lg:order-none lg:text-left lg:mx-0"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="eyebrow">AI · Pro+</p>
            <h2
              className="mt-4 text-balance leading-tight tracking-tight text-dark"
              style={{
                fontFamily: "var(--font-playfair, Georgia, serif)",
                fontWeight: 900,
                fontSize: "clamp(2.25rem, 5vw, 3.75rem)",
              }}
            >
              An assistant that&apos;s{" "}
              <em style={{ color: TERRA, fontStyle: "italic" }}>read</em>
              <br className="hidden sm:block" /> your pet&apos;s file.
            </h2>
            <p
              className="mt-6 max-w-xl leading-relaxed lg:mx-0 mx-auto"
              style={{
                fontFamily: "var(--font-inter, system-ui, sans-serif)",
                fontSize: 17,
                color: "color-mix(in srgb, var(--color-dark) 78%, transparent)",
              }}
            >
              Every Pro+ pet profile comes with a Claude-powered breeding
              advisor that&apos;s loaded the pet&apos;s health records, DNA
              results, breed reference, and your stated goals — and answers
              real questions about genetic risk, heat timing, and litter
              outcomes. General guidance, not a clinical recommendation.
            </p>

            <ul className="mt-8 space-y-3 text-left lg:mx-0 mx-auto inline-block lg:block">
              <Bullet>
                Knows the difference between a vet-co-signed record and an
                owner self-report — and tells you when the difference matters.
              </Bullet>
              <Bullet>
                Flags shared recessive markers and high-COI pairings before
                you ask, citing the breed&apos;s known risk list.
              </Bullet>
              <Bullet>
                Never invents data. If the answer isn&apos;t in your pet&apos;s
                file, it says so.
              </Bullet>
            </ul>

            <div className="mt-10 flex flex-wrap items-center gap-3 lg:justify-start justify-center">
              <Link
                href="/register"
                className="rounded-full bg-terracotta px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#B03E22]"
              >
                Start a profile
              </Link>
              <span className="text-[12px] text-dark-muted">
                Unlocks at $19.99 / mo
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6">
        <PawDivider />
      </div>
    </section>
  );
}

/* ─── Bullet ─────────────────────────────────────────────────────────── */

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li
      className="flex items-start gap-3 leading-relaxed"
      style={{
        fontFamily: "var(--font-inter, system-ui, sans-serif)",
        fontSize: 15,
        color: "color-mix(in srgb, var(--color-dark) 80%, transparent)",
      }}
    >
      <span
        aria-hidden="true"
        className="mt-1.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full"
        style={{ background: TERRA, color: "#fff" }}
      >
        <svg viewBox="0 0 12 12" fill="none" className="h-2 w-2">
          <path
            d="M2 6.5 5 9.5 10 3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span>{children}</span>
    </li>
  );
}

/* ─── Chat preview card ──────────────────────────────────────────────── */

function ChatPreview() {
  return (
    <div
      className="relative w-full max-w-[420px] rounded-3xl border border-sand bg-surface p-5 md:p-6"
      style={{
        boxShadow:
          "0 28px 60px -25px rgba(28,16,8,0.25), 0 6px 18px -8px rgba(28,16,8,0.10)",
      }}
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="eyebrow" style={{ color: TERRA }}>
            AI · breeding assistant
          </p>
          <p
            className="mt-1 leading-none"
            style={{
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontWeight: 800,
              fontSize: "1.25rem",
              color: DARK,
            }}
          >
            Ask anything about Luna.
          </p>
        </div>
        <span
          aria-hidden="true"
          className="inline-flex h-2 w-2 rounded-full bg-[#1D9E75] animate-pulse"
        />
      </div>

      <ul className="space-y-3">
        <UserBubble>
          Is Luna&apos;s breed at risk for any recessive genes I should know
          about before breeding?
        </UserBubble>
        <AssistantBubble>
          Yes — Labrador Retrievers commonly carry three recessive markers:
          <strong> EIC</strong> (exercise-induced collapse),{" "}
          <strong>PRA-prcd</strong>, and <strong>CNM</strong>. Luna&apos;s DNA
          panel shows her as a clear / non-carrier for EIC and PRA-prcd. CNM
          isn&apos;t in her current panel — before breeding, I&apos;d ask your
          vet to add it.
        </AssistantBubble>
        <UserBubble>What about her age — is she ready?</UserBubble>
        <AssistantBubble>
          Luna is 3.1 years old. For Labradors, the breed minimum for females
          is 2 years; vet recommendation is to wait until the second heat
          cycle. Per her record, she has 2 logged cycles. She&apos;s within
          the safe window.
        </AssistantBubble>
      </ul>

      {/* Composer */}
      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-sand bg-cream/40 px-3 py-2">
        <span className="text-sm text-dark-muted">
          Ask about Luna&apos;s breeding profile…
        </span>
      </div>
    </div>
  );
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex justify-end">
      <div
        className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed text-white"
        style={{ background: TERRA }}
      >
        {children}
      </div>
    </li>
  );
}

function AssistantBubble({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl bg-sand/60 px-4 py-2.5 text-sm leading-relaxed text-dark">
        <p
          className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: "color-mix(in srgb, var(--color-dark) 55%, transparent)" }}
        >
          Assistant
        </p>
        <div>{children}</div>
      </div>
    </li>
  );
}
