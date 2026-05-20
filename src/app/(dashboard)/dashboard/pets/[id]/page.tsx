import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateAge } from "@/lib/utils/age";
import { PhotoGallery } from "@/components/pets/PhotoGallery";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import type { HealthRecordType, Sex, TraitSource } from "@/generated/prisma";

type Ctx = { params: Promise<{ id: string }> };

export default async function PetDetailPage(ctx: Ctx) {
  const { id } = await ctx.params;

  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=/dashboard/pets/${id}`);

  const pet = await prisma.pet.findUnique({
    where: { id },
    include: {
      photos: { orderBy: { isPrimary: "desc" } },
      healthRecords: { orderBy: { recordDate: "desc" } },
      traits: true,
      breedingGoals: true,
      owner: {
        select: { id: true, name: true, image: true, verificationBadge: true },
      },
    },
  });

  if (!pet) notFound();
  if (pet.ownerId !== session.user.id) notFound();

  const galleryUrls = pet.photos.map((p) => p.url);
  const heroUrl =
    pet.photos.find((p) => p.isPrimary)?.url ??
    pet.photos[0]?.url ??
    pet.livePhotoUrl ??
    null;

  const verifiedCount = pet.healthRecords.filter((h) => h.isVerified).length;
  const trustScore = computeTrust(pet);

  return (
    <div className="relative min-h-screen">
      {/* ── Back / breadcrumb ───────────────────────────────────────────── */}
      <div className="relative z-10 mx-auto max-w-6xl px-6 pt-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-dark-muted hover:text-terracotta transition-colors"
        >
          <BackArrow className="w-3.5 h-3.5" />
          My Pets
        </Link>
      </div>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="mx-auto max-w-6xl px-6 pt-6 pb-10 md:pb-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.05fr_0.95fr] md:gap-14">
          {/* gallery */}
          <PhotoGallery
            heroUrl={heroUrl}
            photos={galleryUrls}
            speciesEmoji={pet.species === "DOG" ? "🐕" : "🐈"}
            livePhotoUrl={pet.livePhotoUrl}
            petName={pet.name}
          />

          {/* meta */}
          <div className="flex flex-col">
            <div className="flex items-center gap-3 flex-wrap">
              <p className="eyebrow">{pet.species === "DOG" ? "Canine profile" : "Feline profile"}</p>
              {pet.owner.verificationBadge && <VerificationBadge size="sm" />}
            </div>

            <h1 className="mt-3 font-serif text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight text-balance">
              {pet.name}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <SexChip sex={pet.sex} />
              <Chip>{pet.breed}</Chip>
              <Chip>{calculateAge(pet.dateOfBirth)}</Chip>
              {pet.color && <Chip>{pet.color}</Chip>}
              {pet.weight && <Chip>{pet.weight} kg</Chip>}
              {!pet.isActive && <Chip variant="muted">Inactive</Chip>}
            </div>

            {pet.bio && (
              <p className="mt-6 max-w-prose text-lg leading-relaxed text-dark-muted text-balance">
                {pet.bio}
              </p>
            )}

            {/* Trust score */}
            <div className="mt-8 rounded-card border border-sand bg-surface p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow !text-dark-muted">Trust score</p>
                  <p className="mt-2 font-serif text-4xl font-bold text-dark">
                    {trustScore}
                    <span className="text-base font-normal text-dark-muted"> / 100</span>
                  </p>
                  <p className="mt-1 text-sm text-dark-muted">
                    Based on verification, completeness and records.
                  </p>
                </div>
                <TrustMeter value={trustScore} />
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <TrustStat
                  label="Live photo"
                  ok={Boolean(pet.livePhotoUrl)}
                />
                <TrustStat
                  label="Health records"
                  ok={pet.healthRecords.length > 0}
                  hint={pet.healthRecords.length > 0 ? `${verifiedCount} verified` : "None yet"}
                />
                <TrustStat
                  label="Breeding goals"
                  ok={pet.breedingGoals.length > 0}
                />
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={`/dashboard/pets/${pet.id}/edit`} className="btn-primary">
                Edit details
              </Link>
              <Link href={`/dashboard/pets/${pet.id}/health/new`} className="btn-secondary">
                Add health record
              </Link>
            </div>
          </div>
        </div>
      </header>

      <SectionRule />

      {/* ── Health records ─────────────────────────────────────────────── */}
      <Section
        eyebrow="Records"
        title="Health & DNA"
        description="Verified records carry a sage check. Self-reported entries are clearly marked."
      >
        {pet.healthRecords.length === 0 ? (
          <EmptyState
            title="No health records yet"
            copy="Add a vaccination, DNA test, or vet visit to start building this pet's verified history."
            cta={{ href: `/dashboard/pets/${pet.id}/health/new`, label: "Add a record" }}
          />
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {pet.healthRecords.map((rec) => (
              <li key={rec.id} className="card flex items-start gap-4">
                <RecordIcon type={rec.type} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-serif text-lg font-bold text-dark leading-tight">
                      {rec.title}
                    </p>
                    <RecordTypeChip type={rec.type} />
                  </div>
                  <p className="mt-1 text-sm text-dark-muted">
                    {new Date(rec.recordDate).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  {rec.notes && (
                    <p className="mt-2 text-sm text-dark-muted leading-relaxed">{rec.notes}</p>
                  )}
                </div>
                <VerifiedBadge verified={rec.isVerified} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <SectionRule />

      {/* ── Traits ─────────────────────────────────────────────────────── */}
      <Section
        eyebrow="Personality"
        title="Traits"
        description="What makes this pet, this pet."
      >
        {pet.traits.length === 0 ? (
          <EmptyState
            title="No traits added"
            copy="Add temperament, coat, energy level and more to help find compatible matches."
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            {pet.traits.map((t) => (
              <TraitChip
                key={t.id}
                label={`${t.traitName}: ${t.traitValue}`}
                source={t.source}
              />
            ))}
          </div>
        )}
      </Section>

      <SectionRule />

      {/* ── Breeding goals ─────────────────────────────────────────────── */}
      <Section
        eyebrow="Looking for"
        title="Breeding goals"
        description="What this pet's owner is hoping to find in a match."
      >
        {pet.breedingGoals.length === 0 ? (
          <EmptyState
            title="No breeding goals set"
            copy="Tell us what kind of match you're hoping for — desired traits, preferred breeds, and a max acceptable COI."
          />
        ) : (
          <div className="space-y-6">
            {pet.breedingGoals.map((goal) => {
              const desired = Array.isArray(goal.desiredTraits)
                ? (goal.desiredTraits as unknown[]).filter((v): v is string => typeof v === "string")
                : [];
              return (
                <div key={goal.id} className="card">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <GoalGroup label="Desired traits" items={desired} empty="Any traits" />
                    <GoalGroup
                      label="Preferred breeds"
                      items={goal.preferredBreeds}
                      empty="Any breed"
                    />
                  </div>
                  <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-sand pt-5">
                    {goal.maxCOI !== null && (
                      <div>
                        <p className="eyebrow !text-dark-muted">Max COI</p>
                        <p className="mt-1 font-serif text-2xl font-bold text-terracotta">
                          {goal.maxCOI}%
                        </p>
                      </div>
                    )}
                    {goal.notes && (
                      <p className="text-sm text-dark-muted max-w-md leading-relaxed">
                        <span className="font-semibold text-dark">Notes — </span>
                        {goal.notes}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <div className="h-20" />
    </div>
  );
}

/* ─── Trust scoring (lightweight, view-only) ───────────────────────────── */

function computeTrust(pet: {
  livePhotoUrl: string | null;
  healthRecords: { isVerified: boolean }[];
  breedingGoals: unknown[];
  photos: unknown[];
  bio: string | null;
}): number {
  let s = 0;
  if (pet.livePhotoUrl) s += 35;
  if (pet.photos.length >= 1) s += 10;
  if (pet.photos.length >= 3) s += 5;
  if (pet.bio) s += 5;
  if (pet.breedingGoals.length > 0) s += 15;
  const verifiedHealth = pet.healthRecords.filter((h) => h.isVerified).length;
  s += Math.min(verifiedHealth * 6, 24);
  const anyHealth = pet.healthRecords.length > 0 ? 6 : 0;
  s += anyHealth;
  return Math.min(100, s);
}

/* ─── Layout primitives ────────────────────────────────────────────────── */

function Section({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-12 md:py-16">
      <header className="mb-8 max-w-2xl">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-3 font-serif text-3xl md:text-4xl font-bold leading-tight tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="mt-3 text-dark-muted leading-relaxed">{description}</p>
        )}
      </header>
      {children}
    </section>
  );
}

function SectionRule() {
  return (
    <div className="mx-auto max-w-6xl px-6">
      <div className="hairline" />
    </div>
  );
}

function EmptyState({
  title,
  copy,
  cta,
}: {
  title: string;
  copy: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="card flex flex-col items-center py-12 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-sand">
        <DotsMark className="w-6 text-terracotta" />
      </div>
      <p className="font-serif text-xl font-bold text-dark">{title}</p>
      <p className="mt-2 max-w-md text-sm text-dark-muted leading-relaxed">{copy}</p>
      {cta && (
        <Link href={cta.href} className="btn-primary mt-6">
          {cta.label}
        </Link>
      )}
    </div>
  );
}

/* ─── Chips ────────────────────────────────────────────────────────────── */

function Chip({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "muted";
}) {
  const styles =
    variant === "muted"
      ? "bg-dark/10 text-dark-muted"
      : "bg-sand text-dark";
  return (
    <span
      className={`inline-flex items-center rounded-pill px-3 py-1 text-sm font-medium ${styles}`}
    >
      {children}
    </span>
  );
}

function SexChip({ sex }: { sex: Sex }) {
  const isMale = sex === "MALE";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill px-3 py-1 text-sm font-semibold ${
        isMale ? "bg-sage/20 text-sage" : "bg-terracotta/15 text-terracotta"
      }`}
    >
      {isMale ? "♂ Male" : "♀ Female"}
    </span>
  );
}

