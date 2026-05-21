import Link from "next/link";

import { calculateAge } from "@/lib/utils/age";
import { ScoreRing } from "@/components/browse/ScoreRing";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import type { DashboardPet } from "@/lib/dashboard-stats";

const SPECIES_EMOJI = { DOG: "🐕", CAT: "🐈" } as const;

export function DashboardPetCard({ pet }: { pet: DashboardPet }) {
  return (
    <Link
      href={`/dashboard/pets/${pet.id}`}
      className="card card-hover group block overflow-hidden p-0"
    >
      <div className="relative aspect-square overflow-hidden bg-sand">
        {pet.photoUrl ?? pet.livePhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={(pet.photoUrl ?? pet.livePhotoUrl) as string}
            alt={pet.name}
            className="card-image h-full w-full object-cover"
          />
        ) : (
          <div className="card-image flex h-full w-full items-center justify-center text-6xl">
            {SPECIES_EMOJI[pet.species]}
          </div>
        )}

        {/* Live verified badge */}
        {pet.livePhotoUrl && (
          <span
            className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-cream/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#1D9E75] shadow-sm dark:bg-[#1A3D1E]/95 dark:text-[#7FBF88]"
            title="Live photo verified"
          >
            <Check className="w-2.5 h-2.5" />
            Verified
          </span>
        )}

        {/* Verified Breeder badge — top-right of image */}
        {pet.ownerVerified && (
          <span className="absolute top-3 right-12">
            <VerificationBadge size="sm" showLabel={false} />
          </span>
        )}

        {!pet.isActive && (
          <span className="absolute top-3 right-3 rounded-full bg-dark/70 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-white">
            Inactive
          </span>
        )}

        {/* Best match score badge — bottom-right floating */}
        {pet.bestMatchScore != null && pet.isActive && (
          <div className="absolute bottom-3 right-3">
            <MatchBadge score={pet.bestMatchScore} />
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <h3
            className="leading-tight tracking-tight text-dark"
            style={{
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontWeight: 900,
              fontSize: "1.5rem",
            }}
          >
            {pet.name}
          </h3>
          <p className="mt-1 text-sm text-dark-muted">
            {pet.breed} · {calculateAge(pet.dateOfBirth)} ·{" "}
            {pet.sex === "MALE" ? "♂" : "♀"}
          </p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-dark-muted">
            Health · trust score
          </p>
        </div>

        <ScoreRing score={pet.healthScore} size={56} />
      </div>
    </Link>
  );
}

function MatchBadge({ score }: { score: number }) {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-full bg-terracotta px-2.5 py-1 text-[11px] font-semibold text-white shadow-md"
      title={`Best match score: ${score}`}
    >
      <HeartGlyph className="h-2.5 w-2.5" />
      Match · {score}
    </div>
  );
}

function HeartGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" fill="currentColor" className={className} aria-hidden="true">
      <path d="M6 10.5c-3-2-5-3.7-5-6.1A2.4 2.4 0 0 1 6 3.2 2.4 2.4 0 0 1 11 4.4c0 2.4-2 4.1-5 6.1z" />
    </svg>
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
