"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";

import { PhoneMockup } from "@/components/marketing/PhoneMockup";
import { PetPhotoGrid } from "@/components/marketing/PetPhotoGrid";
import { MatchCardsRow } from "@/components/marketing/MatchCardsRow";
import { ModeToggle } from "@/components/marketing/ModeToggle";
import { PromisesSection } from "@/components/marketing/PromisesSection";
import { MatchCardSection } from "@/components/marketing/MatchCardSection";
import { useTheme } from "@/components/providers/ThemeProvider";

const TERRA = "#C94B2A";
const TERRA_LT = "#E8593C";
const CREAM = "#F5EFE6";
const DARK = "#1C1008";
const VERIFIED = "#1D9E75";

export default function MarketingHero() {
  const { theme, toggle } = useTheme();
  const mode = theme;
  const { data: session } = useSession();
  const signedIn = Boolean(session?.user);

  const isDark = mode === "dark";

  return (
    <div
      className="relative"
      style={{
        color: isDark ? CREAM : DARK,
        fontFamily: "var(--font-inter, system-ui, sans-serif)",
      }}
    >
        {/* Top nav */}
        <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6" style={{ zIndex: "var(--z-nav)" as unknown as number }}>
          <Link
            href="/"
            className="leading-none"
            style={{
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontSize: 26,
              fontWeight: 900,
              color: isDark ? CREAM : TERRA,
              letterSpacing: -0.5,
            }}
          >
            PawMatch
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <ModeToggle mode={mode} onToggle={toggle} />
            <Link
              href={signedIn ? "/dashboard" : "/login"}
              className="rounded-full px-5 py-2 text-sm font-semibold transition-[background,color,border-color,transform] duration-200 hover:-translate-y-[1px]"
              style={
                isDark
                  ? {
                      background: "rgba(201,75,42, 0.14)",
                      border: `1.5px solid rgba(201,75,42, 0.4)`,
                      color: CREAM,
                    }
                  : {
                      background: "transparent",
                      border: `1.5px solid ${TERRA}`,
                      color: TERRA,
                    }
              }
            >
              {signedIn ? "My Pets" : "Sign In"}
            </Link>
          </div>
        </header>

        {/* Content */}
        <div className="relative z-10">
          {isDark ? (
            <DarkContent signedIn={signedIn} />
          ) : (
            <LightContent signedIn={signedIn} />
          )}
        </div>

      {/* New: Section 2 + Section 3 */}
      <PromisesSection />
      <MatchCardSection />
    </div>
  );
}

/* ─── LIGHT MODE ─────────────────────────────────────────────────────── */

function LightContent({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 pt-8 pb-24 md:grid-cols-[1.05fr_0.95fr] md:gap-16 md:pt-16 md:pb-32">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <p
          className="mb-6"
          style={{
            fontFamily: "var(--font-inter, system-ui, sans-serif)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.22em",
            color: TERRA,
            textTransform: "uppercase",
          }}
        >
          VOL. 01 · A REGISTRY OF RESPONSIBLE PAIRINGS
        </p>

        <h1
          className="text-balance leading-[1.02] tracking-tight"
          style={{
            fontFamily: "var(--font-playfair, Georgia, serif)",
            fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
            fontWeight: 900,
            color: DARK,
          }}
        >
          Find a{" "}
          <span style={{ position: "relative", display: "inline-block" }}>
            <em style={{ color: TERRA, fontStyle: "italic" }}>soulmate</em>
            <UnderlineSwoosh />
          </span>
          <br />
          for your pet.
        </h1>

        <p
          className="mt-8 max-w-xl text-balance leading-relaxed"
          style={{
            fontFamily: "var(--font-inter, system-ui, sans-serif)",
            fontSize: 17,
            color: "#3D2A1A",
          }}
        >
          PawMatch is the home of careful, considered breeding —{" "}
          <em style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}>verified</em>{" "}
          live photos, health records you can trust, and an algorithm that flags
          dangerous pairings before they happen.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          {signedIn ? (
            <>
              <PrimaryButton href="/dashboard">Go to my pets</PrimaryButton>
              <GhostButton href="/dashboard/pets/new">Add another pet</GhostButton>
            </>
          ) : (
            <>
              <PrimaryButton href="/register">Create an account</PrimaryButton>
              <GhostButton href="/login">I already have an account</GhostButton>
            </>
          )}
        </div>

        <div
          className="mt-12 flex flex-wrap items-center gap-x-7 gap-y-3"
          style={{ fontSize: 13, color: "#3D2A1A" }}
        >
          <TrustTag>Live photo</TrustTag>
          <TrustTag>Verified records</TrustTag>
          <TrustTag>Auto-flagged risks</TrustTag>
        </div>
      </motion.div>

      <motion.div
        className="relative flex justify-center pt-8 md:pt-0"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      >
        <PhoneMockup />
      </motion.div>
    </div>
  );
}

