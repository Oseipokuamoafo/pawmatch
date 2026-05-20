import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewHealthRecordForm } from "@/components/pets/NewHealthRecordForm";

type Ctx = { params: Promise<{ id: string }> };

export default async function NewHealthRecordPage(ctx: Ctx) {
  const { id } = await ctx.params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/dashboard/pets/${id}/health/new`);
  }

  const pet = await prisma.pet.findUnique({
    where: { id },
    select: { id: true, ownerId: true, name: true, species: true },
  });
  if (!pet) notFound();
  if (pet.ownerId !== session.user.id) notFound();

  return (
    <div className="bg-cream min-h-screen">
      <div className="mx-auto max-w-2xl px-6 pt-8">
        <Link
          href={`/dashboard/pets/${pet.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-dark-muted hover:text-terracotta transition-colors"
        >
          <BackArrow className="w-3.5 h-3.5" />
          Back to {pet.name}
        </Link>
      </div>

      <header className="mx-auto max-w-2xl px-6 pt-6 pb-10">
        <p className="eyebrow">Records</p>
        <h1 className="mt-3 font-serif text-4xl md:text-5xl font-bold leading-tight tracking-tight">
          Add a health record
        </h1>
        <p className="mt-3 text-dark-muted text-balance max-w-xl">
          Log a vaccination, DNA test, vet visit or certificate for {pet.name}.
          New entries are <span className="font-italic-serif">self-reported</span> until a
          vet verifies them.
        </p>
      </header>

      <main className="mx-auto max-w-2xl px-6 pb-24">
        <NewHealthRecordForm petId={pet.id} petName={pet.name} />
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
