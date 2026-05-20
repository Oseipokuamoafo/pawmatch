import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EditPetForm } from "@/components/pets/EditPetForm";

type Ctx = { params: Promise<{ id: string }> };

export default async function EditPetPage(ctx: Ctx) {
  const { id } = await ctx.params;

  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=/dashboard/pets/${id}/edit`);

  const pet = await prisma.pet.findUnique({ where: { id } });
  if (!pet) notFound();
  if (pet.ownerId !== session.user.id) notFound();

  return (
    <div className="bg-cream min-h-screen">
      <div className="mx-auto max-w-3xl px-6 pt-8">
        <Link
          href={`/dashboard/pets/${pet.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-dark-muted hover:text-terracotta transition-colors"
        >
          <BackArrow className="w-3.5 h-3.5" />
          Back to {pet.name}
        </Link>
      </div>

      <header className="mx-auto max-w-3xl px-6 pt-6 pb-10">
        <p className="eyebrow">Pet profile</p>
        <h1 className="mt-3 font-serif text-4xl md:text-5xl font-bold leading-tight tracking-tight">
          Edit {pet.name}
        </h1>
        <p className="mt-3 text-dark-muted text-balance max-w-xl">
          Update the details on this pet's profile. Photos and breeding goals
          are managed separately.
        </p>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-24">
        <EditPetForm
          pet={{
            id: pet.id,
            name: pet.name,
            species: pet.species,
            breed: pet.breed,
            sex: pet.sex,
            dateOfBirth: pet.dateOfBirth.toISOString().slice(0, 10),
            color: pet.color ?? "",
            weight: pet.weight ?? null,
            bio: pet.bio ?? "",
            isActive: pet.isActive,
          }}
        />
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