function UnderlineSwoosh() {
  return (
    <svg
      viewBox="0 0 200 14"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: -6,
        width: "100%",
        height: 12,
        color: `${TERRA}88`,
      }}
    >
      <path
        d="M2 10 Q 60 -2, 120 8 T 198 6"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TrustTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span style={{ color: VERIFIED }} aria-hidden="true">
        <Check size={13} />
      </span>
      <span>{children}</span>
    </span>
  );
}

function Check({ size = 13 }: { size?: number }) {
  return (
    <svg viewBox="0 0 12 12" width={size} height={size} fill="none" aria-hidden="true">
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

/* ─── DARK MODE ──────────────────────────────────────────────────────── */

function DarkContent({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <div className="relative">
      <PetPhotoGrid />

      <motion.div
        className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-6 pt-16 pb-12 text-center md:pt-24"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <p
          className="mb-6 inline-flex items-center gap-2"
          style={{
            fontFamily: "var(--font-inter, system-ui, sans-serif)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.22em",
            color: TERRA,
            textTransform: "uppercase",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 9999,
              background: TERRA,
              boxShadow: `0 0 12px ${TERRA}`,
            }}
          />
          2,841 PETS MATCHED
        </p>

        <h1
          className="text-balance leading-[1.02] tracking-tight"
          style={{
            fontFamily: "var(--font-playfair, Georgia, serif)",
            fontSize: "clamp(2.5rem, 6.5vw, 5rem)",
            fontWeight: 900,
            color: CREAM,
          }}
        >
          Find a <em style={{ color: TERRA_LT, fontStyle: "italic" }}>perfect</em> match
        </h1>

        <p
          className="mt-6"
          style={{
            fontFamily: "var(--font-inter, system-ui, sans-serif)",
            fontSize: 17,
            color: "rgba(245,239,230, 0.78)",
          }}
        >
          Genetic compatibility · Verified records
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <PrimaryButton href={signedIn ? "/dashboard" : "/register"}>
            {signedIn ? "Find a match" : "Find a match"}
          </PrimaryButton>
          <DarkGhostButton href="/dashboard">Browse pets</DarkGhostButton>
        </div>

        <div className="mt-14 grid w-full grid-cols-3 gap-4 max-w-md">
          <Stat value="2,841" label="Verified" />
          <Stat value="94%" label="Accuracy" />
          <Stat value="1,204" label="Pairs" />
        </div>
      </motion.div>

      <motion.div
        className="relative z-10 mx-auto max-w-5xl px-6 pb-20"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <MatchCardsRow />
      </motion.div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <p
        className="leading-none"
        style={{
          fontFamily: "var(--font-playfair, Georgia, serif)",
          fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
          fontWeight: 900,
          color: CREAM,
        }}
      >
        {value}
      </p>
      <p
        className="mt-1"
        style={{
          fontFamily: "var(--font-inter, system-ui, sans-serif)",
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(245,239,230, 0.55)",
        }}
      >
        {label}
      </p>
    </div>
  );
}

/* ─── Buttons ────────────────────────────────────────────────────────── */

function PrimaryButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-[background,transform,box-shadow] duration-150"
      style={{
        background: TERRA,
        color: "#fff",
        boxShadow: "0 1px 2px rgba(28,16,8,0.08)",
        fontFamily: "var(--font-inter, system-ui, sans-serif)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#B03E22";
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = "0 6px 20px rgba(201,75,42,0.35)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = TERRA;
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 1px 2px rgba(28,16,8,0.08)";
      }}
    >
      {children}
    </Link>
  );
}

function GhostButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-[background,border-color,color] duration-150"
      style={{
        border: `2px solid ${TERRA}`,
        color: TERRA,
        background: "transparent",
        fontFamily: "var(--font-inter, system-ui, sans-serif)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(201,75,42, 0.06)";
        e.currentTarget.style.borderColor = "rgba(201,75,42, 0.55)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.borderColor = TERRA;
      }}
    >
      {children}
    </Link>
  );
}

function DarkGhostButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-[background,border-color,color] duration-150"
      style={{
        border: `1.5px solid rgba(232,213,183, 0.4)`,
        color: CREAM,
        background: "rgba(245,239,230, 0.05)",
        fontFamily: "var(--font-inter, system-ui, sans-serif)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(245,239,230, 0.12)";
        e.currentTarget.style.borderColor = "rgba(232,213,183, 0.7)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(245,239,230, 0.05)";
        e.currentTarget.style.borderColor = "rgba(232,213,183, 0.4)";
      }}
    >
      {children}
    </Link>
  );
}
