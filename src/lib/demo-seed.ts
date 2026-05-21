import { prisma } from "@/lib/prisma";

/**
 * Demo-seed library.
 *
 * Creates a canonical pair — Luna (German Shepherd ♀) and Atlas
 * (American Pit Bull Terrier ♂) — on the given user's account, with
 * DNA-verified recessive markers that overlap on DM and Hyperuricosuria.
 * The pairing is *deliberately* one the scoring engine flags
 * (SHARED_RECESSIVE_GENE → score capped at 30) and the Punnett engine
 * predicts as 50% affected for HUU + 25% affected for DM — that's the
 * whole point. The demo shows the product doing real work.
 *
 * Idempotent: if Luna + Atlas already exist on the user, return their
 * ids without re-inserting. Callers can re-hit the endpoint safely.
 */

export interface DemoSeedResult {
  lunaId: string;
  atlasId: string;
  predictUrl: string;
  freshlySeeded: boolean;
}

const DEMO_PET_NAMES = ["Luna", "Atlas"] as const;
const DEMO_OWNER_LOCATION = { lat: 37.77, lng: -122.41 };

export async function seedDemoPetsForUser(
  userId: string,
): Promise<DemoSeedResult> {
  // Idempotency — if both pets already exist on this user, return them.
  const existing = await prisma.pet.findMany({
    where: { ownerId: userId, name: { in: [...DEMO_PET_NAMES] }, isActive: true },
    select: { id: true, name: true, breed: true },
  });
  const existingLuna = existing.find(
    (p) => p.name === "Luna" && p.breed === "German Shepherd",
  );
  const existingAtlas = existing.find(
    (p) => p.name === "Atlas" && p.breed === "American Pit Bull Terrier",
  );
  if (existingLuna && existingAtlas) {
    return {
      lunaId: existingLuna.id,
      atlasId: existingAtlas.id,
      predictUrl: `/predict?a=${existingLuna.id}&b=${existingAtlas.id}`,
      freshlySeeded: false,
    };
  }

  // Make sure the APBT breed row exists (it's not in the base seed).
  await prisma.breed.upsert({
    where: {
      name_species: {
        name: "American Pit Bull Terrier",
        species: "DOG",
      },
    },
    create: {
      name: "American Pit Bull Terrier",
      slug: "american-pit-bull-terrier",
      species: "DOG",
      group: "Terrier",
      averageCOI: 5.8,
      minBreedingAgeMale: 18,
      minBreedingAgeFemale: 24,
      commonRecessiveGenes: ["DM", "Hyperuricosuria", "Cerebellar Ataxia"],
      heroImageUrl:
        "https://images.unsplash.com/photo-1583511666372-62fc211f8377?w=800",
      temperament: ["Confident", "Affectionate", "Strong-willed"],
      lifespanMinYears: 10,
      lifespanMaxYears: 14,
      weightKgMin: 14,
      weightKgMax: 27,
      description:
        "Strong, athletic terrier breed with a deep loyalty to family. Often confused with the American Staffordshire Terrier and American Bully — distinct breeds with overlapping ancestry.",
    },
    update: {},
  });

  // Set owner location if missing — the matching engine wants it for
  // the proximity score, and the demo otherwise lands on a 0/10 there.
  await prisma.user.update({
    where: { id: userId },
    data: {
      locationLat: { set: DEMO_OWNER_LOCATION.lat },
      locationLng: { set: DEMO_OWNER_LOCATION.lng },
    },
  });

  const luna =
    existingLuna ??
    (await prisma.pet.create({
      data: {
        ownerId: userId,
        name: "Luna",
        species: "DOG",
        breed: "German Shepherd",
        sex: "FEMALE",
        dateOfBirth: new Date("2022-03-15"),
        color: "Black & tan",
        weight: 28,
        bio: "Confident, structured, working line. Health-tested with Embark. (Demo pet.)",
        livePhotoUrl:
          "https://images.unsplash.com/photo-1568393691622-c7ba131d63b4?w=600",
        photos: {
          create: [
            {
              url: "https://images.unsplash.com/photo-1568393691622-c7ba131d63b4?w=1200",
              isPrimary: true,
            },
          ],
        },
        traits: {
          create: [
            { traitName: "Coat color", traitValue: "Black & tan", source: "SELF_REPORTED" },
            { traitName: "Temperament", traitValue: "Confident, alert", source: "SELF_REPORTED" },
            { traitName: "DM (recessive) (health)", traitValue: "Carrier", source: "DNA_VERIFIED" },
            { traitName: "MDR1 (recessive) (health)", traitValue: "Clear", source: "DNA_VERIFIED" },
            { traitName: "Hyperuricosuria (HUU) (recessive) (health)", traitValue: "Carrier", source: "DNA_VERIFIED" },
            { traitName: "coiEstimate", traitValue: "5.4", source: "DNA_VERIFIED" },
          ],
        },
        healthRecords: {
          create: [
            {
              type: "DNA",
              title: "Embark Breed + Health Panel",
              recordDate: new Date("2024-09-12"),
              isVerified: true,
              verifiedBy: "Embark Veterinary",
              verifiedAt: new Date("2024-09-13"),
              notes: "Full breed-relevant panel. Clear MDR1, carrier DM + HUU.",
            },
            {
              type: "VACCINE",
              title: "Annual core (DA2PP + Rabies)",
              recordDate: new Date("2025-02-08"),
              isVerified: false,
            },
          ],
        },
        breedingGoals: {
          create: {
            desiredTraits: ["Athletic", "Confident", "Health-tested"],
            preferredBreeds: ["German Shepherd", "American Pit Bull Terrier"],
            maxCOI: 8,
            notes: "Looking for a structurally sound male with clean HUU/DM.",
          },
        },
      },
    }));

  const atlas =
    existingAtlas ??
    (await prisma.pet.create({
      data: {
        ownerId: userId,
        name: "Atlas",
        species: "DOG",
        breed: "American Pit Bull Terrier",
        sex: "MALE",
        dateOfBirth: new Date("2022-07-21"),
        color: "Brindle",
        weight: 24,
        bio: "Athletic working-line APBT. Calm temperament, fully health-tested. (Demo pet.)",
        livePhotoUrl:
          "https://images.unsplash.com/photo-1583511666372-62fc211f8377?w=600",
        photos: {
          create: [
            {
              url: "https://images.unsplash.com/photo-1583511666372-62fc211f8377?w=1200",
              isPrimary: true,
            },
          ],
        },
        traits: {
          create: [
            { traitName: "Coat color", traitValue: "Brindle", source: "SELF_REPORTED" },
            { traitName: "Temperament", traitValue: "Calm, confident", source: "SELF_REPORTED" },
            { traitName: "DM (recessive) (health)", traitValue: "Carrier", source: "DNA_VERIFIED" },
            { traitName: "Hyperuricosuria (HUU) (recessive) (health)", traitValue: "Affected", source: "DNA_VERIFIED" },
            { traitName: "Cerebellar Ataxia (recessive) (health)", traitValue: "Clear", source: "DNA_VERIFIED" },
            { traitName: "coiEstimate", traitValue: "4.9", source: "DNA_VERIFIED" },
          ],
        },
        healthRecords: {
          create: [
            {
              type: "DNA",
              title: "Wisdom Panel Premium",
              recordDate: new Date("2024-11-02"),
              isVerified: true,
              verifiedBy: "Wisdom Panel",
              verifiedAt: new Date("2024-11-03"),
              notes: "Affected for HUU, carrier DM, clear NCL/Ataxia.",
            },
            {
              type: "VET_VISIT",
              title: "Pre-breeding wellness exam",
              recordDate: new Date("2025-01-22"),
              isVerified: false,
            },
          ],
        },
      },
    }));

  return {
    lunaId: luna.id,
    atlasId: atlas.id,
    predictUrl: `/predict?a=${luna.id}&b=${atlas.id}`,
    freshlySeeded: !existingLuna || !existingAtlas,
  };
}
