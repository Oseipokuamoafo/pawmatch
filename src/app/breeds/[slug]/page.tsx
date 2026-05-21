import Link from "next/link";
import { notFound } from "next/navigation";

import {
  findBreedBySlug,
  countPetsForBreed,
  samplePetsForBreed,
} from "@/lib/breeds";
import { calculateAge } from "@/lib/utils/age";

type Ctx = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Ctx) {
  const { slug } = await params;
  const breed = await findBreedBySlug(slug);
  if (!breed) return { title: "Breed not found — PawMatch" };
  return {
    title: `${breed.name} — PawMatch`,
    description:
      breed.description ??
      `${breed.name} on PawMatch: average COI, recessive markers, and the pets carrying this lineage.`,
  };
}

export default async function BreedDetailPage(ctx: Ctx) {
  const { slug } = await ctx.params;
  const breed = await findBreedBySlug(slug);
  if (!breed) notFound();

  const [petCount, samplePets] = await Promise.all([
    countPetsForBreed(breed.name),
    samplePetsForBreed(breed.name, 6),
  ]);

  const coiTone =
    breed.averageCOI == null
      ? null
      : breed.averageCOI > 7
        ? { color: "#C94B2A", label: "Elevated" }
        : breed.averageCOI > 5.5
          ? { color: "#B0731A", label: "Moderate" }
          : { color: "#1D9E75", label: "Healthy range" };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 md:py-14">
      <Link
        href="/breeds"
        className="inline-flex items-center gap-1.5 text-sm text-dark-muted transition-colors hover:text-terracotta"
      >
        <BackArrow className="h-3.5 w-3.5" />
        All breeds
      </Link>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <header className="mt-6 grid grid-cols-1 gap-10 md:grid-cols-[1.05fr_0.95fr] md:gap-14">
        <div className="relative overflow-hidden rounded-3xl bg-sand" style={{ aspectRatio: "4 / 5" }}>
          {breed.heroImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={breed.heroImageUrl}
              alt={breed.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-7xl">
              {breed.species === "DOG" ? "🐕" : "🐈"}
            </div>
          )}
          <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-cream/95 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-dark-muted shadow-sm dark:bg-[#2A1A10]/95 dark:text-[#C4A882]">
            {breed.species === "DOG" ? "🐕 Dog" : "🐈 Cat"}
            {breed.group && <> · {breed.group}</>}
          </span>
        </div>

        <div className="flex flex-col">
          <p className="eyebrow">{breed.species === "DOG" ? "Canine breed" : "Feline breed"}</p>
          <h1
            className="mt-3 leading-[1.05] tracking-tight text-balance text-dark"
            style={{
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontWeight: 900,
              fontSize: "clamp(2.5rem, 6vw, 3.5rem)",
            }}
          >
            {breed.name}
          </h1>
          {breed.description && (
            <p className="mt-4 max-w-prose text-lg leading-relaxed text-dark-muted text-balance">
              {breed.description}
            </p>
          )}
          {breed.temperament.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {breed.temperament.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center rounded-pill bg-sand px-3 py-1 text-sm font-medium text-dark"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Quick stats grid */}
          <div className="mt-8 grid grid-cols-2 gap-3">
            <StatTile
              label="Avg COI"
              value={breed.averageCOI != null ? `${breed.averageCOI.toFixed(1)}%` : "—"}
              footnote={coiTone?.label}
              footnoteColor={coiTone?.color}
            />
            <StatTile
              label="Lifespan"
              value={
                breed.lifespanMinYears && breed.lifespanMaxYears
                  ? `${breed.lifespanMinYears}-${breed.lifespanMaxYears} yrs`
                  : "—"
              }
            />
            <StatTile
              label="Weight"
              value={
                breed.weightKgMin && breed.weightKgMax
                  ? `${breed.weightKgMin}-${breed.weightKgMax} kg`
                  : "—"
              }
            />
            <StatTile
              label="Min breeding age"
              value={
                breed.minBreedingAgeMale && breed.minBreedingAgeFemale
                  ? `${Math.min(breed.minBreedingAgeMale, breed.minBreedingAgeFemale)} mo`
                  : "—"
              }
              footnote={
                breed.minBreedingAgeMale && breed.minBreedingAgeFemale
                  ? `♂ ${breed.minBreedingAgeMale} · ♀ ${breed.minBreedingAgeFemale}`
                  : undefined
              }
            />
          </div>
        </div>
      </header>

      {/* ── Recessive markers ───────────────────────────────────── */}
      <section className="mt-16">
        <header className="mb-6 max-w-2xl">
          <p className="eyebrow">Genetic markers</p>
          <h2 className="mt-3 font-serif text-3xl md:text-4xl font-bold leading-tight tracking-tight">
            Watch list
          </h2>
          <p className="mt-3 text-dark-muted leading-relaxed">
            Known recessives the matching engine auto-flags when both parents carry the same
            marker. Always cross-reference with the latest DNA panel.
          </p>
        </header>
        {breed.commonRecessiveGenes.length === 0 ? (
          <div className="card text-center text-sm italic text-dark-muted">
            No common recessive markers cataloged for this breed yet.
          </div>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {breed.commonRecessiveGenes.map((g) => (
              <li
                key={g}
                className="inline-flex items-center gap-1.5 rounded-pill bg-terracotta/10 px-3 py-1.5 text-sm font-semibold text-terracotta"
              >
                ⚠ {g}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Pedigree intelligence (Phase 4 stub) ────────────────── */}
      <section className="mt-16 rounded-3xl border border-sand bg-cream/60 p-7 dark:bg-[#1C1008]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-terracotta">
          Phase 4 preview
        </p>
        <h2 className="mt-3 font-serif text-2xl md:text-3xl font-bold leading-tight tracking-tight">
          Pedigree intelligence — coming soon
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-dark-muted leading-relaxed">
          Real Wright path coefficients, founder distribution, and registry-linked
          ancestry traces. The breed schema reserves a JSON column today; the
          AKC/TICA partnership unlocks the data.
        </p>
      </section>

      {/* ── Pets on platform ────────────────────────────────────── */}
      <section className="mt-16">
        <header className="mb-6 flex items-end justify-between">
          <div>
            <p className="eyebrow">On PawMatch</p>
            <h2 className="mt-3 font-serif text-3xl md:text-4xl font-bold leading-tight tracking-tight">
              {breed.name} on the platform
            </h2>
            <p className="mt-2 text-dark-muted">
              {petCount === 0
                ? "No verified pets yet — be the first to register."
                : `${petCount} verified pet${petCount === 1 ? "" : "s"} carrying this lineage.`}
            </p>
          </div>
          {petCount > 6 && (
            <Link
              href={`/browse?breed=${encodeURIComponent(breed.name)}`}
              className="text-sm font-semibold text-terracotta hover:underline"
            >
              Browse all →
            </Link>
          )}
        </header>

        {samplePets.length === 0 ? (
          <div className="card text-center">
            <p className="font-serif text-lg font-bold text-dark">
              No pets registered yet
            </p>
            <p className="mt-2 text-sm text-dark-muted">
              Add the first {breed.name} to your kennel.
            </p>
            <Link href="/dashboard/pets/new" className="btn-primary mt-5 inline-flex">
              Add a pet
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {samplePets.map((p) => {
              const photo = p.photos[0]?.url ?? p.livePhotoUrl;
              return (
                <li key={p.id}>
                  <Link
                    href={`/dashboard/pets/${p.id}`}
                    className="card-hover block overflow-hidden rounded-2xl bg-surface text-center"
                  >
                    <div className="relative aspect-square w-full overflow-hidden bg-sand">
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photo}
                          alt={p.name}
                          className="card-image h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-3xl">
                          {p.sex === "MALE" ? "♂" : "♀"}
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="truncate text-sm font-semibold text-dark">{p.name}</p>
                      <p className="mt-0.5 text-[11px] text-dark-muted">
                        {calculateAge(p.dateOfBirth)} · {p.sex === "MALE" ? "♂" : "♀"}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Footer link back to predict ─────────────────────────── */}
      <div className="mt-16 text-center">
        <p className="text-sm text-dark-muted">
          Want to model a litter from a {breed.name} pairing?{" "}
          <Link href="/dashboard" className="font-semibold text-terracotta hover:underline">
            Open one of your pets
          </Link>{" "}
          and click <strong>Predict litter</strong>.
        </p>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  footnote,
  footnoteColor,
}: {
  label: string;
  value: string;
  footnote?: string | null;
  footnoteColor?: string;
}) {
  return (
    <div className="rounded-2xl border border-sand bg-surface px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-dark-muted">
        {label}
      </p>
      <p
        className="mt-1 leading-none text-dark"
        style={{
          fontFamily: "var(--font-playfair, Georgia, serif)",
          fontWeight: 900,
          fontSize: "1.5rem",
        }}
      >
        {value}
      </p>
      {footnote && (
        <p
          className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: footnoteColor ?? "var(--color-dark-muted)" }}
        >
          {footnote}
        </p>
      )}
    </div>
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

