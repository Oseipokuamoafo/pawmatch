import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TopNav } from "@/components/TopNav";
import { AdminReportsTable } from "@/components/admin/AdminReportsTable";

export default async function AdminReportsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/admin/reports");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const rows = await prisma.report.findMany({
    include: {
      reporter: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  // Resolve targets in a second pass
  const petIds = rows.map((r) => r.targetPetId).filter((id): id is string => Boolean(id));
  const userIds = rows.map((r) => r.targetUserId).filter((id): id is string => Boolean(id));
  const [pets, users] = await Promise.all([
    petIds.length
      ? prisma.pet.findMany({
          where: { id: { in: petIds } },
          select: { id: true, name: true, breed: true, ownerId: true },
        })
      : Promise.resolve([]),
    userIds.length
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : Promise.resolve([]),
  ]);
  const petById = new Map(pets.map((p) => [p.id, p]));
  const userById = new Map(users.map((u) => [u.id, u]));

  const initialReports = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    target: {
      pet: r.targetPetId ? petById.get(r.targetPetId) ?? null : null,
      user: r.targetUserId ? userById.get(r.targetUserId) ?? null : null,
    },
  }));

  return (
    <div
      className="relative flex min-h-screen flex-col"
      style={{ zIndex: "var(--z-content)" as unknown as number }}
    >
      <TopNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10 md:py-14">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-dark-muted hover:text-terracotta transition-colors"
        >
          <BackArrow className="h-3.5 w-3.5" />
          Dashboard
        </Link>

        <header className="mt-6 mb-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-terracotta">
            Admin · trust queue
          </p>
          <h1
            className="mt-3 leading-[1.05] tracking-tight text-balance text-dark"
            style={{
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontWeight: 900,
              fontSize: "clamp(2.25rem, 5vw, 3.25rem)",
            }}
          >
            Community{" "}
            <em style={{ color: "#C94B2A" }}>reports.</em>
          </h1>
          <p className="mt-3 max-w-xl text-base text-dark-muted leading-relaxed">
            Triage flagged profiles. Mark reviewed once you&apos;ve looked,
            resolved when you&apos;ve acted, or dismissed if there&apos;s no
            issue.
          </p>
        </header>

        <AdminReportsTable initialReports={initialReports} />
      </main>
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
