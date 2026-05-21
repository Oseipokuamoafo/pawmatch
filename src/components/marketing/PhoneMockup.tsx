"use client";

import Image from "next/image";

import { LivePhotoBadge } from "./LivePhotoBadge";

const TERRA = "#C94B2A";
const VERIFIED = "#1D9E75";

/** iPhone 16 Pro Max titanium bezel — vertical gradient stays dark in both themes */
const BEZEL_GRADIENT =
  "linear-gradient(180deg, #2A1F18 0%, #1C1208 35%, #100A06 65%, #1C1208 100%)";
const BUTTON_COLOR = "#0F0905";

// Theme-aware tokens (light → dark via globals.css [data-theme="dark"]):
//   var(--color-surface)     — white   → #261810 (screen / stat card / score circle bg)
//   var(--color-dark)        — #1C1008 → #F5EFE6 (primary text inside the phone)
//   var(--color-dark-muted)  — #3D2A1A → rgba(245,239,230,.65) (sub-text)
//   var(--color-sand)        — #E8D5B7 → rgba(232,213,183,.18) (trait chips)

/**
 * Light-mode hero phone mockup with live-verified badge overlay,
 * score circle, and floating stat card.
 */
export function PhoneMockup() {
  return (
    <div className="relative mx-auto" style={{ width: 300 }}>
      {/* Spinning seal overlay */}
      <div className="absolute -left-7 -top-8 z-30">
        <LivePhotoBadge size={108} />
      </div>

      {/* Score circle */}
      <div
        className="absolute -right-3 top-12 z-30 flex h-14 w-14 items-center justify-center rounded-full"
        style={{
          background: "var(--color-surface)",
          border: `2.5px solid ${TERRA}`,
          boxShadow: "0 8px 20px -8px rgba(28,16,8,0.25)",
          fontFamily: "var(--font-playfair, Georgia, serif)",
          color: TERRA,
        }}
      >
        <span className="text-xl font-black">88</span>
      </div>

      {/* iPhone 16 Pro Max frame — 9:19.5 aspect ratio (77.6mm × 163mm) */}
      <div
        className="relative"
        style={{
          background: BEZEL_GRADIENT,
          borderRadius: 44,
          padding: 4,
          aspectRatio: "9 / 19.5",
          boxShadow:
            "0 40px 60px -25px rgba(28,16,8,0.45), inset 0 0 0 1.5px rgba(255,255,255,0.07)",
        }}
      >
        {/* ── Side buttons (titanium frame detail) ────────────────── */}
        {/* Left side: Action button, Volume up, Volume down */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute"
          style={{ left: -2, top: "17%", width: 3, height: "3.6%", background: BUTTON_COLOR, borderRadius: 2 }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute"
          style={{ left: -2, top: "23%", width: 3, height: "7.5%", background: BUTTON_COLOR, borderRadius: 2 }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute"
          style={{ left: -2, top: "32%", width: 3, height: "7.5%", background: BUTTON_COLOR, borderRadius: 2 }}
        />
        {/* Right side: Side button, Camera Control */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute"
          style={{ right: -2, top: "21%", width: 3, height: "11%", background: BUTTON_COLOR, borderRadius: 2 }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute"
          style={{ right: -2, top: "35%", width: 3, height: "4.5%", background: BUTTON_COLOR, borderRadius: 2 }}
        />

        <div
          className="relative h-full overflow-hidden"
          style={{ background: "var(--color-surface)", borderRadius: 40 }}
        >
          {/* Dynamic Island */}
          <div
            className="absolute left-1/2 top-[10px] z-10 h-[26px] w-[105px] -translate-x-1/2 rounded-full"
            style={{
              background: "#000",
              boxShadow: "inset 0 1px 2px rgba(255,255,255,0.05)",
            }}
            aria-hidden="true"
          />

          <div className="relative flex h-full flex-col gap-3 p-4 pt-12">
            {/* Live verified badge */}
            <div
              className="inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5"
              style={{
                border: `1px solid ${VERIFIED}`,
                color: VERIFIED,
                fontFamily: "var(--font-inter, system-ui, sans-serif)",
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: 0.4,
              }}
            >
              <CheckTick size={9} /> LIVE VERIFIED
            </div>

            {/* Pet photo */}
            <div className="relative overflow-hidden" style={{ borderRadius: 16, height: 340 }}>
              <Image
                src="https://images.unsplash.com/photo-1552053831-71594a27632d?w=400&h=400&fit=crop&crop=face"
                alt="Luna, golden retriever"
                fill
                sizes="280px"
                className="object-cover"
                priority
              />
            </div>

            {/* Name + COI pill */}
            <div className="flex items-center justify-between">
              <p
                className="leading-none"
                style={{
                  fontFamily: "var(--font-playfair, Georgia, serif)",
                  fontSize: 22,
                  fontWeight: 900,
                  color: "var(--color-dark)",
                }}
              >
                Luna
              </p>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ background: `${VERIFIED}1A`, color: VERIFIED }}
              >
                COI 4.1%
              </span>
            </div>

            <p
              style={{
                fontFamily: "var(--font-inter, system-ui, sans-serif)",
                fontSize: 9,
                color: "var(--color-dark-muted)",
              }}
            >
              Golden · 2y · ♂
            </p>

            {/* Health records line */}
            <div
              className="flex items-center gap-1.5"
              style={{
                fontFamily: "var(--font-inter, system-ui, sans-serif)",
                fontSize: 10,
                color: "var(--color-dark)",
              }}
            >
              <span>7 records · 4 verified</span>
              <span style={{ color: VERIFIED }} className="inline-flex items-center gap-0.5">
                DNA <ArrowRight />
              </span>
            </div>

            {/* Trait chips */}
            <div className="flex flex-wrap gap-1.5">
              <TraitChip>Gentle</TraitChip>
              <TraitChip>Active</TraitChip>
            </div>
          </div>
        </div>
      </div>

      {/* Floating stat card bottom-right */}
      <div
        className="absolute -bottom-6 -right-6 z-30 rounded-2xl px-4 py-3"
        style={{
          background: "var(--color-surface)",
          boxShadow: "0 18px 36px -10px rgba(28,16,8,0.22)",
          minWidth: 150,
        }}
      >
        <p
          className="leading-none"
          style={{
            fontFamily: "var(--font-playfair, Georgia, serif)",
            fontSize: 26,
            fontWeight: 900,
            color: "var(--color-dark)",
          }}
        >
          2,431
        </p>
        <p
          className="mt-1"
          style={{
            fontFamily: "var(--font-inter, system-ui, sans-serif)",
            fontSize: 10,
            color: "var(--color-dark-muted)",
          }}
        >
          / verified pets this season
        </p>
      </div>
    </div>
  );
}

function TraitChip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5"
      style={{
        background: "var(--color-sand)",
        color: "var(--color-dark)",
        fontFamily: "var(--font-inter, system-ui, sans-serif)",
        fontSize: 10,
        fontWeight: 500,
      }}
    >
      {children}
    </span>
  );
}

function ArrowRight() {
  return (
    <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" aria-hidden="true">
      <path
        d="M3 6h6m-2-3 3 3-3 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckTick({ size = 10 }: { size?: number }) {
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
