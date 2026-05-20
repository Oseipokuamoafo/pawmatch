"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ScoreRing } from "./ScoreRing";
import { calculateAge } from "@/lib/utils/age";
import { useToast } from "@/components/toast/ToastProvider";
import { ReportButton } from "@/components/ui/ReportButton";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import type { Sex, Species } from "@/generated/prisma";

interface BrowseCandidate {
  id: string;
  name: string;
  species: Species;
  breed: string;
  sex: Sex;
  dateOfBirth: Date | string;
  livePhotoUrl: string | null;
  photoUrl: string | null;
  ownerName: string | null;
  ownerVerified?: boolean;
}

interface BrowseCardProps {
  myPetId: string;
  candidate: BrowseCandidate;
  score: number;
  capped: boolean;
  flags: string[];
  notes: string[];
}

const SPECIES_EMOJI: Record<Species, string> = { DOG: "🐕", CAT: "🐈" };

export function BrowseCard({
  myPetId,
  candidate,
  score,
  capped,
  flags,
  notes,
}: BrowseCardProps) {
  const router = useRouter();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "sent" | "error" | "dup">("idle");
  const [error, setError] = useState<string | null>(null);

  async function sendRequest() {
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ petAId: myPetId, petBId: candidate.id }),
    });
    setSubmitting(false);
    if (res.ok) {
      setStatus("sent");
      toast.success("Request sent", `${candidate.name}'s owner has been notified.`);
      router.refresh();
      return;
    }
    if (res.status === 409) {
      setStatus("dup");
      toast.info("Already requested", "There's an open match between these pets.");
      return;
    }
    const data = await res.json().catch(() => ({}));
    setStatus("error");
    setError(data.error ?? "Could not send request");
    toast.error("Couldn't send request", data.error ?? undefined);
  }

  const heroUrl = candidate.photoUrl ?? candidate.livePhotoUrl;

  return (
    <article className="card card-hover group flex flex-col overflow-hidden p-0">
      <div className="relative aspect-[4/3] overflow-hidden bg-sand">
        {heroUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroUrl}
            alt={candidate.name}
            className="card-image h-full w-full object-cover"
          />
        ) : (
          <div className="card-image flex h-full w-full items-center justify-center text-6xl">
            {SPECIES_EMOJI[candidate.species]}
          </div>
        )}

        <div className="absolute top-3 right-3">
          <ScoreRing score={score} size={56} capped={capped} />
        </div>

        {candidate.livePhotoUrl && (
          <span
            className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-cream/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#1D9E75]"
            title="Live photo verified"
          >
            <Check className="w-2.5 h-2.5" /> Verified
          </span>
        )}

        {candidate.ownerVerified && (
          <span className="absolute bottom-3 left-3">
            <VerificationBadge size="sm" />
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3
            className="leading-tight tracking-tight text-dark"
            style={{
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontWeight: 900,
              fontSize: "1.5rem",
            }}
          >
            {candidate.name}
          </h3>
          <p className="mt-1 text-sm text-dark-muted">
            {candidate.breed} · {calculateAge(candidate.dateOfBirth)} ·{" "}
            {candidate.sex === "MALE" ? "♂" : "♀"}
          </p>
        </div>

        {flags.length > 0 && (
          <div className="rounded-card border border-terracotta/30 bg-terracotta/8 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-terracotta">
              Auto-flagged
            </p>
            <ul className="mt-1 space-y-0.5">
              {flags.slice(0, 2).map((f) => (
                <li key={f} className="text-xs text-dark leading-snug">
                  · {f}
                </li>
              ))}
              {flags.length > 2 && (
                <li className="text-xs text-dark-muted">
                  +{flags.length - 2} more
                </li>
              )}
            </ul>
          </div>
        )}

        {notes.length > 0 && flags.length === 0 && (
          <div className="text-xs text-dark-muted">
            {notes.join(" · ")}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          <span className="text-xs text-dark-muted">
            from {candidate.ownerName ?? "an owner"}
          </span>
          {status === "sent" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#1D9E75]/15 px-3 py-1.5 text-xs font-semibold text-[#1D9E75]">
              <Check className="w-3 h-3" /> Sent
            </span>
          ) : status === "dup" ? (
            <span className="inline-flex items-center rounded-full bg-sand px-3 py-1.5 text-xs font-semibold text-dark-muted">
              Already requested
            </span>
          ) : (
            <button
              type="button"
              onClick={sendRequest}
              disabled={submitting}
              className="btn-primary !px-4 !py-2 !text-sm"
            >
              {submitting ? "Sending…" : "Request match"}
            </button>
          )}
        </div>

        {status === "error" && (
          <p className="text-xs text-terracotta">{error}</p>
        )}

        <div className="mt-2 flex items-center justify-end">
          <ReportButton targetPetId={candidate.id} />
        </div>
      </div>
    </article>
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
