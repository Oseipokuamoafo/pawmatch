/**
 * Seed breed reference data for PawMatch.
 *
 * 15 dog + 8 cat breeds. Each row carries realistic averageCOI ranges
 * (2–8% for healthy populations), conservative minimum breeding ages
 * per sex (months), and a few well-known recessive markers that the
 * scoring engine watches for.
 *
 * Idempotent: uses upsert on the (name, species) unique constraint so
 * re-running won't duplicate.
 *
 * Run with:
 *   npm run seed
 */

import { PrismaClient, Species } from "../src/generated/prisma";

const prisma = new PrismaClient();

interface BreedSeed {
  name: string;
  species: Species;
  group?: string;
  averageCOI: number;
  minBreedingAgeMale: number; // months
  minBreedingAgeFemale: number; // months
  commonRecessiveGenes: string[];
  description?: string;
}

const DOG_BREEDS: BreedSeed[] = [
  {
    name: "Golden Retriever",
    species: "DOG",
    group: "Sporting",
    averageCOI: 5.8,
    minBreedingAgeMale: 15,
    minBreedingAgeFemale: 18,
    commonRecessiveGenes: ["PRA-prcd", "ICT-A", "MD"],
    description: "Friendly family breed; screen for hip dysplasia and cancer risk.",
  },
  {
    name: "Labrador Retriever",
    species: "DOG",
    group: "Sporting",
    averageCOI: 4.9,
    minBreedingAgeMale: 14,
    minBreedingAgeFemale: 18,
    commonRecessiveGenes: ["EIC", "CNM", "PRA-prcd"],
  },
  {
    name: "French Bulldog",
    species: "DOG",
    group: "Non-Sporting",
    averageCOI: 7.4,
    minBreedingAgeMale: 12,
    minBreedingAgeFemale: 18,
    commonRecessiveGenes: ["DM", "HUU", "Cystinuria type III"],
    description: "Brachycephalic — heat sensitivity and breathing checks recommended.",
  },
  {
    name: "German Shepherd",
    species: "DOG",
    group: "Herding",
    averageCOI: 6.2,
    minBreedingAgeMale: 18,
    minBreedingAgeFemale: 24,
    commonRecessiveGenes: ["DM", "MDR1", "Hyperuricosuria"],
  },
  {
    name: "Poodle",
    species: "DOG",
    group: "Non-Sporting",
    averageCOI: 4.3,
    minBreedingAgeMale: 14,
    minBreedingAgeFemale: 18,
    commonRecessiveGenes: ["PRA-prcd", "vWD type I"],
  },
  {
    name: "Beagle",
    species: "DOG",
    group: "Hound",
    averageCOI: 5.1,
    minBreedingAgeMale: 12,
    minBreedingAgeFemale: 18,
    commonRecessiveGenes: ["MLS", "NCCD", "Lafora"],
  },
  {
    name: "Bulldog",
    species: "DOG",
    group: "Non-Sporting",
    averageCOI: 7.9,
    minBreedingAgeMale: 18,
    minBreedingAgeFemale: 24,
    commonRecessiveGenes: ["HUU", "Cystinuria", "DM"],
    description: "High COI population; outcross strategies strongly recommended.",
  },
  {
    name: "Rottweiler",
    species: "DOG",
    group: "Working",
    averageCOI: 5.3,
    minBreedingAgeMale: 24,
    minBreedingAgeFemale: 24,
    commonRecessiveGenes: ["JLPP", "LAD III"],
  },
  {
    name: "Yorkshire Terrier",
    species: "DOG",
    group: "Toy",
    averageCOI: 6.1,
    minBreedingAgeMale: 12,
    minBreedingAgeFemale: 15,
    commonRecessiveGenes: ["PRA-prcd", "PLN"],
  },
  {
    name: "Dachshund",
    species: "DOG",
    group: "Hound",
    averageCOI: 5.6,
    minBreedingAgeMale: 12,
    minBreedingAgeFemale: 18,
    commonRecessiveGenes: ["cord1-PRA", "Lafora", "CDDY/IVDD"],
  },
  {
    name: "Siberian Husky",
    species: "DOG",
    group: "Working",
    averageCOI: 3.8,
    minBreedingAgeMale: 18,
    minBreedingAgeFemale: 24,
    commonRecessiveGenes: ["GM1", "HUU"],
  },
  {
    name: "Shih Tzu",
    species: "DOG",
    group: "Toy",
    averageCOI: 6.7,
    minBreedingAgeMale: 12,
    minBreedingAgeFemale: 15,
    commonRecessiveGenes: ["PRA-prcd", "PLN", "Cystinuria"],
  },
  {
    name: "Doberman Pinscher",
    species: "DOG",
    group: "Working",
    averageCOI: 5.9,
    minBreedingAgeMale: 18,
    minBreedingAgeFemale: 24,
    commonRecessiveGenes: ["DCM1", "DCM2", "vWD type I"],
  },
  {
    name: "Border Collie",
    species: "DOG",
    group: "Herding",
    averageCOI: 4.2,
    minBreedingAgeMale: 18,
    minBreedingAgeFemale: 24,
    commonRecessiveGenes: ["CEA", "TNS", "MDR1", "CL"],
  },
  {
    name: "Cavalier King Charles Spaniel",
    species: "DOG",
    group: "Toy",
    averageCOI: 7.1,
    minBreedingAgeMale: 15,
    minBreedingAgeFemale: 18,
    commonRecessiveGenes: ["EFS", "CC/DE", "Curly Coat"],
    description: "Screen for mitral valve disease and syringomyelia.",
  },
];

