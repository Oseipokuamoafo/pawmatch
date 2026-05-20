import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BrowseFeed } from "@/components/browse/BrowseFeed";

export default async function BrowsePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/browse");
  }

  const pets = await prisma.pet.findMany({
    where: { ownerId: session.user.id, isActive: true },
    select: { id: true, name: true, species: true },
    orderBy: { createdAt: "desc" },
  });

  if (pets.length === 0) {
    return <NoPetState />;
  }

  return <BrowseFeed pets={pets} />;
}

function NoPetState() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-20 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-terracotta">
        Browse
      </p>
      <h1
        className="mt-3 leading-tight tracking-tight text-balance text-dark"
        style={{
          fontFamily: "var(--font-playfair, Georgia, serif)",
          fontWeight: 900,
          fontSize: "clamp(2rem, 5vw, 3rem)",
        }}
      >
        Add a pet first.
      </h1>
      <p className="mt-3 text-dark-muted leading-relaxed">
        Create at least one verified pet profile to start finding matches.
        We&apos;ll score every candidate for compatibility, health, and
        proximity to you.
      </p>
      <Link href="/dashboard/pets/new" className="btn-primary mt-8 inline-flex">
        Add a pet
      </Link>
    </div>
  );
}
