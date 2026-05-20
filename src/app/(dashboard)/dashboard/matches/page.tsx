import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateAge } from "@/lib/utils/age";
import { ScoreRing } from "@/components/browse/ScoreRing";
import { MatchActions } from "@/components/matches/MatchActions";
import type { MatchStatus, Sex, Species } from "@/generated/prisma";

type SearchParams = Promise<{ tab?: string }>;

const TABS: { key: string; label: string }[] = [
  { key: "incoming", label: "Incoming" },
  { key: "sent", label: "Sent" },
  { key: "accepted", label: "Accepted" },
  { key: "rejected", label: "Past" },
];

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard/matches");

  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.tab)?.key ?? "incoming";

  const userId = session.user.id;
  const all = await prisma.match.findMany({
    where: {
      OR: [
        { initiatedById: userId },
        { petB: { ownerId: userId } },
      ],
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
  });

  const buckets = {
    incoming: all.filter(
      (m) => m.status === "PENDING" && m.initiatedById !== userId
    ),
    sent: all.filter(
      (m) => m.status === "PENDING" && m.initiatedById === userId
    ),
    accepted: all.filter((m) => m.status === "ACCEPTED"),
    rejected: all.filter(
      (m) => m.status === "REJECTED" || m.status === "EXPIRED"
    ),
  };

  const visible = buckets[tab as keyof typeof buckets];

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 md:py-16">
      <header className="mb-10">
        <p className="eyebrow">Match requests</p>
        <h1
          className="mt-3 leading-[1.05] tracking-tight text-balance text-dark"
          style={{
            fontFamily: "var(--font-playfair, Georgia, serif)",
            fontWeight: 900,
            fontSize: "clamp(2.5rem, 5vw, 3.5rem)",
          }}
        >
          My matches.
        </h1>
        <p className="mt-3 max-w-lg text-base text-dark-muted leading-relaxed">
          Every request — what you've sent, what you've received, and what's
          been agreed.
        </p>
      </header>

      {/* Tabs */}
      <div
        className="mb-8 flex flex-wrap items-center gap-1 rounded-full border border-sand p-1"
        role="tablist"
      >
        {TABS.map((t) => {
          const active = t.key === tab;
          const count =
            buckets[t.key as keyof typeof buckets]?.length ?? 0;
          return (
            <Link
              key={t.key}
              href={`/dashboard/matches?tab=${t.key}`}
              role="tab"
              aria-selected={active}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                active
                  ? "bg-terracotta text-white shadow"
                  : "text-dark-muted hover:text-terracotta"
              }`}
            >
              {t.label}
              <span
                className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                  active
                    ? "bg-white/20 text-white"
                    : "bg-sand text-dark-muted"
                }`}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <EmptyTab tab={tab} />
      ) : (
        <ul className="space-y-3">
          {visible.map((m) => {
            const incoming = m.initiatedById !== userId;
            // For an incoming match, "their" pet is petA (initiator); "mine" is petB.
            // For a sent match, "their" pet is petB.
            const their = incoming ? m.petA : m.petB;
            const mine = incoming ? m.petB : m.petA;
            return (
              <MatchRow
                key={m.id}
                matchId={m.id}
                status={m.status}
                score={m.score}
                flags={m.flags}
                incoming={incoming}
                their={their}
                mine={mine}
                createdAt={m.createdAt}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ─── Row ────────────────────────────────────────────────────────────── */

function MatchRow({
  matchId,
  status,
  score,
  flags,
  incoming,
  their,
  mine,
  createdAt,
}: {
  matchId: string;
  status: MatchStatus;
  score: number;
  flags: string[];
  incoming: boolean;
  their: {
    id: string;
    name: string;
    breed: string;
    species: Species;
    sex: Sex;
    dateOfBirth: Date;
    livePhotoUrl: string | null;
    photos: { url: string }[];
    owner: { name: string | null } | null;
  };
  mine: {
    id: string;
    name: string;
  };
  createdAt: Date;
}) {
  const heroUrl = their.photos[0]?.url ?? their.livePhotoUrl;
  const dateLabel = new Date(createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const isPending = status === "PENDING";

  return (
    <li className="card flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-sand">
          {heroUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroUrl} alt={their.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl">
              {their.species === "DOG" ? "🐕" : "🐈"}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <p
            className="leading-tight text-dark"
            style={{ fontFamily: "var(--font-playfair, Georgia, serif)", fontWeight: 900, fontSize: "1.25rem" }}
          >
            {their.name}
          </p>
          <p className="text-sm text-dark-muted">
            {their.breed} · {calculateAge(their.dateOfBirth)} · {their.sex === "MALE" ? "♂" : "♀"}
          </p>
          <p className="mt-0.5 text-xs text-dark-muted">
            {incoming ? "Requested" : "You requested"} {dateLabel}
            {their.owner?.name ? ` · from ${their.owner.name}` : ""}
            {" · "}for <span className="font-semibold text-dark">{mine.name}</span>
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-between gap-4 sm:justify-end">
        <ScoreRing score={score} size={56} capped={flags.length > 0} />
        <StatusBadge status={status} flagged={flags.length > 0} />

        {isPending && incoming && <MatchActions matchId={matchId} />}
        {!isPending && (
          <Link
            href={`/dashboard/pets/${their.id}`}
            className="hidden sm:inline-flex text-sm font-medium text-dark-muted hover:text-terracotta"
          >
            View profile →
          </Link>
        )}
      </div>
    </li>
  );
}

function StatusBadge({ status, flagged }: { status: MatchStatus; flagged: boolean }) {
  const styles: Record<MatchStatus, { bg: string; color: string; label: string }> = {
    PENDING: { bg: "rgba(232,213,183,0.5)", color: "#3D2A1A", label: "Pending" },
    ACCEPTED: { bg: "rgba(29,158,117,0.15)", color: "#1D9E75", label: "Accepted" },
    REJECTED: { bg: "rgba(28,16,8,0.08)", color: "#3D2A1A", label: "Declined" },
    EXPIRED: { bg: "rgba(28,16,8,0.08)", color: "#3D2A1A", label: "Expired" },
  };
  const s = styles[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
      {flagged && status === "PENDING" && (
        <span className="text-[10px] font-bold text-terracotta">⚠</span>
      )}
    </span>
  );
}

function EmptyTab({ tab }: { tab: string }) {
  const copy: Record<string, { title: string; body: string }> = {
    incoming: {
      title: "No incoming requests yet",
      body: "When other owners reach out about your pets, they'll appear here.",
    },
    sent: {
      title: "No requests sent yet",
      body: "Browse the feed to find a compatible pet, then send a match request.",
    },
    accepted: {
      title: "No accepted matches yet",
      body: "Once both sides accept, the match shows up here with next-step actions.",
    },
    rejected: {
      title: "Nothing in the past pile",
      body: "Declined or expired matches will live here.",
    },
  };
  const c = copy[tab] ?? copy.incoming;

  return (
    <div className="card flex flex-col items-center py-16 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-sand text-2xl">
        ✉
      </div>
      <p
        className="text-xl font-bold text-dark"
        style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}
      >
        {c.title}
      </p>
      <p className="mt-2 max-w-sm text-sm text-dark-muted leading-relaxed">{c.body}</p>
      <Link href="/dashboard/browse" className="btn-primary mt-6">
        Browse candidates
      </Link>
    </div>
  );
}
