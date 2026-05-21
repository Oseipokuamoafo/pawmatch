import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { predictLitter } from "@/lib/punnett";
import { PredictPanel } from "@/components/predict/PredictPanel";
import { OffspringProfilePanel } from "@/components/predict/OffspringProfilePanel";
import { calculateAge } from "@/lib/utils/age";

type SearchParams = Promise<{ a?: string; b?: string }>;

/**
 * /predict?a=<petAId>&b=<petBId>
 *
 * Requires the current user to own petA. Pulls both pets' DNA-verified
 * and self-reported traits, runs the Punnett-square engine, renders.
 */
export default async function PredictPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/predict");
  }

  const sp = await searchParams;
  const petAId = sp.a;
  const petBId = sp.b;

  if (!petAId || !petBId) return <NeedsBoth />;
  if (petAId === petBId) {
    return (
      <Wrap>
        <p className="text-center text-sm italic text-dark-muted">
          You can&apos;t predict a litter from a single pet.
        </p>
      </Wrap>
    );
  }

  const [petA, petB] = await Promise.all([
    prisma.pet.findUnique({
      where: { id: petAId },
      include: {
        photos: { orderBy: { isPrimary: "desc" }, take: 1 },
        traits: true,
      },
    }),
    prisma.pet.findUnique({
      where: { id: petBId },
      include: {
        photos: { orderBy: { isPrimary: "desc" }, take: 1 },
        traits: true,
      },
    }),
  ]);

  if (!petA || !petB) notFound();
  if (petA.ownerId !== session.user.id) notFound();

  const prediction = predictLitter(petA, petB);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 md:py-14">
      <Link
        href={`/dashboard/pets/${petA.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-dark-muted hover:text-terracotta transition-colors"
      >
        <BackArrow className="h-3.5 w-3.5" />
        Back to {petA.name}
      </Link>

      <header className="mt-6 mb-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-terracotta">
          Cross-breed prediction
        </p>
        <h1
          className="mt-3 leading-[1.05] tracking-tight text-balance text-dark"
          style={{
            fontFamily: "var(--font-playfair, Georgia, serif)",
            fontWeight: 900,
            fontSize: "clamp(2.5rem, 6vw, 3.5rem)",
          }}
        >
          {petA.name} <em style={{ color: "#C94B2A" }}>×</em> {petB.name}
        </h1>
        <p className="mt-3 max-w-xl text-base text-dark-muted leading-relaxed">
          Mendelian probabilities for the genes both pets carry —
          including health markers, coat traits, and any DNA-verified
          recessive screens.
        </p>
      </header>

      {/* ── Parent cards ────────────────────────────────────────── */}
      <section className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-2">
        <ParentCard
          pet={{
            id: petA.id,
            name: petA.name,
            breed: petA.breed,
            dateOfBirth: petA.dateOfBirth.toISOString(),
            sex: petA.sex,
            photoUrl: petA.photos[0]?.url ?? petA.livePhotoUrl,
            traitCount: petA.traits.length,
          }}
        />
        <ParentCard
          pet={{
            id: petB.id,
            name: petB.name,
            breed: petB.breed,
            dateOfBirth: petB.dateOfBirth.toISOString(),
            sex: petB.sex,
            photoUrl: petB.photos[0]?.url ?? petB.livePhotoUrl,
            traitCount: petB.traits.length,
          }}
        />
      </section>

      <PredictPanel
        prediction={prediction}
        petAName={petA.name}
        petBName={petB.name}
      />

      <OffspringProfilePanel
        petAId={petA.id}
        petBId={petB.id}
        petAName={petA.name}
        petBName={petB.name}
      />
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────── */

function ParentCard({
  pet,
}: {
  pet: {
    id: string;
    name: string;
    breed: string;
    dateOfBirth: string;
    sex: "MALE" | "FEMALE";
    photoUrl: string | null;
    traitCount: number;
  };
}) {
  return (
    <Link
      href={`/dashboard/pets/${pet.id}`}
      className="card card-hover flex items-center gap-4 overflow-hidden"
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-sand">
        {pet.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={pet.photoUrl} alt={pet.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl">
            {pet.sex === "MALE" ? "♂" : "♀"}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="leading-tight text-dark"
          style={{
            fontFamily: "var(--font-playfair, Georgia, serif)",
            fontWeight: 900,
            fontSize: "1.25rem",
          }}
        >
          {pet.name}
        </p>
        <p className="mt-1 text-sm text-dark-muted">
          {pet.breed} · {calculateAge(pet.dateOfBirth)} ·{" "}
          {pet.sex === "MALE" ? "♂ M" : "♀ F"}
        </p>
        <p className="mt-1 text-[11px] uppercase tracking-wider text-dark-muted">
          {pet.traitCount} trait{pet.traitCount === 1 ? "" : "s"} on file
        </p>
      </div>
    </Link>
  );
}

function NeedsBoth() {
  return (
    <Wrap>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-terracotta">
        Cross-breed prediction
      </p>
      <h1
        className="mt-3 leading-tight text-balance text-dark"
        style={{
          fontFamily: "var(--font-playfair, Georgia, serif)",
          fontWeight: 900,
          fontSize: "clamp(2rem, 5vw, 3rem)",
        }}
      >
        Pick two pets to predict.
      </h1>
      <p className="mt-3 text-dark-muted">
        Open this page from an accepted match (it&apos;ll fill both pets in
        for you), or pass <code>?a=&lt;petAId&gt;&amp;b=&lt;petBId&gt;</code>{" "}
        directly.
      </p>
      <Link href="/matches?tab=received" className="btn-primary mt-6 inline-flex">
        Go to matches
      </Link>
    </Wrap>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20 text-center">{children}</div>
  );
}

function BackArrow({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M19 12H5M11 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
