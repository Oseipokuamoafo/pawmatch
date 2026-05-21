/**
 * Server-side helpers for the breed directory. Slug is the source of
 * truth in URLs, so we always go slug → DB.
 */
import { prisma } from "@/lib/prisma";

export function slugifyBreed(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function findBreedBySlug(slug: string) {
  // Prefer the stored slug, fall back to a slugify(name) match for any
  // legacy row that wasn't reseeded yet.
  return prisma.breed.findFirst({
    where: {
      OR: [
        { slug },
        { name: { equals: slug.replace(/-/g, " "), mode: "insensitive" } },
      ],
    },
  });
}

/** Count of pets currently on the platform for a given breed name. */
export async function countPetsForBreed(breedName: string): Promise<number> {
  return prisma.pet.count({
    where: { breed: { equals: breedName, mode: "insensitive" }, isActive: true },
  });
}

/** Sample pets on the platform for the breed detail page sidebar. */
export async function samplePetsForBreed(breedName: string, take = 6) {
  return prisma.pet.findMany({
    where: { breed: { equals: breedName, mode: "insensitive" }, isActive: true },
    select: {
      id: true,
      name: true,
      sex: true,
      dateOfBirth: true,
      livePhotoUrl: true,
      photos: {
        select: { url: true, isPrimary: true },
        orderBy: { isPrimary: "desc" },
        take: 1,
      },
      owner: { select: { verificationBadge: true } },
    },
    orderBy: { createdAt: "desc" },
    take,
  });
}
