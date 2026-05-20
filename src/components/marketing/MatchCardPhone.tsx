"use client";

import Image from "next/image";

const TERRA = "#C94B2A";
const DARK = "#1C1008";
const CREAM = "#F5EFE6";
const VERIFIED = "#1D9E75";

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
        className="absolute -right-3 top-12 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-white"
        style={{
          border: `2.5px solid ${TERRA}`,
          boxShadow: "0 8px 20px -8px rgba(28,16,8,0.25)",
          fontFamily: "var(--font-playfair, Georgia, serif)",
          color: TERRA,
        }}
      >
        <span className="text-xl font-black">92</span>
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
            className="pointer-events-none absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full"
            style={{ background: DARK }}
          />

          <div className="relative flex flex-col gap-3 p-4 pt-9">
            {/* Pet photo with overlays */}
            <div
              className="relative overflow-hidden"
              style={{ borderRadius: 12, height: 220 }}
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
                color: DARK,
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
                  color: DARK,
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
                  color: DARK,
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
