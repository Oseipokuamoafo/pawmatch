"use client";

import type { HeroMode } from "@/types/hero";

interface ModeToggleProps {
  mode: HeroMode;
  onToggle: () => void;
  /** "inline" sits in the header beside other nav. "fixed" pins top-right. */
  variant?: "inline" | "fixed";
}

/** Toggle the marketing page's light/dark mode. */
export function ModeToggle({ mode, onToggle, variant = "inline" }: ModeToggleProps) {
  const isDark = mode === "dark";

  const layoutClasses =
    variant === "fixed"
      ? "fixed right-6 top-6 z-[300] h-11 w-11"
      : "relative h-11 w-11";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`${layoutClasses} inline-flex items-center justify-center rounded-full transition-[background,border-color,color,transform] duration-200 hover:scale-[1.06] active:scale-95`}
      style={{
        background: isDark ? "rgba(245,239,230, 0.06)" : "rgba(201,75,42, 0.04)",
        border: `1.5px solid ${isDark ? "rgba(232,213,183, 0.4)" : "rgba(201,75,42, 0.35)"}`,
        color: isDark ? "#F5EFE6" : "#C94B2A",
        boxShadow: isDark
          ? "0 0 0 1px rgba(201,75,42, 0.18) inset"
          : "0 1px 2px rgba(28,16,8,0.05)",
      }}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
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
