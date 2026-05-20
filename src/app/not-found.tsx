import Link from "next/link";

import { TopNav } from "@/components/TopNav";

export default function NotFound() {
  return (
    <div
      className="relative flex min-h-screen flex-col"
      style={{ zIndex: "var(--z-content)" as unknown as number }}
    >
      <TopNav />
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
            404 · No trail here
          </p>

          <h1
            className="mt-4 text-balance leading-[1.05] tracking-tight text-dark"
            style={{
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontWeight: 900,
              fontSize: "clamp(2.5rem, 7vw, 4.5rem)",
            }}
          >
            This page wandered{" "}
            <em style={{ color: "#C94B2A", fontStyle: "italic" }}>off-leash.</em>
          </h1>

          <p className="mt-6 text-balance text-base text-dark-muted leading-relaxed">
            We couldn&apos;t find what you&apos;re looking for. Try the home
            registry, or sign in to your dashboard.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link href="/" className="btn-primary">
              Back to PawMatch
            </Link>
            <Link href="/dashboard" className="btn-secondary">
              My pets
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
