"use client";

/**
 * Spinning circular seal with textPath. Sits over the phone mockup top-left.
 * Inner paw glyph matches the canvas drawPaw geometry.
 */
export function LivePhotoBadge({ size = 110 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className="select-none"
      style={{ animation: "lpb-spin 12s linear infinite" }}
      aria-hidden="true"
    >
      <defs>
        <path
          id="lpb-circle"
          d="M 60,60 m -46,0 a 46,46 0 1,1 92,0 a 46,46 0 1,1 -92,0"
        />
      </defs>

      <circle
        cx="60"
        cy="60"
        r="58"
        fill="rgba(253,248,242, 0.9)"
        stroke="rgba(201,75,42, 0.2)"
        strokeWidth="1"
      />

      <text
        fill="#C94B2A"
        style={{
          fontFamily: "var(--font-inter, system-ui, sans-serif)",
          fontSize: "7.5px",
          letterSpacing: "3.8px",
          fontWeight: 600,
        }}
      >
        <textPath href="#lpb-circle">
          LIVE PHOTO · VERIFIED · LIVE PHOTO · VERIFIED ·
        </textPath>
      </text>

      <g transform="translate(60 60)" fill="#C94B2A">
        {/* Geometry mirrors canvas drawPaw at size = 30 */}
        <ellipse cx="0" cy="5.4" rx="13.2" ry="10.8" />
        <ellipse cx="-11.4" cy="-6.6" rx="6.0" ry="5.1" transform="rotate(-21.77 -11.4 -6.6)" />
        <ellipse cx="11.4" cy="-6.6" rx="6.0" ry="5.1" transform="rotate(21.77 11.4 -6.6)" />
        <ellipse cx="-6" cy="-13.2" rx="5.4" ry="4.5" transform="rotate(-10.31 -6 -13.2)" />
        <ellipse cx="6" cy="-13.2" rx="5.4" ry="4.5" transform="rotate(10.31 6 -13.2)" />
      </g>

      <style>{`
        @keyframes lpb-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          svg[aria-hidden="true"] { animation: none !important; }
        }
      `}</style>
    </svg>
  );
}
