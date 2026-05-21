"use client";

import Image from "next/image";

const TERRA = "#C94B2A";
const VERIFIED = "#1D9E75";

/** iPhone 16 Pro Max titanium bezel — vertical gradient stays dark in both themes */
const BEZEL_GRADIENT =
  "linear-gradient(180deg, #2A1F18 0%, #1C1208 35%, #100A06 65%, #1C1208 100%)";
const BUTTON_COLOR = "#0F0905";

// Theme-aware tokens (light → dark via globals.css [data-theme="dark"]):
//   var(--color-surface)     — white   → #261810
//   var(--color-dark)        — #1C1008 → #F5EFE6 (primary text)
//   var(--color-dark-muted)  — #3D2A1A → rgba(245,239,230,.65)

/**
 * Section-3 phone mockup variant.
 *
 * Same frame DNA as the hero `PhoneMockup` (rounded-[38px], dark frame, 10px pad,
 * cream screen, score circle top-right) but with these overrides:
 *  - White-pill "LIVE VERIFIED" badge (not bordered) overlaid on the photo top-left
 *  - Score circle reads "92" instead of "88"
 *  - No floating stat card
 *  - No rotating LivePhotoBadge
 *  - Name + meta overlaid on the photo with a soft gradient for legibility
 *  - Health-records line + sage "DNA ✓" pill
 *  - Caution banner (auto-flag) at the bottom of the screen
 */
export function MatchCardPhone() {
  return (
    <div className="relative mx-auto" style={{ width: 320 }}>
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
        <span className="text-xl font-black">92</span>
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
            className="pointer-events-none absolute left-1/2 top-[10px] z-10 h-[26px] w-[105px] -translate-x-1/2 rounded-full"
            style={{
              background: "#000",
              boxShadow: "inset 0 1px 2px rgba(255,255,255,0.05)",
            }}
            aria-hidden="true"
          />

          <div className="relative flex h-full flex-col gap-3 p-4 pt-12">
            {/* Pet photo with overlays */}
            <div
              className="relative overflow-hidden"
              style={{ borderRadius: 16, height: 380 }}
            >
              <Image
                src="https://images.unsplash.com/photo-1552053831-71594a27632d?w=400&h=400&fit=crop&crop=face"
                alt="Luna, golden retriever"
                fill
                sizes="300px"
                className="object-cover"
              />

              {/* Top-left: white pill, sage check + sage text */}
              <div
                className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-1"
                style={{
                  color: VERIFIED,
                  fontFamily: "var(--font-inter, system-ui, sans-serif)",
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: 0.4,
                  boxShadow: "0 4px 12px -4px rgba(0,0,0,0.2)",
                }}
              >
                <CheckTick size={9} />
                LIVE VERIFIED
              </div>

              {/* Bottom gradient + name + COI */}
              <div
                className="absolute inset-x-0 bottom-0 px-3 pb-3 pt-10"
                style={{
                  background:
                    "linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0))",
                }}
              >
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <p
                      className="leading-none drop-shadow"
                      style={{
                        fontFamily: "var(--font-playfair, Georgia, serif)",
                        fontSize: 22,
                        fontWeight: 900,
                        color: "#fff",
                      }}
                    >
                      Luna
                    </p>
                    <p
                      className="mt-1"
                      style={{
                        fontFamily: "var(--font-inter, system-ui, sans-serif)",
                        fontSize: 12,
                        color: "rgba(255,255,255,0.88)",
                      }}
                    >
                      Golden Retriever · 2y 4mo · ♀
                    </p>
                  </div>
                  <span
                    className="rounded-full px-2 py-0.5"
                    style={{
                      background: "rgba(29,158,117,0.95)",
                      color: "#fff",
                      fontFamily: "var(--font-inter, system-ui, sans-serif)",
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  >
                    COI 4.1%
                  </span>
                </div>
              </div>
            </div>

            {/* Records line + DNA pill */}
            <div
              className="flex items-center justify-between"
              style={{
                fontFamily: "var(--font-inter, system-ui, sans-serif)",
                fontSize: 11,
                color: "var(--color-dark)",
              }}
            >
              <span>7 health records · 4 verified</span>
              <span
                className="rounded-full px-2 py-0.5"
                style={{
                  background: "rgba(29,158,117,0.15)",
                  color: VERIFIED,
                  fontSize: 10,
                  fontWeight: 600,
                }}
              >
                DNA ✓
              </span>
            </div>

            {/* Caution banner */}
            <div
              className="rounded-2xl px-3 py-2.5"
              style={{
                background: "rgba(201,75,42, 0.08)",
                border: "1px solid rgba(201,75,42, 0.25)",
              }}
            >
              <p
                className="leading-snug"
                style={{
                  fontFamily: "var(--font-inter, system-ui, sans-serif)",
                  fontSize: 13,
                  color: "var(--color-dark)",
                }}
              >
                <strong style={{ color: TERRA, fontWeight: 700 }}>
                  Caution:
                </strong>{" "}
                Shared recessive (HUU) with your pet.
              </p>
              <p
                className="leading-snug"
                style={{
                  fontFamily: "var(--font-inter, system-ui, sans-serif)",
                  fontSize: 13,
                  color: "var(--color-dark)",
                  marginTop: 2,
                }}
              >
                Auto-flagged — review carefully before matching.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckTick({ size = 10 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 12 12"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
    >
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
