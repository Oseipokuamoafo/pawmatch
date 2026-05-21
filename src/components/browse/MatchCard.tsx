"use client";

import { useState } from "react";

import { calculateAge } from "@/lib/utils/age";
import { useToast } from "@/components/toast/ToastProvider";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { ReportButton } from "@/components/ui/ReportButton";
import type { ScoredPet } from "@/app/api/browse/route";

interface MatchCardProps {
  myPetId: string;
  candidate: ScoredPet;
  onSkip: (id: string) => void;
  onSent: (id: string) => void;
}

const SPECIES_EMOJI = { DOG: "🐕", CAT: "🐈" } as const;

export function MatchCard({ myPetId, candidate, onSkip, onSent }: MatchCardProps) {
  const toast = useToast();
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<"idle" | "sent" | "dup">("idle");

  const heroUrl = candidate.photoUrl ?? candidate.livePhotoUrl;
  const scoreClass = scoreColor(candidate.score);
  const capped = candidate.flags.length > 0;
  const distance = candidate.distanceKm;

  async function send() {
    setSending(true);
    const res = await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ petAId: myPetId, petBId: candidate.id }),
    });
    setSending(false);
    if (res.ok) {
      setStatus("sent");
      toast.success("Request sent", `${candidate.name}'s owner has been notified.`);
      onSent(candidate.id);
      return;
    }
    if (res.status === 409) {
      setStatus("dup");
      toast.info("Already requested", "There's an open match between these pets.");
      return;
    }
    const data = await res.json().catch(() => ({}));
    toast.error("Couldn't send request", data.error ?? undefined);
  }

  return (
    <article
      className="match-card group flex flex-col overflow-hidden rounded-2xl border bg-surface transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-terracotta/50 hover:shadow-[0_12px_32px_rgba(201,75,42,0.15)]"
      style={{ borderColor: "rgba(232,213,183,0.7)" }}
    >
      {/* ── Hero image ─────────────────────────────────────────────── */}
      <div className="relative aspect-[4/3] overflow-hidden bg-sand">
        {heroUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroUrl}
            alt={candidate.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl">
            {SPECIES_EMOJI[candidate.species]}
          </div>
        )}

        {/* Color-coded score pill, top-right */}
        <div
          className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold shadow-sm"
          style={{ background: scoreClass.bg, color: scoreClass.fg }}
          title={`Compatibility score ${candidate.score}/100`}
        >
          {scoreClass.icon}
          {candidate.score}
        </div>

        {/* Flag warning if score was capped */}
        {capped && (
          <FlagWarning flags={candidate.flags} />
        )}

        {/* Badges, top-left stack */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
          {candidate.livePhotoUrl && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-cream/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#1D9E75]"
              title="Live photo verified"
            >
              <Check className="h-2.5 w-2.5" /> Live
            </span>
          )}
          {candidate.hasVerifiedHealth && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-cream/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#1D9E75]"
              title="Has verified health records"
            >
              <Check className="h-2.5 w-2.5" /> Health
            </span>
          )}
        </div>

        {candidate.ownerVerified && (
          <span className="absolute bottom-3 left-3">
            <VerificationBadge size="sm" />
          </span>
        )}
      </div>

      {/* ── Meta + actions ────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3
            className="leading-tight tracking-tight text-dark"
            style={{
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontWeight: 900,
              fontSize: "1.375rem",
            }}
          >
            {candidate.name}
          </h3>
          <p className="mt-1 text-sm text-dark-muted">
            {candidate.breed} · {calculateAge(candidate.dateOfBirth)} ·{" "}
            <SexGlyph sex={candidate.sex} />
          </p>
        </div>

        {distance != null && (
          <p className="text-xs text-dark-muted">
            <PinIcon className="mr-1 inline h-3 w-3" />
            {formatDistance(distance)} away
          </p>
        )}

        {candidate.flags.length > 0 && (
          <div
            className="rounded-card px-3 py-2 text-[11px]"
            style={{
              background: "rgba(201,75,42,0.08)",
              color: "#C94B2A",
              border: "1px solid rgba(201,75,42,0.25)",
            }}
          >
            <strong className="font-semibold">Heads up:</strong>{" "}
            {candidate.flags[0].replace(/_/g, " ").toLowerCase()}
            {candidate.flags.length > 1 && ` +${candidate.flags.length - 1}`}
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
          <div className="flex items-center gap-2">
            {status === "sent" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#1D9E75]/15 px-3 py-1.5 text-xs font-semibold text-[#1D9E75]">
                <Check className="h-3 w-3" /> Sent
              </span>
            ) : status === "dup" ? (
              <span className="inline-flex items-center rounded-full bg-sand px-3 py-1.5 text-xs font-semibold text-dark-muted">
                Already requested
              </span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={send}
                  disabled={sending}
                  className="btn-primary !px-4 !py-2 !text-sm"
                >
                  {sending ? "Sending…" : "Send match request"}
                </button>
                <button
                  type="button"
                  onClick={() => onSkip(candidate.id)}
                  className="rounded-full px-3 py-2 text-xs font-medium text-dark-muted/80 transition-colors hover:text-terracotta"
                >
                  Skip
                </button>
              </>
            )}
          </div>
          <ReportButton targetPetId={candidate.id} />
        </div>
      </div>
    </article>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────────── */

function scoreColor(score: number): {
  bg: string;
  fg: string;
  icon: React.ReactNode;
} {
  if (score >= 80) {
    return {
      bg: "rgba(29,158,117,0.95)",
      fg: "#fff",
      icon: <span aria-hidden>★</span>,
    };
  }
  if (score >= 60) {
    return {
      bg: "rgba(232,154,42,0.95)",
      fg: "#fff",
      icon: <span aria-hidden>◆</span>,
    };
  }
  return {
    bg: "rgba(201,75,42,0.95)",
    fg: "#fff",
    icon: <span aria-hidden>⚠</span>,
  };
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 100) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

function FlagWarning({ flags }: { flags: string[] }) {
  const label = flags.map((f) => f.replace(/_/g, " ").toLowerCase()).join(", ");
  // "Informational" framing — not a clinical recommendation. The score
  // itself is just data; the owner + their vet make the call.
  return (
    <div
      className="absolute bottom-3 right-3 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm cursor-help"
      style={{ background: "rgba(232,154,42,0.95)" }}
      title={`Worth reviewing with your vet: ${label}. Informational only — not a clinical recommendation.`}
      aria-label={`Worth reviewing with your vet: ${label}. Informational only — not a clinical recommendation.`}
    >
      !
    </div>
  );
}

function SexGlyph({ sex }: { sex: "MALE" | "FEMALE" }) {
  return sex === "MALE" ? (
    <span aria-label="Male" className="text-sage">
      ♂ M
    </span>
  ) : (
    <span aria-label="Female" className="text-terracotta">
      ♀ F
    </span>
  );
}

function Check({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" fill="none" className={className} aria-hidden="true">
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

function PinIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" fill="currentColor" className={className} aria-hidden="true">
      <path d="M6 1a3.5 3.5 0 0 0-3.5 3.5C2.5 7.5 6 11 6 11s3.5-3.5 3.5-6.5A3.5 3.5 0 0 0 6 1zm0 5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
    </svg>
  );
}
