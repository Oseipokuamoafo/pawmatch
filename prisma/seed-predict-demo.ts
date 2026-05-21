/**
 * One-shot smoke seed for the Punnett predictor.
 *
 * Adds two demo pets (Juno + Atlas) onto an existing owner so the
 * severity tiers on /predict are all visible:
 *
 *   - PRA  (health):  carrier × carrier  → danger (25% affected)
 *   - DM   (health):  clear   × carrier  → warn   (50% carrier)
 *   - vWD  (health):  clear   × clear    → ok     (100% clear)
 *   - Coat colour:    Bb      × bb       → 50/50 brown vs black
 *
 * Idempotent — re-running deletes the prior demo pair and recreates it.
 *
 * Usage:
 *
 *   # Attach to your signed-in account (recommended):
 *   OWNER_EMAIL=you@example.com npx tsx prisma/seed-predict-demo.ts
 *
 *   # Or fall back to the most-recent user in the DB:
 *   npx tsx prisma/seed-predict-demo.ts
 */
import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

const PET_A_NAME = "Juno (demo)";
const PET_B_NAME = "Atlas (demo)";

async function main() {
  // ── 1. Anchor user ─────────────────────────────────────────────────
  const ownerEmail = process.env.OWNER_EMAIL?.trim();
  const user = ownerEmail
    ? await prisma.user.findUnique({ where: { email: ownerEmail } })
    : await prisma.user.findFirst({ orderBy: { createdAt: "desc" } });

  if (!user) {
    console.error(
      ownerEmail
        ? `No user found with email ${ownerEmail}. Register first at /register.`
        : "No users in the database yet. Register one at /register, then re-run.",
    );
    process.exit(1);
  }

  // ── 2. Reset any previous demo pets so IDs stay deterministic ──────
  await prisma.pet.deleteMany({
    where: { ownerId: user.id, name: { in: [PET_A_NAME, PET_B_NAME] } },
  });

  // ── 3. Pet A — carrier carrier clear coat=Bb ───────────────────────
  const petA = await prisma.pet.create({
    data: {
      ownerId: user.id,
      name: PET_A_NAME,
      species: "DOG",
      breed: "Labrador Retriever",
      dateOfBirth: new Date("2022-04-12"),
      sex: "FEMALE",
      color: "Chocolate",
      weight: 28.5,
      bio: "Demo pet for /predict — has a carrier-status PRA + DM.",
      traits: {
        create: [
          {
            traitName: "PRA (health)",
            traitValue: "carrier",
            source: "DNA_VERIFIED",
          },
          {
            traitName: "DM (health)",
            traitValue: "clear",
            source: "DNA_VERIFIED",
          },
          {
            traitName: "vWD (health)",
            traitValue: "clear",
            source: "DNA_VERIFIED",
          },
          {
            traitName: "Coat colour",
            traitValue: "Bb",
            source: "DNA_VERIFIED",
          },
        ],
      },
    },
  });

  // ── 4. Pet B — carrier × clear × clear × bb ─────────────────────────
  const petB = await prisma.pet.create({
    data: {
      ownerId: user.id,
      name: PET_B_NAME,
      species: "DOG",
      breed: "Labrador Retriever",
      dateOfBirth: new Date("2021-09-30"),
      sex: "MALE",
      color: "Black",
      weight: 32.1,
      bio: "Demo sire for /predict — PRA carrier, DM carrier, vWD clear.",
      traits: {
        create: [
          {
            traitName: "PRA (health)",
            traitValue: "carrier",
            source: "DNA_VERIFIED",
          },
          {
            traitName: "DM (health)",
            traitValue: "carrier",
            source: "DNA_VERIFIED",
          },
          {
            traitName: "vWD (health)",
            traitValue: "clear",
            source: "DNA_VERIFIED",
          },
          {
            traitName: "Coat colour",
            traitValue: "bb",
            source: "DNA_VERIFIED",
          },
        ],
      },
    },
  });

  console.log("\n🧬  Predict-demo seed complete");
  console.log("────────────────────────────────────────────────────────────────");
  console.log("Anchored to owner:", user.email);
  console.log("Pet A (you):       ", petA.id, "—", petA.name);
  console.log("Pet B:             ", petB.id, "—", petB.name);
  console.log("\nSign in as", user.email, "then open:");
  console.log(
    `  http://localhost:3142/predict?a=${petA.id}&b=${petB.id}\n`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
