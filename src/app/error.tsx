"use client";

import { useEffect } from "react";
import Link from "next/link";

import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * Runtime error boundary. Plain page (no marketing canvas/cursor — those
 * are scoped to the (marketing) route group). `reset()` re-tries the
 * failing segment.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("Route-level error caught by error.tsx:", error);
    }
  }, [error]);

  return (
    <div
      className="relative flex min-h-screen flex-col"
      style={{ zIndex: "var(--z-content)" as unknown as number }}
    >
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="text-2xl font-black tracking-tight text-terracotta"
          style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}
        >
          PawMatch
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-20">
        <div className="relative max-w-xl text-center">
          <p
            style={{
              fontSize: 11,
              letterSpacing: "0.22em",
              fontWeight: 600,
              textTransform: "uppercase",
              color: "#C94B2A",
            }}
          >
            Something interrupted
          </p>

          <h1
            className="mt-4 text-balance leading-[1.05] tracking-tight text-dark"
            style={{
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontWeight: 900,
              fontSize: "clamp(2.5rem, 7vw, 4.5rem)",
            }}
          >
            We hit a{" "}
            <em style={{ color: "#C94B2A", fontStyle: "italic" }}>snag.</em>
          </h1>

          <p className="mt-6 text-balance text-base text-dark-muted leading-relaxed">
            Something on our side didn&apos;t respond cleanly. Try again, or
            head back to the registry — your data is safe.
          </p>

          {error?.digest && (
            <p className="mt-4 text-xs uppercase tracking-[0.18em] text-dark-muted/70">
              ref · {error.digest}
            </p>
          )}

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={reset} className="btn-primary">
              Try again
            </button>
            <Link href="/" className="btn-secondary">
              Back to PawMatch
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
