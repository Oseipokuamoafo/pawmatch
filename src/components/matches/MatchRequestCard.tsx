"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { calculateAge } from "@/lib/utils/age";
import { useToast } from "@/components/toast/ToastProvider";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import type { MatchStatus, Sex, Species } from "@/generated/prisma";

export interface MatchRow {
  id: string;
  score: number;
  status: MatchStatus;
  flags: string[];
  breakdown: {
    traits: number;
    health: number;
    diversity: number;
    proximity: number;
    preferences: number;
  } | null;
  createdAt: string;
  /** The pet on the OTHER side from the current viewer */
  otherPet: {
    id: string;
    name: string;
    breed: string;
    species: Species;
    sex: Sex;
    dateOfBirth: string;
    livePhotoUrl: string | null;
    photoUrl: string | null;
    ownerName: string | null;
    ownerVerified: boolean;
  };
  /** The viewer's own pet on the OTHER side of this match */
  myPet: { id: string; name: string };
}

interface MatchRequestCardProps {
  match: MatchRow;
  /** "received" → show Accept/Reject. "sent" → show status badge. */
  side: "received" | "sent";
}

const SPECIES_EMOJI = { DOG: "🐕", CAT: "🐈" } as const;

export function MatchRequestCard({ match, side }: MatchRequestCardProps) {
  const router = useRouter();
  const toast = useToast();
  const [working, setWorking] = useState<"accept" | "reject" | null>(null);
  const [open, setOpen] = useState(false);

  const heroUrl = match.otherPet.photoUrl ?? match.otherPet.livePhotoUrl;
  const score = match.score;
  const tone = scoreTone(score);

  async function decide(action: "accept" | "reject") {
    setWorking(action);
    const res = await fetch(`/api/matches/${match.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setWorking(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error("Couldn't update", data.error ?? undefined);
      return;
    }
    if (action === "accept") {
      toast.success(
        "Match accepted",
        "You can now chat with the other owner."
      );
    } else {
      toast.info("Match declined");
    }
    router.refresh();
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-sand bg-surface">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:p-6">
        {/* Hero photo */}
        <Link
          href={`/dashboard/pets/${match.otherPet.id}`}
          className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-sand"
        >
          {heroUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroUrl}
              alt={match.otherPet.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl">
              {SPECIES_EMOJI[match.otherPet.species]}
            </div>
          )}
          {match.otherPet.ownerVerified && (
            <span className="absolute bottom-1.5 left-1.5">
              <VerificationBadge size="sm" showLabel={false} />
            </span>
          )}
        </Link>

        {/* Body */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <Link
              href={`/dashboard/pets/${match.otherPet.id}`}
              className="leading-tight text-dark hover:text-terracotta"
              style={{
                fontFamily: "var(--font-playfair, Georgia, serif)",
                fontWeight: 900,
                fontSize: "1.5rem",
              }}
            >
              {match.otherPet.name}
            </Link>
            <StatusBadge status={match.status} side={side} />
          </div>
          <p className="mt-1 text-sm text-dark-muted">
            {match.otherPet.breed} · {calculateAge(match.otherPet.dateOfBirth)} ·{" "}
            {match.otherPet.sex === "MALE" ? "♂ M" : "♀ F"}
            {match.otherPet.ownerName ? ` · ${match.otherPet.ownerName}` : ""}
            {" · for "}
            <span className="font-semibold text-dark">{match.myPet.name}</span>
          </p>

          {/* Flags */}
          {match.flags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {match.flags.map((f) => (
                <span
                  key={f}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider"
                  style={{
                    background: "rgba(232,154,42,0.15)",
                    color: "#B0731A",
                  }}
                  title="Auto-flag from the scoring engine"
                >
                  <span aria-hidden>!</span>
                  {f.replace(/_/g, " ").toLowerCase()}
                </span>
              ))}
            </div>
          )}

          <p className="mt-3 text-[11px] text-dark-muted">
            {side === "received" ? "Received" : "Sent"}{" "}
            {new Date(match.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>

        {/* Score pill + actions column */}
        <div className="flex shrink-0 flex-col items-end gap-3">
          <div
            className="inline-flex h-16 w-16 items-center justify-center rounded-full font-black"
            style={{
              background: tone.bg,
              color: tone.fg,
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontSize: "1.5rem",
            }}
            title={`${score}/100 compatibility`}
          >
            {score}
          </div>

          {side === "received" && match.status === "PENDING" && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => decide("accept")}
                disabled={working !== null}
                className="btn-primary !px-4 !py-2 !text-sm"
              >
                {working === "accept" ? "Accepting…" : "Accept"}
              </button>
              <button
                type="button"
                onClick={() => decide("reject")}
                disabled={working !== null}
                className="rounded-full border border-sand bg-transparent px-4 py-2 text-sm font-medium text-dark-muted transition-colors hover:border-terracotta/40 hover:text-terracotta"
              >
                {working === "reject" ? "…" : "Reject"}
              </button>
            </div>
          )}

          {match.status === "ACCEPTED" && (
            <Link
              href={`/dashboard/messages/${match.id}`}
              className="btn-primary !px-4 !py-2 !text-sm"
            >
              Message
            </Link>
          )}
        </div>
      </div>

      {/* Breakdown accordion */}
      <div className="border-t border-sand">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-dark-muted transition-colors hover:text-terracotta"
        >
          <span>Score breakdown</span>
          <Chevron open={open} />
        </button>
        {open && match.breakdown && (
          <div className="px-6 pb-5">
            <BreakdownBars b={match.breakdown} />
          </div>
        )}
        {open && !match.breakdown && (
          <p className="px-6 pb-5 text-xs italic text-dark-muted">
            Breakdown unavailable for this match (legacy record).
          </p>
        )}
      </div>
    </article>
  );
}

/* ─── Breakdown bar chart ────────────────────────────────────────────── */

function BreakdownBars({ b }: { b: MatchRow["breakdown"] }) {
  if (!b) return null;
  const rows: { label: string; value: number; max: number; color: string }[] = [
    { label: "Traits",      value: b.traits,      max: 35, color: "#C94B2A" },
    { label: "Health",      value: b.health,      max: 30, color: "#1D9E75" },
    { label: "Diversity",   value: b.diversity,   max: 20, color: "#3679D2" },
    { label: "Proximity",   value: b.proximity,   max: 10, color: "#B0731A" },
    { label: "Preferences", value: b.preferences, max: 5,  color: "#7A4FB8" },
  ];

  return (
    <ul className="space-y-2.5">
      {rows.map((r) => {
        const pct = Math.max(0, Math.min(100, (r.value / r.max) * 100));
        return (
          <li key={r.label} className="flex items-center gap-3 text-xs">
            <span className="w-20 shrink-0 text-dark-muted">{r.label}</span>
            <div
              className="h-2 flex-1 overflow-hidden rounded-full"
              style={{ background: "rgba(232,213,183,0.6)" }}
              role="progressbar"
              aria-valuenow={r.value}
              aria-valuemin={0}
              aria-valuemax={r.max}
            >
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${pct}%`, background: r.color }}
              />
            </div>
            <span className="w-14 shrink-0 text-right font-semibold text-dark">
              {Math.round(r.value)} / {r.max}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────── */

function StatusBadge({
  status,
  side,
}: {
  status: MatchStatus;
  side: "received" | "sent";
}) {
  const map: Record<MatchStatus, { bg: string; color: string; label: string }> = {
    PENDING: {
      bg: "rgba(232,154,42,0.15)",
      color: "#B0731A",
      label: side === "received" ? "Pending your reply" : "Awaiting their reply",
    },
    ACCEPTED: { bg: "rgba(29,158,117,0.15)", color: "#1D9E75", label: "Accepted" },
    REJECTED: { bg: "rgba(201,75,42,0.12)", color: "#C94B2A", label: "Declined" },
    EXPIRED: { bg: "rgba(28,16,8,0.08)", color: "#3D2A1A", label: "Expired" },
  };
  const s = map[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      width="12"
      height="12"
      fill="none"
      className="transition-transform duration-200"
      style={{ transform: open ? "rotate(180deg)" : "none" }}
      aria-hidden="true"
    >
      <path
        d="M3 4.5 6 7.5 9 4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function scoreTone(score: number) {
  if (score >= 80) return { bg: "rgba(29,158,117,0.95)", fg: "#fff" };
  if (score >= 60) return { bg: "rgba(232,154,42,0.95)", fg: "#fff" };
  return { bg: "rgba(201,75,42,0.95)", fg: "#fff" };
}
