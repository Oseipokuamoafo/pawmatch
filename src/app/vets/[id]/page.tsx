import { notFound } from "next/navigation";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import type { HealthRecordType } from "@/generated/prisma";

type Ctx = { params: Promise<{ id: string }> };

const TYPE_LABEL: Record<HealthRecordType, string> = {
  VACCINE: "Vaccine",
  DNA: "DNA",
  VET_VISIT: "Vet visit",
  CERTIFICATE: "Certificate",
};

export async function generateMetadata(ctx: Ctx) {
  const { id } = await ctx.params;
  const vet = await prisma.user.findUnique({
    where: { id },
    select: { name: true, vetPracticeName: true, role: true },
  });
  if (!vet || vet.role !== "VET") {
    return { title: "Vet — PawMatch" };
  }
  return {
    title: `Dr. ${vet.name ?? "Vet"}${vet.vetPracticeName ? ` · ${vet.vetPracticeName}` : ""} — PawMatch`,
    description: `Verified veterinarian on PawMatch${vet.vetPracticeName ? ` at ${vet.vetPracticeName}` : ""}.`,
  };
}

export default async function VetProfilePage(ctx: Ctx) {
  const { id } = await ctx.params;

  const vet = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      role: true,
      vetApplicationStatus: true,
      vetPracticeName: true,
      vetPracticeAddress: true,
      vetLicenseState: true,
      vetApprovedAt: true,
    },
  });
  if (!vet || vet.role !== "VET" || vet.vetApplicationStatus !== "APPROVED") {
    notFound();
  }

  // Aggregate stats — total signatures, breakdown by record type, breeds
  // covered. All counts come from PetHealth rows where verifiedByVetId =
  // this vet AND isVerified=true. We anonymize: never expose owner names,
  // pet names, owner email, or document URLs on the public profile.
  const signedRecords = await prisma.petHealth.findMany({
    where: { verifiedByVetId: vet.id, isVerified: true },
    select: {
      id: true,
      type: true,
      verifiedAt: true,
      pet: { select: { breed: true, species: true } },
    },
    orderBy: { verifiedAt: "desc" },
    take: 200,
  });

  const total = signedRecords.length;

  const byType = new Map<HealthRecordType, number>();
  for (const r of signedRecords) {
    byType.set(r.type, (byType.get(r.type) ?? 0) + 1);
  }

  const byBreed = new Map<string, number>();
  for (const r of signedRecords) {
    byBreed.set(r.pet.breed, (byBreed.get(r.pet.breed) ?? 0) + 1);
  }
  const topBreeds = Array.from(byBreed.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const lastSignedAt = signedRecords[0]?.verifiedAt ?? null;
  const memberSinceLabel = vet.vetApprovedAt
    ? new Date(vet.vetApprovedAt).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })
    : null;
  const lastSignedLabel = lastSignedAt
    ? new Date(lastSignedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 md:py-14">
      <Link
        href="/vets"
        className="inline-flex items-center gap-1.5 text-sm text-dark-muted transition-colors hover:text-terracotta"
      >
        <BackArrow className="h-3.5 w-3.5" />
        All vets
      </Link>

      <header className="mt-6 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-terracotta">
            Verified vet
            {memberSinceLabel ? ` · since ${memberSinceLabel}` : ""}
          </p>
          <h1
            className="mt-3 leading-[1.05] tracking-tight text-balance text-dark"
            style={{
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontWeight: 900,
              fontSize: "clamp(2.25rem, 5.5vw, 3.25rem)",
            }}
          >
            Dr. {vet.name ?? "—"}
          </h1>
          {vet.vetPracticeName && (
            <p className="mt-2 text-lg text-dark">{vet.vetPracticeName}</p>
          )}
          {vet.vetPracticeAddress && (
            <p className="mt-1 text-sm text-dark-muted">
              {vet.vetPracticeAddress}
            </p>
          )}
        </div>
        <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-[#1D9E75]/15 px-3 py-1.5 text-xs font-semibold text-[#1D9E75] dark:text-[#7FBF88]">
          <Check className="h-3 w-3" />
          License verified
        </span>
      </header>

      <section className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <BigStat label="Records signed" value={total} />
        <BigStat
          label="Last signature"
          value={lastSignedLabel ?? "—"}
          tone="muted"
        />
        <BigStat
          label="Practice state"
          value={vet.vetLicenseState ?? "—"}
          tone="muted"
        />
      </section>

      {/* ── Type breakdown ──────────────────────────────────────────── */}
      <section className="mt-12">
        <h2
          className="leading-tight text-dark"
          style={{
            fontFamily: "var(--font-playfair, Georgia, serif)",
            fontWeight: 900,
            fontSize: "1.5rem",
          }}
        >
          What this vet signs
        </h2>
        <p className="mt-1 text-sm text-dark-muted">
          A breakdown of the record types Dr. {vet.name?.split(" ")[0] ?? "—"}{" "}
          has co-signed on PawMatch.
        </p>

        {total === 0 ? (
          <div className="card mt-4 py-8 text-center">
            <p className="text-sm italic text-dark-muted">
              No signatures yet. Once owners request co-signature and Dr.{" "}
              {vet.name?.split(" ")[0] ?? "—"} signs records, they&apos;ll show
              up here.
            </p>
          </div>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(Object.keys(TYPE_LABEL) as HealthRecordType[]).map((t) => {
              const c = byType.get(t) ?? 0;
              return (
                <li
                  key={t}
                  className="rounded-2xl border border-sand bg-surface p-4"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-dark-muted">
                    {TYPE_LABEL[t]}
                  </p>
                  <p
                    className="mt-1 leading-none text-dark"
                    style={{
                      fontFamily: "var(--font-playfair, Georgia, serif)",
                      fontWeight: 900,
                      fontSize: "1.75rem",
                    }}
                  >
                    {c}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Breeds ─────────────────────────────────────────────────── */}
      {topBreeds.length > 0 && (
        <section className="mt-12">
          <h2
            className="leading-tight text-dark"
            style={{
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontWeight: 900,
              fontSize: "1.5rem",
            }}
          >
            Top breeds signed
          </h2>
          <p className="mt-1 text-sm text-dark-muted">
            Which lineages this vet sees most often on PawMatch.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {topBreeds.map(([breed, count]) => (
              <li
                key={breed}
                className="inline-flex items-center gap-2 rounded-full border border-sand bg-cream/40 px-3 py-1.5 text-sm text-dark"
              >
                <span className="font-semibold">{breed}</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-dark-muted">
                  {count}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-16 rounded-3xl border border-sand bg-cream/40 p-6 text-sm text-dark-muted">
        <p>
          Want Dr. {vet.name?.split(" ")[0] ?? "—"} to co-sign one of your pet&apos;s
          health records? Open the record in your dashboard and pick this vet
          from the co-sign picker.
        </p>
      </footer>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────── */

function BigStat({
  label,
  value,
  tone = "primary",
}: {
  label: string;
  value: number | string;
  tone?: "primary" | "muted";
}) {
  return (
    <div className="rounded-3xl border border-sand bg-surface p-5 shadow-card">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-dark-muted">
        {label}
      </p>
      <p
        className={`mt-2 leading-none ${tone === "primary" ? "text-terracotta" : "text-dark"}`}
        style={{
          fontFamily: "var(--font-playfair, Georgia, serif)",
          fontWeight: 900,
          fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
        }}
      >
        {value}
      </p>
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
