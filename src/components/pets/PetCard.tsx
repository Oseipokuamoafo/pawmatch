import Link from "next/link";

import { calculateAge } from "@/lib/utils/age";
import { LiveVerifiedBadge } from "./LiveVerifiedBadge";
import type { Pet, PetPhoto, Sex, Species } from "@/generated/prisma";

type PetWithPhotos = Pet & { photos: PetPhoto[] };

interface PetCardProps {
  pet: PetWithPhotos;
}

const SPECIES_EMOJI: Record<Species, string> = { DOG: "🐕", CAT: "🐈" };

export function PetCard({ pet }: PetCardProps) {
  const primary = pet.photos.find((p) => p.isPrimary) ?? pet.photos[0];
  const imageUrl = primary?.url ?? pet.livePhotoUrl;

  return (
    <Link
      href={`/dashboard/pets/${pet.id}`}
      className="card card-hover group block overflow-hidden p-0"
    >
      <div className="relative aspect-square bg-sand overflow-hidden">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={pet.name}
            className="card-image h-full w-full object-cover"
          />
        ) : (
          <div className="card-image flex h-full w-full items-center justify-center text-5xl">
            {SPECIES_EMOJI[pet.species]}
          </div>
        )}

        {!pet.isActive && (
          <span className="absolute top-3 left-3 rounded-pill bg-dark/70 px-2.5 py-1 text-xs font-medium text-white">
            Inactive
          </span>
        )}

        {pet.livePhotoUrl && (
          <div className="absolute top-3 right-3">
            <LiveVerifiedBadge />
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="font-serif text-xl font-bold text-dark leading-tight">
            {pet.name}
          </h3>
          <SexBadge sex={pet.sex} />
        </div>
        <p className="text-sm text-dark-muted">{pet.breed}</p>
        <p className="mt-1 text-sm text-dark-muted">{calculateAge(pet.dateOfBirth)}</p>
      </div>
    </Link>
  );
}

function SexBadge({ sex }: { sex: Sex }) {
  const isMale = sex === "MALE";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-xs font-medium ${
        isMale ? "bg-sage/20 text-sage" : "bg-terracotta/15 text-terracotta"
      }`}
      title={isMale ? "Male" : "Female"}
    >
      {isMale ? "♂" : "♀"} {isMale ? "Male" : "Female"}
    </span>
  );
}
