import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ChatView } from "@/components/messages/ChatView";

type Ctx = { params: Promise<{ matchId: string }> };

export default async function ChatPage(ctx: Ctx) {
  const { matchId } = await ctx.params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/messages/${matchId}`);
  }
  const userId = session.user.id;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
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
  });
  if (!match) notFound();
  if (match.initiatedById !== userId && match.receivedById !== userId) {
    notFound();
  }
  if (match.status !== "ACCEPTED") {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-terracotta">
          Not yet
        </p>
        <h1
          className="mt-3 leading-tight tracking-tight text-dark"
          style={{
            fontFamily: "var(--font-playfair, Georgia, serif)",
            fontWeight: 900,
            fontSize: "2.25rem",
          }}
        >
          Both sides need to accept first.
        </h1>
        <p className="mt-3 text-dark-muted">
          You can chat once the other owner accepts the match.
        </p>
        <Link href="/matches" className="btn-primary mt-6 inline-flex">
          Back to matches
        </Link>
      </div>
    );
  }

  const incoming = match.initiatedById !== userId;
  const their = incoming ? match.petA : match.petB;
  const mine = incoming ? match.petB : match.petA;

  return (
    <ChatView
      matchId={match.id}
      myUserId={userId}
      myPet={{ id: mine.id, name: mine.name }}
      theirPet={{
        id: their.id,
        name: their.name,
        breed: their.breed,
        species: their.species,
        sex: their.sex,
        dateOfBirth: their.dateOfBirth.toISOString(),
        livePhotoUrl: their.livePhotoUrl,
        photoUrl: their.photos[0]?.url ?? null,
        ownerName: their.owner?.name ?? null,
      }}
      matchScore={match.score}
      matchFlags={match.flags}
    />
  );
}
