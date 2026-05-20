import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPetSchema } from "@/lib/validations/pet";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pets = await prisma.pet.findMany({
    where: { ownerId: session.user.id },
    include: {
      photos: { orderBy: { isPrimary: "desc" } },
      breedingGoals: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ pets });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createPetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Ensure exactly one primary photo if any photos exist
  const photos = data.photos.map((p, i) => ({
    ...p,
    isPrimary: data.photos.some((x) => x.isPrimary) ? p.isPrimary : i === 0,
  }));

  const pet = await prisma.pet.create({
    data: {
      ownerId: session.user.id,
      name: data.name,
      species: data.species,
      breed: data.breed,
      sex: data.sex,
      dateOfBirth: new Date(data.dateOfBirth),
      color: data.color || null,
      weight: data.weight ?? null,
      bio: data.bio || null,
      livePhotoUrl: data.livePhotoUrl,
      photos: {
        create: photos.map((p) => ({ url: p.url, isPrimary: p.isPrimary })),
      },
      breedingGoals: {
        create: {
          desiredTraits: data.desiredTraits,
          preferredBreeds: data.preferredBreeds,
          maxCOI: data.maxCOI,
          notes: data.goalNotes || null,
        },
      },
    },
    include: { photos: true, breedingGoals: true },
  });

  return NextResponse.json({ pet }, { status: 201 });
}
