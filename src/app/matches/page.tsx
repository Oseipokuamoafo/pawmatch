import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  MatchRequestCard,
  type MatchRow,
} from "@/components/matches/MatchRequestCard";

type SearchParams = Promise<{ tab?: string }>;

const TABS = [
  { key: "received", label: "Requests received" },
  { key: "sent", label: "Sent requests" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/matches");

  const sp = await searchParams;
  const tab: TabKey = sp.tab === "sent" ? "sent" : "received";
  const userId = session.user.id;

  const all = await prisma.match.findMany({
    where: {
      OR: [{ initiatedById: userId }, { receivedById: userId }],
    },
    include: {
      petA: {
        include: {
          photos: { orderBy: { isPrimary: "desc" }, take: 1 },
          owner: {
            select: { id: true, name: true, verificationBadge: true },
          },
        },
      },
      petB: {
        include: {
          photos: { orderBy: { isPrimary: "desc" }, take: 1 },
          owner: {
            select: { id: true, name: true, verificationBadge: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Split into received vs sent (matches I initiated).
  const received: MatchRow[] = [];
  const sent: MatchRow[] = [];
  for (const m of all) {
    const isIncoming = m.initiatedById !== userId;
    const otherPet = isIncoming ? m.petA : m.petB;
    const myPet = isIncoming ? m.petB : m.petA;
    const row: MatchRow = {
      id: m.id,
      score: m.score,
      status: m.status,
      flags: m.flags,
      breakdown: (m.breakdown as MatchRow["breakdown"]) ?? null,
      createdAt: m.createdAt.toISOString(),
      otherPet: {
        id: otherPet.id,
        name: otherPet.name,
        breed: otherPet.breed,
        species: otherPet.species,
        sex: otherPet.sex,
        dateOfBirth: otherPet.dateOfBirth.toISOString(),
        livePhotoUrl: otherPet.livePhotoUrl,
        photoUrl: otherPet.photos[0]?.url ?? null,
        ownerName: otherPet.owner?.name ?? null,
        ownerVerified: Boolean(otherPet.owner?.verificationBadge),
      },
      myPet: { id: myPet.id, name: myPet.name },
    };
    if (isIncoming) received.push(row);
    else sent.push(row);
  }

  const visible = tab === "received" ? received : sent;
  const pendingReceived = received.filter((r) => r.status === "PENDING").length;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 md:py-14">
      <header className="mb-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-terracotta">
          Match requests
        </p>
        <h1
          className="mt-3 leading-[1.05] tracking-tight text-balance text-dark"
          style={{
            fontFamily: "var(--font-playfair, Georgia, serif)",
            fontWeight: 900,
            fontSize: "clamp(2.25rem, 5vw, 3.25rem)",
          }}
        >
          My matches.
        </h1>
        <p className="mt-3 max-w-lg text-base text-dark-muted leading-relaxed">
          Review incoming requests, track what you&apos;ve sent, and message
          accepted matches.
        </p>
      </header>

      {/* Tabs */}
      <div className="mb-8 inline-flex items-center gap-1 rounded-full border border-sand p-1">
        {TABS.map((t) => {
          const active = t.key === tab;
          const count =
            t.key === "received"
              ? pendingReceived
              : sent.filter((s) => s.status === "PENDING").length;
          return (
            <Link
              key={t.key}
              href={`/matches?tab=${t.key}`}
              role="tab"
              aria-selected={active}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                active
                  ? "bg-terracotta text-white shadow"
                  : "text-dark-muted hover:text-terracotta"
              }`}
            >
              {t.label}
              {count > 0 && (
                <span
                  className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
                  style={
                    active
                      ? { background: "rgba(255,255,255,0.25)", color: "#fff" }
                      : { background: "rgba(201,75,42,0.18)", color: "#C94B2A" }
                  }
                >
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <EmptyTab tab={tab} />
      ) : (
        <ul className="space-y-4">
          {visible.map((m) => (
            <li key={m.id}>
              <MatchRequestCard match={m} side={tab} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyTab({ tab }: { tab: TabKey }) {
  const copy =
    tab === "received"
      ? {
          title: "No requests yet",
          body: "When another owner sends a match request for one of your pets, it'll land here.",
          cta: { href: "/browse", label: "Find candidates" },
        }
      : {
          title: "Nothing sent yet",
          body: "Browse candidates and send a match request to start the conversation.",
          cta: { href: "/browse", label: "Browse" },
        };
  return (
    <div className="card flex flex-col items-center py-14 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-sand text-2xl">
        ✉
      </div>
      <p
        className="text-xl font-bold text-dark"
        style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}
      >
        {copy.title}
      </p>
      <p className="mt-2 max-w-sm text-sm text-dark-muted leading-relaxed">
        {copy.body}
      </p>
      <Link href={copy.cta.href} className="btn-primary mt-6">
        {copy.cta.label}
      </Link>
    </div>
  );
}
