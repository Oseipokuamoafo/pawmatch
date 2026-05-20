"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { calculateAge } from "@/lib/utils/age";
import type { Sex, Species } from "@/generated/prisma";

export interface ThreadRow {
  matchId: string;
  score: number;
  flagged: boolean;
  their: {
    id: string;
    name: string;
    breed: string;
    species: Species;
    sex: Sex;
    dateOfBirth: string;
    livePhotoUrl: string | null;
    photoUrl: string | null;
    ownerName: string | null;
  };
  mine: { id: string; name: string };
  unread: number;
  lastPreview: { text: string; mine: boolean; createdAt: string } | null;
}

const SPECIES_EMOJI: Record<Species, string> = { DOG: "🐕", CAT: "🐈" };

export function MessagesList({ threads }: { threads: ThreadRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => {
      const hay = [
        t.their.name,
        t.their.breed,
        t.their.ownerName ?? "",
        t.mine.name,
        t.lastPreview?.text ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [query, threads]);

  return (
    <div>
      <div className="mb-6">
        <label className="relative block">
          <span className="sr-only">Search conversations</span>
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations…"
            className="w-full rounded-full border border-sand bg-cream py-2.5 pl-11 pr-4 text-sm text-dark outline-none transition-[border-color] duration-150 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15"
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        threads.length === 0 ? (
          <EmptyState />
        ) : (
          <p className="card text-center text-sm italic text-dark-muted">
            No matches for &ldquo;{query}&rdquo;.
          </p>
        )
      ) : (
        <ul className="space-y-3">
          {filtered.map((t) => (
            <ThreadRow key={t.matchId} {...t} />
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─── Row ────────────────────────────────────────────────────────────── */

function ThreadRow({
  matchId,
  their,
  mine,
  unread,
  lastPreview,
}: ThreadRow) {
  const heroUrl = their.photoUrl ?? their.livePhotoUrl;
  return (
    <li>
      <Link
        href={`/messages/${matchId}`}
        className="card card-hover flex items-center gap-4 p-4"
      >
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-sand">
          {heroUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroUrl} alt={their.name} className="card-image h-full w-full object-cover" />
          ) : (
            <div className="card-image flex h-full w-full items-center justify-center text-2xl">
              {SPECIES_EMOJI[their.species]}
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
            {their.ownerName ? ` · ${their.ownerName}` : ""}
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
      <Link href="/matches" className="btn-primary mt-6">
        See my matches
      </Link>
    </div>
  );
}

function formatRelative(d: string): string {
  const date = new Date(d);
  const diffMin = (Date.now() - date.getTime()) / 60_000;
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${Math.floor(diffMin)}m`;
  if (diffMin < 60 * 24) return `${Math.floor(diffMin / 60)}h`;
  if (diffMin < 60 * 24 * 7) return `${Math.floor(diffMin / (60 * 24))}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
