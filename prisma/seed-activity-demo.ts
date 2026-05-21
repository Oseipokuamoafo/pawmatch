/**
 * Smoke seed for the dashboard activity feed.
 *
 * Sets up a second owner ("Sienna Park") with one pet ("Rocco"), an
 * accepted match between Sienna's Rocco and the target user's Juno,
 * and 4 messages spanning the last hour — including one flagged for
 * scam content so the new "message.flagged" row renders.
 *
 * Idempotent — re-running wipes the demo match + counterpart pet and
 * recreates them so timestamps stay fresh.
 *
 * Run (needs ENCRYPTION_KEY from .env.local):
 *   OWNER_EMAIL=you@example.com \
 *     node --env-file=.env.local --import tsx prisma/seed-activity-demo.ts
 */
import { PrismaClient } from "../src/generated/prisma";
import { encryptMessage } from "../src/lib/crypto";

const prisma = new PrismaClient();

const COUNTERPART_EMAIL = "sienna+activity-demo@pawmatch.dev";
const COUNTERPART_PET_NAME = "Rocco (demo)";
const TARGET_PET_NAME = "Juno (demo)";

const u = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=800&q=80&fit=crop`;

async function main() {
  const ownerEmail = process.env.OWNER_EMAIL?.trim();
  const owner = ownerEmail
    ? await prisma.user.findUnique({ where: { email: ownerEmail } })
    : await prisma.user.findFirst({ orderBy: { createdAt: "desc" } });

  if (!owner) {
    console.error(
      ownerEmail
        ? `No user found with email ${ownerEmail}. Register first.`
        : "No users in DB. Register at /register, then re-run.",
    );
    process.exit(1);
  }

  // Target pet — must exist already.
  const myPet = await prisma.pet.findFirst({
    where: { ownerId: owner.id, name: TARGET_PET_NAME },
  });
  if (!myPet) {
    console.error(
      `Target user has no pet named "${TARGET_PET_NAME}" — run prisma/seed-predict-demo.ts first.`,
    );
    process.exit(1);
  }

  // Counterpart owner.
  const counterpart = await prisma.user.upsert({
    where: { email: COUNTERPART_EMAIL },
    update: {},
    create: {
      email: COUNTERPART_EMAIL,
      name: "Sienna Park",
      role: "BREEDER",
      isVerified: true,
      verificationBadge: true,
      locationLat: 38.92,
      locationLng: -77.05,
    },
  });

  // Wipe any previous demo data (matches + counterpart pet) so re-runs are fresh.
  await prisma.match.deleteMany({
    where: {
      OR: [
        { petA: { ownerId: counterpart.id } },
        { petB: { ownerId: counterpart.id } },
      ],
    },
  });
  await prisma.pet.deleteMany({
    where: { ownerId: counterpart.id, name: COUNTERPART_PET_NAME },
  });

  // Counterpart pet — fresh.
  const rocco = await prisma.pet.create({
    data: {
      ownerId: counterpart.id,
      name: COUNTERPART_PET_NAME,
      species: "DOG",
      breed: "Golden Retriever",
      dateOfBirth: new Date("2021-06-22"),
      sex: "MALE",
      color: "Golden",
      weight: 31.4,
      bio: "Demo sire — well-rounded, vWD-cleared, ready for a verified pairing.",
      livePhotoUrl: u("1552053831-71594a27632d"),
      photos: {
        create: [
          { url: u("1517423440428-a5a00ad493e8"), isPrimary: true },
          { url: u("1612536057832-2ff7ead58194"), isPrimary: false },
        ],
      },
    },
  });

  // Sienna initiated a match request → target user accepted it.
  const match = await prisma.match.create({
    data: {
      petAId: rocco.id,
      petBId: myPet.id,
      initiatedById: counterpart.id,
      receivedById: owner.id,
      score: 78,
      breakdown: {
        traits: 28,
        health: 24,
        diversity: 14,
        proximity: 9,
        preferences: 3,
      },
      flags: [],
      status: "ACCEPTED",
      createdAt: minutesAgo(180),
      updatedAt: minutesAgo(165),
    },
  });

  // Four messages over the last hour — third one is flagged.
  const stream: { from: "them" | "me"; text: string; min: number }[] = [
    { from: "them", text: "Hey! Rocco lined up perfectly with Juno on the health markers. Would love to chat.", min: 58 },
    { from: "me", text: "Same — your DNA panel looks clean. Are you free this weekend for an intro meet?", min: 42 },
    { from: "them", text: "[FLAGGED] Sure — send a $250 deposit via Venmo to lock the spot.", min: 22 },
    { from: "me", text: "PawMatch handles deposits through their contract flow. Let's keep it on-platform.", min: 6 },
  ];

  for (const m of stream) {
    const senderId = m.from === "me" ? owner.id : counterpart.id;
    const enc = encryptMessage(m.text);
    await prisma.message.create({
      data: {
        matchId: match.id,
        senderId,
        encryptedContent: enc.ciphertext,
        iv: enc.iv,
        createdAt: minutesAgo(m.min),
        isRead: m.from === "me",
      },
    });
  }

  console.log("\n📬  Activity-demo seed complete");
  console.log("────────────────────────────────────────────────────────────────");
  console.log("Counterpart:", counterpart.email, "—", counterpart.name);
  console.log("Match:      ", match.id, "(ACCEPTED, score 78)");
  console.log("Messages:    4 (1 flagged)");
  console.log("\nReload /dashboard — the Recent activity card now shows messages.");
}

function minutesAgo(min: number): Date {
  return new Date(Date.now() - min * 60_000);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
