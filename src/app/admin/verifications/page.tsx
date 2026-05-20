import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TopNav } from "@/components/TopNav";
import { AdminVerificationsTable } from "@/components/verify/AdminVerificationsTable";

export default async function AdminVerificationsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/admin/verifications");
  }
  // Admin gate
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const rows = await prisma.verificationRequest.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          isVerified: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  // Cast Date → string for client component consumption
  const requests = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
  }));

  return (
    <div className="relative flex min-h-screen flex-col" style={{ zIndex: "var(--z-content)" as unknown as number }}>
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
            Admin · verification queue
          </p>
          <h1
            className="mt-3 leading-[1.05] tracking-tight text-balance text-dark"
            style={{
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontWeight: 900,
              fontSize: "clamp(2.25rem, 5vw, 3.25rem)",
            }}
          >
            Decide who&apos;s{" "}
            <em style={{ color: "#3679D2" }}>verified.</em>
          </h1>
          <p className="mt-3 max-w-xl text-base text-dark-muted leading-relaxed">
            Approve or reject pending breeder applications. Decisions are
            emailed to the applicant immediately.
          </p>
        </header>

        <AdminVerificationsTable initialRequests={requests} />
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
