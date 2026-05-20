import Link from "next/link";

import { ScoreRing } from "@/components/browse/ScoreRing";
import type { Sex, Species } from "@/generated/prisma";

export interface TopMatch {
  matchId: string;
  status: "PENDING" | "ACCEPTED";
  score: number;
  flagged: boolean;
  incoming: boolean;
  yourPetName: string;
  candidate: {
    id: string;
    name: string;
    breed: string;
    species: Species;
    sex: Sex;
    photoUrl: string | null;
    livePhotoUrl: string | null;
    ownerName: string | null;
  };
}

const SPECIES_EMOJI = { DOG: "🐕", CAT: "🐈" } as const;

export function TopMatchesPanel({ matches }: { matches: TopMatch[] }) {
  return (
    <section className="card flex h-full flex-col p-0">
      <header className="flex items-center justify-between gap-4 border-b border-sand px-5 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta">
            Top matches
          </p>
          <h2
            className="mt-1 leading-tight text-dark"
            style={{
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontWeight: 900,
              fontSize: "1.25rem",
            }}
          >
            Who&apos;s a fit right now
          </h2>
        </div>
        <Link
          href="/dashboard/matches"
          className="text-xs font-semibold text-dark-muted hover:text-terracotta"
        >
          All →
        </Link>
      </header>

      {matches.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
          <p className="text-sm italic text-dark-muted">
            No matches yet — browse the feed to start.
          </p>
          <Link href="/dashboard/browse" className="btn-primary !px-4 !py-2 !text-sm">
            Browse candidates
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-sand">
          {matches.map((m) => (
            <li key={m.matchId}>
              <Link
                href={`/dashboard/matches?tab=${
                  m.status === "ACCEPTED"
                    ? "accepted"
                    : m.incoming
                      ? "incoming"
                      : "sent"
                }`}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-cream/60"
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-sand">
                  {m.candidate.photoUrl ?? m.candidate.livePhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={(m.candidate.photoUrl ?? m.candidate.livePhotoUrl) as string}
                      alt={m.candidate.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl">
                      {SPECIES_EMOJI[m.candidate.species]}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p
                    className="truncate leading-tight text-dark"
                    style={{
                      fontFamily: "var(--font-playfair, Georgia, serif)",
                      fontWeight: 700,
                      fontSize: "1rem",
                    }}
                  >
                    {m.candidate.name}
                  </p>
                  <p className="truncate text-xs text-dark-muted">
                    {m.candidate.breed} · {m.candidate.sex === "MALE" ? "♂" : "♀"}
                    {" · "}for{" "}
                    <span className="font-semibold text-dark">{m.yourPetName}</span>
                  </p>
                </div>

                <ScoreRing score={m.score} size={42} capped={m.flagged} />

                <StatusDot status={m.status} incoming={m.incoming} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function StatusDot({
  status,
  incoming,
}: {
  status: "PENDING" | "ACCEPTED";
  incoming: boolean;
}) {
  if (status === "ACCEPTED") {
    return (
      <span
        className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: "#1D9E75" }}
        title="Accepted"
      />
    );
  }
  return (
    <span
      className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ background: incoming ? "#C94B2A" : "#E8D5B7" }}
      title={incoming ? "Awaiting your response" : "Awaiting their response"}
    />
  );
}
