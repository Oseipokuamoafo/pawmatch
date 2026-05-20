import Link from "next/link";

import type { VerificationStatus } from "@/generated/prisma";

interface VerifyCTAProps {
  /** Existing application status if any */
  status: VerificationStatus | null;
}

/**
 * Inline dashboard banner urging unverified breeders to apply. Renders
 * different copy depending on whether they have a pending / rejected
 * application already.
 */
export function VerifyCTA({ status }: VerifyCTAProps) {
  const config =
    status === "PENDING"
      ? {
          eyebrow: "Verification · in review",
          title: "Your application is being reviewed.",
          body: "We'll email you within 72 hours. Track the status on your verification page.",
          cta: "View status",
        }
      : status === "REJECTED"
        ? {
            eyebrow: "Verification · needs attention",
            title: "Your application wasn't approved.",
            body: "Open your verification page to see the reviewer notes and reapply.",
            cta: "See notes",
          }
        : {
            eyebrow: "Become a Verified Breeder",
            title: "Get the badge that earns trust.",
            body: "Submit your kennel-club docs and a quick program note — owners looking for responsible breeders see you first.",
            cta: "Get verified",
          };

  return (
    <section
      aria-label="Breeder verification"
      className="relative overflow-hidden rounded-3xl border p-6 sm:p-8"
      style={{
        background:
          "linear-gradient(135deg, rgba(54,121,210,0.08), rgba(54,121,210,0.02) 60%)",
        borderColor: "rgba(54,121,210,0.25)",
      }}
    >
      {/* Decorative shield watermark */}
      <Shield
        className="pointer-events-none absolute -right-6 -top-6 h-40 w-40"
        style={{ color: "rgba(54,121,210,0.10)" }}
      />

      <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: "#3679D2" }}
          >
            {config.eyebrow}
          </p>
          <h2
            className="mt-2 leading-tight tracking-tight text-dark text-balance"
            style={{
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontWeight: 900,
              fontSize: "clamp(1.5rem, 3vw, 1.875rem)",
            }}
          >
            {config.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-dark-muted">
            {config.body}
          </p>
        </div>

        <Link
          href="/dashboard/verify"
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-[background,transform,box-shadow] duration-150 hover:-translate-y-[1px]"
          style={{
            background: "#3679D2",
            boxShadow: "0 6px 20px rgba(54,121,210,0.30)",
          }}
        >
          <Shield className="h-4 w-4" style={{ color: "#fff" }} />
          {config.cta}
        </Link>
      </div>
    </section>
  );
}

function Shield({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 14 14"
      fill="currentColor"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d="M7 0.6 L12.4 2.4 V6.8 c0 3.1 -2.2 5.6 -5.4 6.6 -3.2 -1 -5.4 -3.5 -5.4 -6.6 V2.4 L7 0.6 z" />
      <path
        d="M4.4 7 L6.2 8.8 L9.6 5.4"
        stroke="#FFFFFF"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
