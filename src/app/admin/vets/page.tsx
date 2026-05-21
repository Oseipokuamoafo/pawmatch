import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TopNav } from "@/components/TopNav";
import {
  AdminVetsTable,
  type VetApplicantRow,
} from "@/components/vet/AdminVetsTable";

export const metadata = {
  title: "Vet applications — PawMatch",
};

export default async function AdminVetsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/admin/vets");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const rows = await prisma.user.findMany({
    where: {
      vetApplicationStatus: { in: ["PENDING", "APPROVED", "REJECTED"] },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      vetApplicationStatus: true,
      vetLicenseNumber: true,
      vetLicenseState: true,
      vetPracticeName: true,
      vetPracticeAddress: true,
      vetPracticePhone: true,
      vetApprovedAt: true,
      createdAt: true,
      aiScreenStatus: true,
      aiScreenConfidence: true,
      aiScreenReason: true,
      aiScreenEvidence: true,
      aiScreenedAt: true,
      aiAutoApprovedAt: true,
    },
    orderBy: [{ vetApplicationStatus: "asc" }, { createdAt: "desc" }],
  });

  const applicants: VetApplicantRow[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role,
    vetApplicationStatus: r.vetApplicationStatus,
    vetLicenseNumber: r.vetLicenseNumber,
    vetLicenseState: r.vetLicenseState,
    vetPracticeName: r.vetPracticeName,
    vetPracticeAddress: r.vetPracticeAddress,
    vetPracticePhone: r.vetPracticePhone,
    vetApprovedAt: r.vetApprovedAt ? r.vetApprovedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    aiScreenStatus: r.aiScreenStatus,
    aiScreenConfidence: r.aiScreenConfidence,
    aiScreenReason: r.aiScreenReason,
    aiScreenEvidence: r.aiScreenEvidence as
      | { url: string; title: string; quote: string }[]
      | null,
    aiScreenedAt: r.aiScreenedAt ? r.aiScreenedAt.toISOString() : null,
    aiAutoApprovedAt: r.aiAutoApprovedAt ? r.aiAutoApprovedAt.toISOString() : null,
  }));

  return (
    <div
      className="relative flex min-h-screen flex-col"
      style={{ zIndex: "var(--z-content)" as unknown as number }}
    >
      <TopNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10 md:py-14">
        <header className="mb-8 max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-terracotta">
            Admin · vet network
          </p>
          <h1
            className="mt-3 leading-[1.05] tracking-tight text-balance text-dark"
            style={{
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontWeight: 900,
              fontSize: "clamp(2rem, 5vw, 2.75rem)",
            }}
          >
            Vet applications
          </h1>
          <p className="mt-3 text-base leading-relaxed text-dark-muted">
            Confirm each applicant&apos;s veterinary license externally before
            approving. Approving promotes their account to the VET role — once
            promoted they can co-sign health records on PawMatch.
          </p>
        </header>
        <AdminVetsTable rows={applicants} />
      </main>
    </div>
  );
}
