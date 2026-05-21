import { prisma } from "@/lib/prisma";
import {
  BreedsDirectory,
  type BreedCardData,
} from "@/components/breeds/BreedsDirectory";
import { slugifyBreed } from "@/lib/breeds";

export const metadata = {
  title: "Breed directory — PawMatch",
  description:
    "Browse every dog and cat breed on PawMatch: average COI, common recessive markers, lifespan, and the pets carrying each lineage.",
};

export default async function BreedsIndexPage() {
  const breeds = await prisma.breed.findMany({
    orderBy: [{ species: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      species: true,
      group: true,
      averageCOI: true,
      heroImageUrl: true,
      temperament: true,
      lifespanMinYears: true,
      lifespanMaxYears: true,
    },
  });

  // Aggregate pet counts per breed name in one round trip rather than N+1.
  const petCounts = await prisma.pet.groupBy({
    by: ["breed"],
    where: { isActive: true },
    _count: { _all: true },
  });
  const countByBreedName = new Map<string, number>(
    petCounts.map((row) => [row.breed.toLowerCase(), row._count._all]),
  );

  const data: BreedCardData[] = breeds.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug ?? slugifyBreed(b.name),
    species: b.species,
    group: b.group,
    averageCOI: b.averageCOI,
    heroImageUrl: b.heroImageUrl,
    temperament: b.temperament,
    lifespanMinYears: b.lifespanMinYears,
    lifespanMaxYears: b.lifespanMaxYears,
    petCount: countByBreedName.get(b.name.toLowerCase()) ?? 0,
  }));

  return <BreedsDirectory breeds={data} />;
}
