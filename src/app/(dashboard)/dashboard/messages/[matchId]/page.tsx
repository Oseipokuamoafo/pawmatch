import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptMessage } from "@/lib/crypto";
import { ChatThread } from "@/components/messages/ChatThread";
import { calculateAge } from "@/lib/utils/age";

type Ctx = { params: Promise<{ matchId: string }> };

export default async function ThreadPage(ctx: Ctx) {
  const { matchId } = await ctx.params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/dashboard/messages/${matchId}`);
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
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!match) notFound();
  if (match.initiatedById !== userId && match.receivedById !== userId) {
    notFound();
  }
  if (match.status !== "ACCEPTED") {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <p className="eyebrow">Not yet</p>
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
        <Link href="/dashboard/matches" className="btn-primary mt-6 inline-flex">
          Back to matches
        </Link>
      </div>
    );
  }

  // Mark inbound as read (don't await — fire-and-forget)
  prisma.message
    .updateMany({
      where: {
        matchId: match.id,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true },
    })
    .catch(() => undefined);

  const incoming = match.initiatedById !== userId;
  const their = incoming ? match.petA : match.petB;
  const mine = incoming ? match.petB : match.petA;
  const heroUrl = their.photos[0]?.url ?? their.livePhotoUrl;

  const initial = match.messages.map((m) => ({
    id: m.id,
    senderId: m.senderId,
    isRead: m.isRead,
    createdAt: m.createdAt,
    content: safeDecrypt(m.encryptedContent, m.iv),
    isMine: m.senderId === userId,
  }));

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 md:py-12">
      <Link
        href="/dashboard/messages"
        className="inline-flex items-center gap-1.5 text-sm text-dark-muted hover:text-terracotta transition-colors"
      >
        <BackArrow className="w-3.5 h-3.5" />
        All conversations
      </Link>

      <header className="mt-6 mb-6 flex items-center gap-4">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-sand">
          {heroUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroUrl} alt={their.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl">
              {their.species === "DOG" ? "🐕" : "🐈"}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h1
            className="leading-none text-dark"
            style={{
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontWeight: 900,
              fontSize: "1.75rem",
            }}
          >
            {their.name}
          </h1>
          <p className="mt-1 text-sm text-dark-muted">
            {their.breed} · {calculateAge(their.dateOfBirth)}
            {their.owner?.name ? ` · ${their.owner.name}` : ""} · for{" "}
            <span className="font-semibold text-dark">{mine.name}</span>
          </p>
        </div>
        <Link
          href={`/dashboard/pets/${their.id}`}
          className="ml-auto hidden text-sm font-medium text-dark-muted hover:text-terracotta sm:inline-flex"
        >
          View profile →
        </Link>
      </header>

      <ChatThread
        matchId={match.id}
        initial={initial}
        myName={mine.name}
        theirName={their.name}
      />

      <p className="mt-4 text-center text-xs text-dark-muted">
        🔒 Messages are end-encrypted at rest (AES-256-GCM).
      </p>
    </div>
  );
}

function safeDecrypt(ct: string, iv: string): string {
  try {
    return decryptMessage(ct, iv);
  } catch {
    return "[unable to decrypt]";
  }
}

function BackArrow({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M19 12H5M11 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
