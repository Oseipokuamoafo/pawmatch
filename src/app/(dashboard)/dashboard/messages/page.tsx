import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptMessage } from "@/lib/crypto";
import { calculateAge } from "@/lib/utils/age";
import type { Sex, Species } from "@/generated/prisma";

export default async function MessagesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard/messages");

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
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
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

  const threads = matches.map((m) => {
    const incoming = m.initiatedById !== userId;
    const their = incoming ? m.petA : m.petB;
    const mine = incoming ? m.petB : m.petA;
    const last = m.messages[0] ?? null;
    return {
      matchId: m.id,
      score: m.score,
      flagged: m.flags.length > 0,
      their,
      mine,
      unread: m._count.messages,
      lastPreview: last
        ? {
            text: safeDecrypt(last.encryptedContent, last.iv),
            mine: last.senderId === userId,
            createdAt: last.createdAt,
          }
        : null,
    };
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 md:py-16">
      <header className="mb-10">
        <p className="eyebrow">Conversations</p>
        <h1
          className="mt-3 leading-[1.05] tracking-tight text-balance text-dark"
          style={{
            fontFamily: "var(--font-playfair, Georgia, serif)",
            fontWeight: 900,
            fontSize: "clamp(2.5rem, 5vw, 3.5rem)",
          }}
        >
          Messages.
        </h1>
        <p className="mt-3 max-w-lg text-base text-dark-muted leading-relaxed">
          Encrypted chats with owners of accepted matches.
        </p>
      </header>

      {threads.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-3">
          {threads.map((t) => (
            <ThreadRow key={t.matchId} {...t} />
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─── Row ────────────────────────────────────────────────────────────── */

interface ThreadRowProps {
  matchId: string;
  score: number;
  flagged: boolean;
  their: {
    id: string;
    name: string;
    breed: string;
    species: Species;
    sex: Sex;
    dateOfBirth: Date;
    livePhotoUrl: string | null;
    photos: { url: string }[];
    owner: { id: string; name: string | null } | null;
  };
  mine: { id: string; name: string };
  unread: number;
  lastPreview:
    | { text: string; mine: boolean; createdAt: Date }
    | null;
}

function ThreadRow({
  matchId,
  their,
  mine,
  unread,
  lastPreview,
}: ThreadRowProps) {
  const heroUrl = their.photos[0]?.url ?? their.livePhotoUrl;
  return (
    <li>
      <Link
        href={`/dashboard/messages/${matchId}`}
        className="card card-hover flex items-center gap-4 p-4"
      >
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-sand">
          {heroUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroUrl} alt={their.name} className="card-image h-full w-full object-cover" />
          ) : (
            <div className="card-image flex h-full w-full items-center justify-center text-2xl">
              {their.species === "DOG" ? "🐕" : "🐈"}
            </div>
          )}
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-terracotta px-1.5 text-[10px] font-bold text-white">
              {unread}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p
              className="leading-tight text-dark"
              style={{
                fontFamily: "var(--font-playfair, Georgia, serif)",
                fontWeight: 900,
                fontSize: "1.125rem",
              }}
            >
              {their.name}
            </p>
            {lastPreview && (
              <span className="shrink-0 text-[11px] text-dark-muted">
                {formatRelative(lastPreview.createdAt)}
              </span>
            )}
          </div>

          <p className="text-xs text-dark-muted">
            {their.breed} · {calculateAge(their.dateOfBirth)}
            {their.owner?.name ? ` · ${their.owner.name}` : ""}
            {" · "}for <span className="font-semibold text-dark">{mine.name}</span>
          </p>

          {lastPreview ? (
            <p className="mt-1.5 truncate text-sm text-dark/85">
              {lastPreview.mine ? <span className="text-dark-muted">You: </span> : null}
              {lastPreview.text}
            </p>
          ) : (
            <p className="mt-1.5 truncate text-sm italic text-dark-muted">
              No messages yet — say hello.
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="card flex flex-col items-center py-16 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-sand text-2xl">
        ✉
      </div>
      <p
        className="text-xl font-bold text-dark"
        style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}
      >
        No conversations yet
      </p>
      <p className="mt-2 max-w-sm text-sm text-dark-muted leading-relaxed">
        Once you and another owner both accept a match, your encrypted chat opens here.
      </p>
      <Link href="/dashboard/matches" className="btn-primary mt-6">
        See my matches
      </Link>
    </div>
  );
}

function formatRelative(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const diffMin = (Date.now() - date.getTime()) / 60_000;
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${Math.floor(diffMin)}m`;
  if (diffMin < 60 * 24) return `${Math.floor(diffMin / 60)}h`;
  if (diffMin < 60 * 24 * 7)
    return `${Math.floor(diffMin / (60 * 24))}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function safeDecrypt(ct: string, iv: string): string {
  try {
    return decryptMessage(ct, iv);
  } catch {
    return "[encrypted]";
  }
}
