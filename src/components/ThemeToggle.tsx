"use client";

import { useEffect, useState } from "react";

import { useTheme } from "@/components/providers/ThemeProvider";

export function ThemeToggle({
  size = 40,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const { theme, toggle } = useTheme();
  // The theme is read from <html data-theme>, which is set by an inline boot
  // script before React hydrates. That value isn't available on the server,
  // so we render a neutral placeholder on the first pass and reveal the real
  // sun/moon icon after mount — prevents the hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      suppressHydrationWarning
      aria-label={mounted ? (isDark ? "Switch to light mode" : "Switch to dark mode") : "Toggle theme"}
      title={mounted ? (isDark ? "Switch to light mode" : "Switch to dark mode") : "Toggle theme"}
      className={
        "inline-flex items-center justify-center rounded-full border transition-[background,border-color,color,transform] duration-200 hover:scale-[1.06] active:scale-95 " +
        className
      }
      style={{
        width: size,
        height: size,
        background: isDark ? "rgba(245,239,230, 0.06)" : "rgba(201,75,42, 0.04)",
        borderColor: isDark ? "rgba(232,213,183, 0.35)" : "rgba(201,75,42, 0.3)",
        color: isDark ? "#F5EFE6" : "#C94B2A",
      }}
    >
      {mounted ? (
        <span
          key={isDark ? "sun" : "moon"}
          style={{ animation: "tt-pop 220ms ease both", display: "inline-flex" }}
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
        </span>
      ) : (
        // Empty placeholder so SSR + first client paint match (no icon yet).
        <span aria-hidden="true" style={{ width: 16, height: 16, display: "inline-flex" }} />
      )}
      <style>{`
        @keyframes tt-pop {
          0%   { transform: scale(0.6) rotate(-20deg); opacity: 0; }
          60%  { transform: scale(1.12) rotate(0deg);  opacity: 1; }
          100% { transform: scale(1)    rotate(0deg);  opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes tt-pop { from { opacity: 1; } to { opacity: 1; } }
        }
      `}</style>
    </button>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M16 11.5A6.5 6.5 0 0 1 8.5 4a6.5 6.5 0 1 0 7.5 7.5z"
        fill="currentColor"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <circle cx="10" cy="10" r="3.5" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M10 2v2" />
        <path d="M10 16v2" />
        <path d="M2 10h2" />
        <path d="M16 10h2" />
        <path d="M4.5 4.5 6 6" />
        <path d="M14 14l1.5 1.5" />
        <path d="M4.5 15.5 6 14" />
        <path d="M14 6l1.5-1.5" />
      </g>
    </svg>
  );
}
