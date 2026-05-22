import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBreedReferencePhotos } from "@/lib/breed-reference-photos";

/**
 * POST /api/predict/offspring/images
 *
 * Returns a gallery of REAL photographs for the parent breeds of a
 * given pair. No AI image generation — every URL here is a real
 * licensed photograph (Unsplash + our own pet uploads). Specifically:
 *
 *   - The actual seeded photos of both pets (Pet.livePhotoUrl,
 *     Pet.photos[0].url)
 *   - Each breed's heroImageUrl from the Breed table
 *   - Optional curated reference photos per breed from
 *     src/lib/breed-reference-photos.ts
 *
 * Mixes are not AI-generated. The UI explicitly disclaims that
 * offspring will combine parent traits in unpredictable ways.
 */

const schema = z.object({
  petAId: z.string().min(1),
  petBId: z.string().min(1),
});

export interface OffspringGallerySide {
  petName: string;
  breedName: string;
  /** The actual photo of this specific pet (live photo or primary). */
  petPhoto: string | null;
  /** The breed's hero photo from the Breed table. */
  breedHero: string | null;
  /** 0-3 additional curated reference photos of the breed. */
  references: { url: string; caption: string }[];
}

export interface OffspringGalleryResponse {
  parentA: OffspringGallerySide;
  parentB: OffspringGallerySide;
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
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { petAId, petBId } = parsed.data;

  const [petA, petB] = await Promise.all([
    prisma.pet.findUnique({
      where: { id: petAId },
      select: {
        ownerId: true,
        name: true,
        breed: true,
        livePhotoUrl: true,
        photos: {
          where: { isPrimary: true },
          select: { url: true },
          take: 1,
        },
      },
    }),
    prisma.pet.findUnique({
      where: { id: petBId },
      select: {
        name: true,
        breed: true,
        livePhotoUrl: true,
        photos: {
          where: { isPrimary: true },
          select: { url: true },
          take: 1,
        },
      },
    }),
  ]);
  if (!petA || !petB) {
    return NextResponse.json({ error: "Pet not found" }, { status: 404 });
  }
  if (petA.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [breedA, breedB] = await Promise.all([
    prisma.breed.findFirst({
      where: { name: { equals: petA.breed, mode: "insensitive" } },
      select: { heroImageUrl: true },
    }),
    prisma.breed.findFirst({
      where: { name: { equals: petB.breed, mode: "insensitive" } },
      select: { heroImageUrl: true },
    }),
  ]);

  const response: OffspringGalleryResponse = {
    parentA: {
      petName: petA.name,
      breedName: petA.breed,
      petPhoto: petA.photos[0]?.url ?? petA.livePhotoUrl ?? null,
      breedHero: breedA?.heroImageUrl ?? null,
      references: getBreedReferencePhotos(petA.breed),
    },
    parentB: {
      petName: petB.name,
      breedName: petB.breed,
      petPhoto: petB.photos[0]?.url ?? petB.livePhotoUrl ?? null,
      breedHero: breedB?.heroImageUrl ?? null,
      references: getBreedReferencePhotos(petB.breed),
    },
  };
  return NextResponse.json(response);
}