function TraitChip({ label, source }: { label: string; source: TraitSource }) {
  const verified = source === "DNA_VERIFIED";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-sm font-medium ring-1 ring-inset ${
        verified
          ? "bg-sage/15 text-sage ring-sage/30"
          : "bg-sand text-dark ring-sand"
      }`}
      title={verified ? "DNA verified" : "Self-reported"}
    >
      {verified && <Checkmark className="w-3 h-3" />}
      {label}
    </span>
  );
}

function GoalGroup({
  label,
  items,
  empty,
}: {
  label: string;
  items: string[];
  empty: string;
}) {
  return (
    <div>
      <p className="eyebrow !text-dark-muted">{label}</p>
      {items.length === 0 ? (
        <p className="mt-3 text-sm italic text-dark-muted">{empty}</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {items.map((it) => (
            <span
              key={it}
              className="inline-flex items-center rounded-pill bg-cream px-3 py-1 text-sm font-medium text-dark ring-1 ring-inset ring-sand"
            >
              {it}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Health-record visuals ────────────────────────────────────────────── */

function RecordIcon({ type }: { type: HealthRecordType }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-terracotta/10 text-terracotta">
      {type === "VACCINE" && <SyringeIcon className="w-5 h-5" />}
      {type === "DNA" && <DnaIcon className="w-5 h-5" />}
      {type === "VET_VISIT" && <StethoscopeIcon className="w-5 h-5" />}
      {type === "CERTIFICATE" && <CertIcon className="w-5 h-5" />}
    </span>
  );
}

function RecordTypeChip({ type }: { type: HealthRecordType }) {
  const label =
    type === "VACCINE" ? "Vaccine"
    : type === "DNA" ? "DNA"
    : type === "VET_VISIT" ? "Vet visit"
    : "Certificate";
  return (
    <span className="inline-flex items-center rounded-pill bg-sand px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-dark-muted">
      {label}
    </span>
  );
}

function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="inline-flex items-center gap-1 rounded-pill bg-sage/15 px-2.5 py-1 text-xs font-semibold text-sage">
      <Checkmark className="w-3 h-3" />
      Verified
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-pill bg-dark/5 px-2.5 py-1 text-xs font-semibold text-dark-muted">
      <span className="h-1.5 w-1.5 rounded-full bg-dark-muted" />
      Self-reported
    </span>
  );
}

function TrustStat({
  label,
  ok,
  hint,
}: {
  label: string;
  ok: boolean;
  hint?: string;
}) {
  return (
    <div className="rounded-card border border-sand/60 px-2 py-3">
      <div className="flex justify-center">
        {ok ? (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sage/15 text-sage">
            <Checkmark className="w-3.5 h-3.5" />
          </span>
        ) : (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sand text-dark-muted">
            <span className="block h-2 w-2 rounded-full bg-dark-muted/40" />
          </span>
        )}
      </div>
      <p className="mt-2 text-xs font-semibold text-dark">{label}</p>
      {hint && <p className="text-[10px] text-dark-muted">{hint}</p>}
    </div>
  );
}

function TrustMeter({ value }: { value: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  return (
    <div className="relative h-20 w-20 shrink-0">
      <svg viewBox="0 0 64 64" className="-rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#E8D5B7" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="#C94B2A"
          strokeWidth="6"
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-serif text-xl font-bold leading-none text-dark">{value}</span>
      </div>
    </div>
  );
}

/* ─── Icons ────────────────────────────────────────────────────────────── */

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

function Checkmark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" fill="none" className={className} aria-hidden="true">
      <path
        d="M2 6.5 L 5 9.5 L 10 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DotsMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}

function SyringeIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M14 4l6 6M11 7l6 6M4.5 19.5l3-3m0 0L13 11l5 5-5.5 5.5a2 2 0 01-3-3z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DnaIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M6 3c0 6 12 6 12 12s-12 6-12 12M18 3c0 6-12 6-12 12s12 6 12 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M8 7h8M8 17h8M9 11h6M9 13h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function StethoscopeIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M6 3v6a4 4 0 008 0V3M10 17a4 4 0 108 0v-2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="18" cy="15" r="2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function CertIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="4" y="4" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 9h8M8 13h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="16" cy="18" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
