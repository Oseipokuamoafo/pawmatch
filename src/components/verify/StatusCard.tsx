"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { SubmissionForm } from "./SubmissionForm";
import type { VerificationStatus } from "@/generated/prisma";

interface StatusCardProps {
  status: VerificationStatus;
  createdAt: Date | string;
  reviewedAt: Date | string | null;
  notes: string | null;
  programDescription: string;
  documents: string[];
}

export function StatusCard({
  status,
  createdAt,
  reviewedAt,
  notes,
  programDescription,
  documents,
}: StatusCardProps) {
  const [reapplying, setReapplying] = useState(false);
  const router = useRouter();

  if (reapplying) {
    return (
      <div className="space-y-4">
        <p
          className="text-sm text-dark-muted"
          aria-live="polite"
        >
          Editing a fresh application — your previous documents are pre-filled below.
        </p>
        <SubmissionForm initialDescription={programDescription} />
        <button
          type="button"
          onClick={() => {
            setReapplying(false);
            router.refresh();
          }}
          className="text-sm font-medium text-dark-muted hover:text-terracotta"
        >
          ← Back to status
        </button>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden p-0">
      <Header status={status} createdAt={createdAt} reviewedAt={reviewedAt} />

      <div className="space-y-6 p-6 md:p-8">
        {status === "REJECTED" && notes && (
          <div className="rounded-2xl border border-terracotta/30 bg-terracotta/[0.06] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta">
              Reviewer notes
            </p>
            <p className="mt-2 text-sm leading-relaxed text-dark">{notes}</p>
          </div>
        )}

        <section>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-dark-muted">
            Your program
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-dark">
            {programDescription}
          </p>
        </section>

        <section>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-dark-muted">
            Submitted documents ({documents.length})
          </p>
          <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {documents.map((url, i) => (
              <li
                key={url}
                className="aspect-square overflow-hidden rounded-card border border-sand bg-cream"
              >
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-full w-full items-center justify-center"
                >
                  {/^.+\.pdf(\?.*)?$/i.test(url) ? (
                    <span className="text-xs font-semibold uppercase tracking-wider text-terracotta">
                      PDF #{i + 1}
                    </span>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  )}
                </a>
              </li>
            ))}
          </ul>
        </section>

        {status === "REJECTED" && (
          <div className="border-t border-sand pt-6">
            <button
              type="button"
              onClick={() => setReapplying(true)}
              className="btn-primary"
            >
              Reapply
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Status header ──────────────────────────────────────────────────── */

function Header({
  status,
  createdAt,
  reviewedAt,
}: {
  status: VerificationStatus;
  createdAt: Date | string;
  reviewedAt: Date | string | null;
}) {
  const map: Record<
    VerificationStatus,
    { bg: string; border: string; chipBg: string; chipColor: string; label: string }
  > = {
    PENDING: {
      bg: "rgba(232,154,42,0.08)",
      border: "rgba(232,154,42,0.25)",
      chipBg: "rgba(232,154,42,0.15)",
      chipColor: "#B0731A",
      label: "Under review",
    },
    APPROVED: {
      bg: "rgba(29,158,117,0.08)",
      border: "rgba(29,158,117,0.25)",
      chipBg: "rgba(29,158,117,0.15)",
      chipColor: "#1D9E75",
      label: "Approved",
    },
    REJECTED: {
      bg: "rgba(201,75,42,0.06)",
      border: "rgba(201,75,42,0.25)",
      chipBg: "rgba(201,75,42,0.12)",
      chipColor: "#C94B2A",
      label: "Not approved",
    },
  };
  const s = map[status];

  const reviewedDate = reviewedAt ? new Date(reviewedAt) : null;
  const submittedDate = new Date(createdAt);

  return (
    <header
      className="border-b px-6 py-6 md:px-8"
      style={{ background: s.bg, borderColor: s.border }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: s.chipBg, color: s.chipColor }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: s.chipColor }}
            />
            {s.label}
          </span>
          {status === "APPROVED" && <VerificationBadge size="sm" />}
        </div>
        <p className="text-xs text-dark-muted">
          Submitted {submittedDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          {reviewedDate
            ? ` · reviewed ${reviewedDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
            : ""}
        </p>
      </div>

      <h2
        className="mt-4 leading-tight text-dark"
        style={{
          fontFamily: "var(--font-playfair, Georgia, serif)",
          fontWeight: 900,
          fontSize: "2rem",
        }}
      >
        {status === "PENDING" && (
          <>
            Your application is{" "}
            <em style={{ color: "#B0731A" }}>under review.</em>
          </>
        )}
        {status === "APPROVED" && (
          <>
            You&apos;re a{" "}
            <em style={{ color: "#1D9E75" }}>Verified Breeder.</em>
          </>
        )}
        {status === "REJECTED" && (
          <>
            We need a{" "}
            <em style={{ color: "#C94B2A" }}>bit more.</em>
          </>
        )}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-dark-muted">
        {status === "PENDING" && "We'll email you within 72 hours."}
        {status === "APPROVED" &&
          "The Verified Breeder badge now appears on your profile and pet cards."}
        {status === "REJECTED" &&
          "See the reviewer notes below, then reapply when you're ready."}
      </p>
    </header>
  );
}
