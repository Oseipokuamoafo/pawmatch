import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VetInbox, type InboxRow, type RecentSign } from "@/components/vet/VetInbox";

export const metadata = {
  title: "Vet inbox — PawMatch",
};

export default async function VetInboxPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/vet");
  }
  if (session.user.role !== "VET") {
    redirect("/dashboard");
  }

  const [pending, recentlySigned, me] = await Promise.all([
    prisma.petHealth.findMany({
      where: {
        requestedVetId: session.user.id,
        isVerified: false,
      },
      orderBy: { requestedAt: "desc" },
      include: {
        pet: {
          select: {
            id: true,
            name: true,
            breed: true,
            species: true,
            owner: { select: { id: true, name: true, email: true } },
          },
        },
      },
    }),
    prisma.petHealth.findMany({
      where: { verifiedByVetId: session.user.id, isVerified: true },
      orderBy: { verifiedAt: "desc" },
      take: 8,
      include: {
        pet: { select: { id: true, name: true, breed: true, species: true } },
      },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, vetPracticeName: true, vetApprovedAt: true },
    }),
  ]);

  const pendingRows: InboxRow[] = pending.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    notes: r.notes,
    fileUrl: r.fileUrl,
    recordDate: r.recordDate.toISOString(),
    requestedAt: r.requestedAt ? r.requestedAt.toISOString() : null,
    pet: {
      id: r.pet.id,
      name: r.pet.name,
      breed: r.pet.breed,
      species: r.pet.species,
      owner: r.pet.owner,
    },
  }));

  const recentRows: RecentSign[] = recentlySigned.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    verifiedAt: r.verifiedAt ? r.verifiedAt.toISOString() : null,
    pet: {
      id: r.pet.id,
      name: r.pet.name,
      breed: r.pet.breed,
      species: r.pet.species,
    },
  }));

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10 md:py-14">
      <header className="mb-10 max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-terracotta">
          Vet network · inbox
        </p>
        <h1
          className="mt-3 leading-[1.05] tracking-tight text-balance text-dark"
          style={{
            fontFamily: "var(--font-playfair, Georgia, serif)",
            fontWeight: 900,
            fontSize: "clamp(2.25rem, 5vw, 3rem)",
          }}
        >
          Co-sign requests
        </h1>
        <p className="mt-3 text-base leading-relaxed text-dark-muted">
          Welcome back, Dr. {me?.name ?? "Vet"}
          {me?.vetPracticeName ? ` of ${me.vetPracticeName}` : ""}. Below are
          health records owners have asked you to verify. Sign turns a
          self-reported record into a verified one across PawMatch.
        </p>
      </header>

      <VetInbox pending={pendingRows} recentlySigned={recentRows} />
    </div>
  );
}
