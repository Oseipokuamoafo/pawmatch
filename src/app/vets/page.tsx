import { prisma } from "@/lib/prisma";
import {
  VetDirectory,
  type VetDirectoryRow,
} from "@/components/vet/VetDirectory";

export const metadata = {
  title: "Vet network — PawMatch",
  description:
    "Browse PawMatch's approved veterinarians. Every vet listed here has had their license verified by our admin team and can co-sign pet health records on the platform.",
};

export default async function VetsIndexPage() {
  // Approved vets only — APPROVED + role=VET. Pull sig + decline counts via
  // a single groupBy on PetHealth to avoid an N+1.
  const vets = await prisma.user.findMany({
    where: { role: "VET", vetApplicationStatus: "APPROVED" },
    orderBy: [{ vetApprovedAt: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      vetPracticeName: true,
      vetPracticeAddress: true,
      vetLicenseState: true,
      vetApprovedAt: true,
    },
  });

  const sigCounts = await prisma.petHealth.groupBy({
    by: ["verifiedByVetId"],
    where: {
      verifiedByVetId: { in: vets.map((v) => v.id) },
      isVerified: true,
    },
    _count: { _all: true },
  });
  const countById = new Map<string, number>();
  for (const row of sigCounts) {
    if (row.verifiedByVetId) {
      countById.set(row.verifiedByVetId, row._count._all);
    }
  }

  const rows: VetDirectoryRow[] = vets.map((v) => ({
    id: v.id,
    name: v.name,
    practiceName: v.vetPracticeName,
    practiceAddress: v.vetPracticeAddress,
    licenseState: v.vetLicenseState,
    approvedAt: v.vetApprovedAt ? v.vetApprovedAt.toISOString() : null,
    signatureCount: countById.get(v.id) ?? 0,
  }));

  return <VetDirectory vets={rows} />;
}
