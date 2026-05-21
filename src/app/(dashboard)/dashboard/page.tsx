import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptMessage } from "@/lib/crypto";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import {
  bestMatchScoresByPet,
  computeStats,
  toDashboardPets,
  type ActivityEvent,
  type PetWithExtras,
} from "@/lib/dashboard-stats";
import type { TopMatch } from "@/components/dashboard/TopMatchesPanel";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard");

  const userId = session.user.id;
  const isBreeder = session.user.role === "BREEDER";
  const isVerified = Boolean(session.user.isVerified);

  // Parallel fetches — pets, matches with relations, recent health records,
  // recent messages across all accepted matches, and (for breeders) the
  // latest verification request.
  const [pets, matches, recentHealth, recentMessages, verifyReq] = await Promise.all([
    prisma.pet.findMany({
      where: { ownerId: userId },
      include: {
        photos: { orderBy: { isPrimary: "desc" } },
        healthRecords: true,
        breedingGoals: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.match.findMany({
      where: {
        OR: [{ initiatedById: userId }, { receivedById: userId }],
      },
      include: {
        petA: {
          include: {
            photos: { orderBy: { isPrimary: "desc" }, take: 1 },
            owner: { select: { id: true, name: true } },
          },
        },
        petB: {
          include: {
            photos: { orderBy: { isPrimary: "desc" }, take: 1 },
            owner: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.petHealth.findMany({
      where: { pet: { ownerId: userId } },
      include: { pet: { select: { name: true } } },
      orderBy: { recordDate: "desc" },
      take: 5,
    }),
    prisma.message.findMany({
      where: {
        match: {
          status: "ACCEPTED",
          OR: [{ initiatedById: userId }, { receivedById: userId }],
        },
      },
      include: {
        match: {
          select: {
            id: true,
            initiatedById: true,
            receivedById: true,
            petA: { select: { name: true, ownerId: true } },
            petB: { select: { name: true, ownerId: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    isBreeder
      ? prisma.verificationRequest.findUnique({
          where: { userId },
          select: { status: true },
        })
      : Promise.resolve(null),
  ]);

  // Show the CTA card whenever the user is an unverified breeder.
  const verifyCTA =
    isBreeder && !isVerified
      ? { status: verifyReq?.status ?? null }
      : null;

  const bestMatch = bestMatchScoresByPet(matches);
  const dashboardPets = toDashboardPets(pets as PetWithExtras[], bestMatch);
  const stats = computeStats(pets as PetWithExtras[], matches, userId);

  /* ─── Top matches: highest score, ACCEPTED first, then PENDING ────── */
  const topMatches: TopMatch[] = matches
    .filter((m) => m.status === "ACCEPTED" || m.status === "PENDING")
    .map((m) => {
      const incoming = m.initiatedById !== userId;
      const myPet = incoming ? m.petB : m.petA;
      const candidate = incoming ? m.petA : m.petB;
      return {
        matchId: m.id,
        status: m.status as "PENDING" | "ACCEPTED",
        score: m.score,
        flagged: m.flags.length > 0,
        incoming,
        yourPetName: myPet.name,
        candidate: {
          id: candidate.id,
          name: candidate.name,
          breed: candidate.breed,
          species: candidate.species,
          sex: candidate.sex,
          photoUrl: candidate.photos[0]?.url ?? null,
          livePhotoUrl: candidate.livePhotoUrl,
          ownerName: candidate.owner?.name ?? null,
        },
      };
    })
    .sort((a, b) => {
      // Accepted floats above pending; then by score desc
      if (a.status !== b.status) return a.status === "ACCEPTED" ? -1 : 1;
      return b.score - a.score;
    })
    .slice(0, 5);

  /* ─── Activity stream — combine matches + recent pets + health ─── */
  const activity: ActivityEvent[] = [];

  for (const m of matches.slice(0, 8)) {
    const incoming = m.initiatedById !== userId;
    const mine = incoming ? m.petB.name : m.petA.name;
    const theirs = incoming ? m.petA.name : m.petB.name;
    if (m.status === "ACCEPTED") {
      activity.push({
        kind: "match.accepted",
        at: m.updatedAt,
        petName: mine,
        counterpartName: theirs,
      });
    } else if (m.status === "REJECTED") {
      activity.push({
        kind: "match.rejected",
        at: m.updatedAt,
        petName: mine,
        counterpartName: theirs,
      });
    }
    activity.push({
      kind: "match.created",
      at: m.createdAt,
      petName: mine,
      counterpartName: theirs,
      youAreInitiator: !incoming,
    });
  }

  for (const p of pets.slice(0, 5)) {
    activity.push({ kind: "pet.added", at: p.createdAt, petName: p.name });
  }

  for (const h of recentHealth) {
    activity.push({
      kind: "health.added",
      at: h.recordDate,
      petName: h.pet.name,
      title: h.title,
    });
  }

  /* ─── Messages ──────────────────────────────────────────────────── */
  for (const m of recentMessages) {
    const fromMe = m.senderId === userId;
    // The user's pet is whichever side they own; counterpart is the other.
    const userOwnsPetA = m.match.petA.ownerId === userId;
    const myPetName = userOwnsPetA ? m.match.petA.name : m.match.petB.name;
    const theirPetName = userOwnsPetA ? m.match.petB.name : m.match.petA.name;

    let plain: string;
    try {
      plain = decryptMessage(m.encryptedContent, m.iv);
    } catch {
      // Skip messages we can't decrypt rather than tripping the page.
      continue;
    }
    const preview = truncatePreview(plain);
    const isFlagged = plain.startsWith("[FLAGGED]");

    if (isFlagged) {
      activity.push({
        kind: "message.flagged",
        at: m.createdAt,
        petName: myPetName,
        counterpartName: theirPetName,
        preview: preview.replace(/^\[FLAGGED\]\s*/i, ""),
        matchId: m.match.id,
      });
    } else {
      activity.push({
        kind: "message.received",
        at: m.createdAt,
        petName: myPetName,
        counterpartName: theirPetName,
        preview,
        matchId: m.match.id,
        fromMe,
      });
    }
  }

  activity.sort((a, b) => b.at.getTime() - a.at.getTime());
  const recentActivity = activity.slice(0, 10);

  const firstName =
    session.user.name?.split(/\s+/)[0] ??
    session.user.email?.split("@")[0] ??
    "friend";

  return (
    <DashboardClient
      firstName={firstName}
      pets={dashboardPets}
      stats={stats}
      topMatches={topMatches}
      activity={recentActivity}
      verifyCTA={verifyCTA}
    />
  );
}

/** Trim a message preview to ~80 chars, collapsing whitespace + adding ellipsis. */
function truncatePreview(s: string): string {
  const clean = s.replace(/\s+/g, " ").trim();
  if (clean.length <= 80) return clean;
  return clean.slice(0, 77).trimEnd() + "…";
}