const CAT_BREEDS: BreedSeed[] = [
  {
    name: "Persian",
    species: "CAT",
    group: "Longhair",
    averageCOI: 6.8,
    minBreedingAgeMale: 12,
    minBreedingAgeFemale: 14,
    commonRecessiveGenes: ["PKD1", "PRA-rdAc"],
    description: "Brachycephalic — screen for breathing and tear-duct issues.",
  },
  {
    name: "Maine Coon",
    species: "CAT",
    group: "Longhair",
    averageCOI: 4.7,
    minBreedingAgeMale: 14,
    minBreedingAgeFemale: 18,
    commonRecessiveGenes: ["HCM-MC", "SMA", "PK-Def"],
  },
  {
    name: "Siamese",
    species: "CAT",
    group: "Shorthair",
    averageCOI: 5.4,
    minBreedingAgeMale: 10,
    minBreedingAgeFemale: 12,
    commonRecessiveGenes: ["PRA-rdAc", "GM1", "GM2"],
  },
  {
    name: "Bengal",
    species: "CAT",
    group: "Shorthair",
    averageCOI: 4.1,
    minBreedingAgeMale: 12,
    minBreedingAgeFemale: 14,
    commonRecessiveGenes: ["PRA-b", "PK-Def"],
  },
  {
    name: "Ragdoll",
    species: "CAT",
    group: "Longhair",
    averageCOI: 5.6,
    minBreedingAgeMale: 14,
    minBreedingAgeFemale: 18,
    commonRecessiveGenes: ["HCM-RD", "PK-Def"],
  },
  {
    name: "British Shorthair",
    species: "CAT",
    group: "Shorthair",
    averageCOI: 4.9,
    minBreedingAgeMale: 14,
    minBreedingAgeFemale: 18,
    commonRecessiveGenes: ["HCM", "PKD1"],
  },
  {
    name: "Sphynx",
    species: "CAT",
    group: "Shorthair",
    averageCOI: 6.3,
    minBreedingAgeMale: 12,
    minBreedingAgeFemale: 14,
    commonRecessiveGenes: ["HCM", "CMS"],
    description: "Hairless — extra care for skin and temperature regulation.",
  },
  {
    name: "Scottish Fold",
    species: "CAT",
    group: "Shorthair",
    averageCOI: 7.6,
    minBreedingAgeMale: 14,
    minBreedingAgeFemale: 18,
    commonRecessiveGenes: ["OCD/Fd", "PKD1"],
    description: "Fold gene linked to osteochondrodysplasia — fold×straight only.",
  },
];

async function main() {
  const all = [...DOG_BREEDS, ...CAT_BREEDS];

  for (const b of all) {
    await prisma.breed.upsert({
      where: { name_species: { name: b.name, species: b.species } },
      create: {
        name: b.name,
        species: b.species,
        group: b.group ?? null,
        averageCOI: b.averageCOI,
        minBreedingAgeMale: b.minBreedingAgeMale,
        minBreedingAgeFemale: b.minBreedingAgeFemale,
        commonRecessiveGenes: b.commonRecessiveGenes,
        description: b.description ?? null,
      },
      update: {
        group: b.group ?? null,
        averageCOI: b.averageCOI,
        minBreedingAgeMale: b.minBreedingAgeMale,
        minBreedingAgeFemale: b.minBreedingAgeFemale,
        commonRecessiveGenes: b.commonRecessiveGenes,
        description: b.description ?? null,
      },
    });
  }

  const total = await prisma.breed.count();
  console.log(
    `Seeded breeds: ${total} total (${DOG_BREEDS.length} dog, ${CAT_BREEDS.length} cat). ${all.length} upserts this run.`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
