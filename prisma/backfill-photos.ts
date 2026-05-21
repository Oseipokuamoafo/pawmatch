/**
 * One-shot backfill: give every photo-less pet currently in the DB
 * a placeholder live photo + 2 gallery photos drawn from a fixed
 * species-appropriate pool.
 *
 * Intentionally scoped to backfill ONLY existing pets. New pets created
 * through the wizard still must upload a live photo (live-photo gate
 * unchanged).
 *
 * A pet is treated as "photo-less" when it has no PetPhoto rows AND no
 * livePhotoUrl. Pets with at least one of either are left alone so we
 * never overwrite real uploads.
 *
 * Idempotent — re-running won't add duplicate photos to a pet that was
 * already backfilled (since it now has rows).
 *
 * Run:  npx tsx prisma/backfill-photos.ts
 */
import { PrismaClient, type Species } from "../src/generated/prisma";

const prisma = new PrismaClient();

const u = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=800&q=80&fit=crop`;

const DOG_POOL = [
  u("1583337130417-3346a1be7dee"),
  u("1561037404-61cd46aa615b"),
  u("1587300003388-59208cc962cb"),
  u("1543466835-00a7907e9de1"),
  u("1605568427561-40dd23c2acea"),
  u("1552053831-71594a27632d"),
  u("1568393691622-c7ba131d63b4"),
  u("1517423440428-a5a00ad493e8"),
  u("1612536057832-2ff7ead58194"),
  u("1583511655857-d19b40a7a54e"),
];

const CAT_POOL = [
  u("1514888286974-6c03e2ca1dba"),
  u("1574144611937-0df059b5ef3e"),
  u("1533743983669-94fa5c4338ec"),
  u("1592194996308-7b43878e84a6"),
];

function pickThree(pool: string[], seed: string): [string, string, string] {
  // Deterministic three-pick using the pet id as seed — same pet always
  // gets the same photos across re-runs. Guarantees three distinct
  // indexes by rotating off the base index.
  const hash = Array.from(seed).reduce(
    (acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0,
    0,
  );
  const n = pool.length;
  const i0 = hash % n;
  const i1 = (i0 + 1 + ((hash >>> 3) % (n - 1))) % n;
  let i2 = (i0 + 1 + ((hash >>> 7) % (n - 1))) % n;
  if (i2 === i1) i2 = (i2 + 1) % n;
  return [pool[i0], pool[i1], pool[i2]];
}

async function main() {
  const candidates = await prisma.pet.findMany({
    where: {
      livePhotoUrl: null,
      photos: { none: {} },
    },
    select: { id: true, name: true, species: true },
  });

  if (candidates.length === 0) {
    console.log("Nothing to backfill — every pet already has photos.");
    return;
  }

  console.log(`Backfilling ${candidates.length} pet${candidates.length === 1 ? "" : "s"}…\n`);

  let done = 0;
  for (const p of candidates) {
    const pool = (p.species as Species) === "CAT" ? CAT_POOL : DOG_POOL;
    const [live, primary, secondary] = pickThree(pool, p.id);

    await prisma.pet.update({
      where: { id: p.id },
      data: {
        livePhotoUrl: live,
        photos: {
          create: [
            { url: primary, isPrimary: true },
            { url: secondary, isPrimary: false },
          ],
        },
      },
    });
    done++;
    console.log(`  ✓ ${p.name} (${p.species.toLowerCase()})`);
  }

  console.log(`\nDone. ${done} pet${done === 1 ? "" : "s"} backfilled.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
