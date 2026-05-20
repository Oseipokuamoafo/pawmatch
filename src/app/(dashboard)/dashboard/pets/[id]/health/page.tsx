import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HealthRecordCard } from "@/components/health/HealthRecordCard";
import { DNAImport } from "@/components/health/DNAImport";
import type { HealthRecordType, PetHealth } from "@/generated/prisma";

type Ctx = { params: Promise<{ id: string }> };

const GROUPS: { type: HealthRecordType; label: string; copy: string }[] = [
  {
    type: "VACCINE",
    label: "Vaccines",
    copy: "Rabies, distemper, parvovirus — the recurring schedule.",
  },
  {
    type: "DNA",
    label: "DNA & genetics",
    copy: "Imported reports or single results from Embark / Wisdom Panel.",
  },
  {
    type: "VET_VISIT",
    label: "Vet visits",
    copy: "Checkups, blood work, exams.",
  },
  {
    type: "CERTIFICATE",
    label: "Certificates",
    copy: "Kennel club, championship, breeder accreditation.",
  },
];

export default async function PetHealthPage(ctx: Ctx) {
  const { id } = await ctx.params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/dashboard/pets/${id}/health`);
  }

  const pet = await prisma.pet.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      ownerId: true,
      healthRecords: {
        orderBy: { recordDate: "desc" },
      },
    },
  });
  if (!pet) notFound();
  if (pet.ownerId !== session.user.id) notFound();

  const byType = new Map<HealthRecordType, PetHealth[]>();
  for (const g of GROUPS) byType.set(g.type, []);
  for (const r of pet.healthRecords) {
    byType.get(r.type)?.push(r);
  }

  const totalCount = pet.healthRecords.length;
  const verifiedCount = pet.healthRecords.filter((r) => r.isVerified).length;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 md:py-14">
      {/* ── Breadcrumb ──────────────────────────────────────────────── */}
      <Link
        href={`/dashboard/pets/${pet.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-dark-muted hover:text-terracotta transition-colors"
      >
        <BackArrow className="h-3.5 w-3.5" />
        Back to {pet.name}
      </Link>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="mt-6 mb-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-terracotta">
            Health · {pet.name}
          </p>
          <h1
            className="mt-3 leading-[1.05] tracking-tight text-balance text-dark"
            style={{
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontWeight: 900,
              fontSize: "clamp(2.25rem, 5vw, 3.25rem)",
            }}
          >
            Records & DNA
          </h1>
          <p className="mt-3 max-w-lg text-base text-dark-muted leading-relaxed">
            {totalCount === 0
              ? "Add a record or import a DNA test to start building this pet's verified history."
              : `${totalCount} record${totalCount === 1 ? "" : "s"} on file · ${verifiedCount} verified.`}
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <DNAImport petId={pet.id} />
        </div>
      </header>

      {/* ── Groups ─────────────────────────────────────────────────── */}
      <div className="space-y-12">
        {GROUPS.map((group) => {
          const records = byType.get(group.type) ?? [];
          return (
            <section key={group.type}>
              <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <h2
                    className="leading-tight text-dark"
                    style={{
                      fontFamily: "var(--font-playfair, Georgia, serif)",
                      fontWeight: 900,
                      fontSize: "1.75rem",
                    }}
                  >
                    {group.label}
                    <span className="ml-3 text-base font-normal text-dark-muted">
                      {records.length}
                    </span>
                  </h2>
                  <p className="mt-1 text-sm text-dark-muted">{group.copy}</p>
                </div>
                <Link
                  href={`/dashboard/pets/${pet.id}/health/new?type=${group.type}`}
                  className="btn-secondary !px-4 !py-2 !text-sm"
                >
                  + Upload {group.label.toLowerCase()}
                </Link>
              </div>

              {records.length === 0 ? (
                <EmptyGroup
                  href={`/dashboard/pets/${pet.id}/health/new?type=${group.type}`}
                  label={group.label}
                />
              ) : (
                <ul className="space-y-3">
                  {records.map((r) => (
                    <li key={r.id}>
                      <HealthRecordCard record={r} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Empty group ────────────────────────────────────────────────────── */

function EmptyGroup({ href, label }: { href: string; label: string }) {
  return (
    <div className="rounded-card border-2 border-dashed border-sand bg-surface/40 p-8 text-center">
      <p className="text-sm italic text-dark-muted">
        No {label.toLowerCase()} on file yet.
      </p>
      <Link
        href={href}
        className="mt-3 inline-block text-sm font-semibold text-terracotta hover:text-[#B03E22]"
      >
        Add one →
      </Link>
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
