"use client";

import Image from "next/image";

import { LivePhotoBadge } from "./LivePhotoBadge";

const TERRA = "#C94B2A";
const DARK = "#1C1008";
const CREAM = "#F5EFE6";
const VERIFIED = "#1D9E75";

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
        className="absolute -right-3 top-12 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-white"
        style={{
          border: `2.5px solid ${TERRA}`,
          boxShadow: "0 8px 20px -8px rgba(28,16,8,0.25)",
          fontFamily: "var(--font-playfair, Georgia, serif)",
          color: TERRA,
        }}
      >
        <span className="text-xl font-black">88</span>
      </div>

      {/* Phone frame */}
      <div
        className="relative"
        style={{
          background: DARK,
          borderRadius: 38,
          padding: 10,
          boxShadow: "0 40px 60px -25px rgba(28,16,8,0.45)",
        }}
      >
        <div
          className="relative overflow-hidden"
          style={{ background: CREAM, borderRadius: 30 }}
        >
          {/* Notch */}
          <div
            className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full"
            style={{ background: DARK }}
          />

          <div className="relative flex flex-col gap-3 p-4 pt-9">
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
            <div className="relative overflow-hidden" style={{ borderRadius: 12, height: 200 }}>
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
                  color: DARK,
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
                color: "#3D2A1A",
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
                color: DARK,
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
        className="absolute -bottom-6 -right-6 z-30 rounded-2xl bg-white px-4 py-3"
        style={{
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
            color: DARK,
          }}
        >
          2,431
        </p>
        <p
          className="mt-1"
          style={{
            fontFamily: "var(--font-inter, system-ui, sans-serif)",
            fontSize: 10,
            color: "#3D2A1A",
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
        background: "#E8D5B7",
        color: DARK,
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
