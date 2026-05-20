import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptMessage } from "@/lib/crypto";
import {
  MessagesList,
  type ThreadRow,
} from "@/components/messages/MessagesList";

export default async function MessagesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/messages");
  const userId = session.user.id;

  const matches = await prisma.match.findMany({
    where: {
      status: "ACCEPTED",
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
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: {
        select: {
          messages: {
            where: { isRead: false, senderId: { not: userId } },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const threads: ThreadRow[] = matches.map((m) => {
    const incoming = m.initiatedById !== userId;
    const their = incoming ? m.petA : m.petB;
    const mine = incoming ? m.petB : m.petA;
    const last = m.messages[0] ?? null;
    return {
      matchId: m.id,
      score: m.score,
      flagged: m.flags.length > 0,
      their: {
        id: their.id,
        name: their.name,
        breed: their.breed,
        species: their.species,
        sex: their.sex,
        dateOfBirth: their.dateOfBirth.toISOString(),
        livePhotoUrl: their.livePhotoUrl,
        photoUrl: their.photos[0]?.url ?? null,
        ownerName: their.owner?.name ?? null,
      },
      mine: { id: mine.id, name: mine.name },
      unread: m._count.messages,
      lastPreview: last
        ? {
            text: safeDecrypt(last.encryptedContent, last.iv),
            mine: last.senderId === userId,
            createdAt: last.createdAt.toISOString(),
          }
        : null,
    };
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 md:py-14">
      <header className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-terracotta">
          Conversations
        </p>
        <h1
          className="mt-3 leading-[1.05] tracking-tight text-balance text-dark"
          style={{
            fontFamily: "var(--font-playfair, Georgia, serif)",
            fontWeight: 900,
            fontSize: "clamp(2.25rem, 5vw, 3.25rem)",
          }}
        >
          Messages.
        </h1>
        <p className="mt-3 max-w-lg text-base text-dark-muted leading-relaxed">
          Encrypted, real-time chats with owners of accepted matches.
        </p>
      </header>

      <MessagesList threads={threads} />
    </div>
  );
}

function safeDecrypt(ct: string, iv: string): string {
  try {
    return decryptMessage(ct, iv);
  } catch {
    return "[encrypted]";
  }
}
