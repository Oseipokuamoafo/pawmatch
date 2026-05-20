import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scoreMatch, type PetWithRelations } from "@/lib/scoring";
import { BrowseCard } from "@/components/browse/BrowseCard";

type SearchParams = Promise<{ for?: string; species?: string }>;

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard/browse");

  const sp = await searchParams;

  const myPets = await prisma.pet.findMany({
    where: { ownerId: session.user.id, isActive: true },
    include: {
      traits: true,
      healthRecords: true,
      breedingGoals: true,
      owner: { select: { id: true, locationLat: true, locationLng: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (myPets.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <p className="eyebrow">Nothing to match yet</p>
        <h1
          className="mt-3 text-balance leading-tight tracking-tight text-dark"
          style={{
            fontFamily: "var(--font-playfair, Georgia, serif)",
            fontWeight: 900,
            fontSize: "clamp(2rem, 5vw, 3rem)",
          }}
        >
          Add a pet first.
        </h1>
        <p className="mt-3 text-dark-muted">
          Create at least one verified pet profile to start finding matches.
        </p>
        <Link href="/dashboard/pets/new" className="btn-primary mt-8 inline-flex">
          Add a pet
        </Link>
      </div>
    );
  }

  const selectedId = sp.for && myPets.find((p) => p.id === sp.for)
    ? sp.for
    : myPets[0].id;
  const myPet = myPets.find((p) => p.id === selectedId)!;

  // Candidate pool — same species, opposite sex, active, not mine, no existing
  // pending/accepted match.
  const existing = await prisma.match.findMany({
    where: {
      OR: [{ petAId: myPet.id }, { petBId: myPet.id }],
      status: { in: ["PENDING", "ACCEPTED"] },
    },
    select: { petAId: true, petBId: true },
  });
  const excludeIds = new Set<string>([myPet.id]);
  for (const m of existing) {
    excludeIds.add(m.petAId);
    excludeIds.add(m.petBId);
  }

  const candidates = await prisma.pet.findMany({
    where: {
      species: myPet.species,
      sex: myPet.sex === "MALE" ? "FEMALE" : "MALE",
      isActive: true,
      ownerId: { not: session.user.id },
      id: { notIn: Array.from(excludeIds) },
    },
    include: {
      photos: { orderBy: { isPrimary: "desc" }, take: 1 },
      traits: true,
      healthRecords: true,
      breedingGoals: true,
      owner: {
        select: {
          id: true,
          name: true,
          locationLat: true,
          locationLng: true,
          verificationBadge: true,
        },
      },
    },
    take: 60,
  });

  const myLocation =
    myPet.owner?.locationLat != null && myPet.owner?.locationLng != null
      ? { lat: myPet.owner.locationLat, lng: myPet.owner.locationLng }
      : undefined;

  const scored = candidates
    .map((c) => {
      const candidateLocation =
        c.owner?.locationLat != null && c.owner?.locationLng != null
          ? { lat: c.owner.locationLat, lng: c.owner.locationLng }
          : undefined;
      const result = scoreMatch(
        myPet as PetWithRelations,
        c as unknown as PetWithRelations,
        myLocation,
        candidateLocation
      );
      return { candidate: c, result };
    })
    .sort((a, b) => b.result.score - a.result.score);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
      <header className="mb-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className="eyebrow">Browse</p>
          <h1
            className="mt-3 leading-[1.05] tracking-tight text-balance text-dark"
            style={{
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontWeight: 900,
              fontSize: "clamp(2.5rem, 5vw, 3.5rem)",
            }}
          >
            Find a match for{" "}
            <em style={{ color: "#C94B2A" }}>{myPet.name}</em>.
          </h1>
          <p className="mt-3 max-w-lg text-base text-dark-muted leading-relaxed">
            {scored.length === 0
              ? "No candidates right now — check back as more profiles get verified."
              : `${scored.length} candidate${scored.length === 1 ? "" : "s"} sorted by compatibility. Warnings are flagged in red.`}
          </p>
        </div>

        {myPets.length > 1 && (
          <PetSwitcher pets={myPets} selectedId={myPet.id} />
        )}
      </header>

      {scored.length === 0 ? (
        <EmptyFeed />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {scored.map(({ candidate, result }) => (
            <BrowseCard
              key={candidate.id}
              myPetId={myPet.id}
              candidate={{
                id: candidate.id,
                name: candidate.name,
                species: candidate.species,
                breed: candidate.breed,
                sex: candidate.sex,
                dateOfBirth: candidate.dateOfBirth,
                livePhotoUrl: candidate.livePhotoUrl,
                photoUrl: candidate.photos[0]?.url ?? null,
                ownerName: candidate.owner?.name ?? null,
                ownerVerified: Boolean(candidate.owner?.verificationBadge),
              }}
              score={result.score}
              capped={result.flags.length > 0}
              flags={result.flags}
              notes={[]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PetSwitcher({
  pets,
  selectedId,
}: {
  pets: { id: string; name: string }[];
  selectedId: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-[0.18em] text-dark-muted">
        Matching for
      </span>
      {pets.map((p) => (
        <Link
          key={p.id}
          href={`/dashboard/browse?for=${p.id}`}
          className={`chip ${p.id === selectedId ? "active" : ""}`}
          data-selected={p.id === selectedId}
        >
          {p.name}
        </Link>
      ))}
    </div>
  );
}

function EmptyFeed() {
  return (
    <div className="card flex flex-col items-center py-16 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-sand text-2xl">
        🔎
      </div>
      <p
        className="text-xl font-bold text-dark"
        style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}
      >
        No candidates yet
      </p>
      <p className="mt-2 max-w-sm text-sm text-dark-muted leading-relaxed">
        As more verified profiles join PawMatch, compatible pets will appear here automatically.
      </p>
    </div>
  );
}
