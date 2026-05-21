"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";

import { useToast } from "@/components/toast/ToastProvider";
import type { HealthRecordType, Species } from "@/generated/prisma";

export interface InboxRow {
  id: string;
  type: HealthRecordType;
  title: string;
  notes: string | null;
  fileUrl: string | null;
  recordDate: string;
  requestedAt: string | null;
  pet: {
    id: string;
    name: string;
    breed: string;
    species: Species;
    owner: { id: string; name: string | null; email: string };
  };
}

export interface RecentSign {
  id: string;
  type: HealthRecordType;
  title: string;
  verifiedAt: string | null;
  pet: { id: string; name: string; breed: string; species: Species };
}

const TYPE_LABEL: Record<HealthRecordType, string> = {
  VACCINE: "Vaccine",
  DNA: "DNA",
  VET_VISIT: "Vet visit",
  CERTIFICATE: "Certificate",
};

export function VetInbox({
  pending,
  recentlySigned,
}: {
  pending: InboxRow[];
  recentlySigned: RecentSign[];
}) {
  return (
    <div className="space-y-12">
      <section>
        <SectionHeader
          title="Awaiting your signature"
          count={pending.length}
          subtitle="Review the record, then sign or decline with a note."
        />
        {pending.length === 0 ? (
          <EmptyCard
            title="Inbox is clear."
            copy="Owners haven't requested your signature on any new records yet. As soon as someone does, it'll show up here."
          />
        ) : (
          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {pending.map((row) => (
                <motion.li
                  key={row.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -12, transition: { duration: 0.18 } }}
                  transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                >
                  <PendingCard row={row} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </section>

      <section>
        <SectionHeader
          title="Recently signed"
          count={recentlySigned.length}
          subtitle="Your last few co-signatures. Owners always see who verified the record."
        />
        {recentlySigned.length === 0 ? (
          <EmptyCard
            title="No signatures yet."
            copy="Records you sign show up here so you can quickly find them again."
          />
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {recentlySigned.map((row) => (
              <RecentCard key={row.id} row={row} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ─── Pending card with sign / decline ───────────────────────────────── */

function PendingCard({ row }: { row: InboxRow }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showDecline, setShowDecline] = useState(false);
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: async (action: "sign" | "decline") => {
      const r = await fetch(`/api/health/${row.id}/cosign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          notes: action === "decline" ? notes.trim() || null : undefined,
        }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data.error ?? "Action failed");
      }
      return action;
    },
    onSuccess: (action) => {
      queryClient.invalidateQueries({ queryKey: ["vet", "inbox"] });
      toast.success(
        action === "sign"
          ? `Signed — ${row.pet.name}'s record is now verified.`
          : `Declined — owner will see your note.`,
      );
      window.location.reload();
    },
    onError: (err: Error) => toast.error("Couldn't complete action", err.message),
  });

  const dateLabel = new Date(row.recordDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <article className="rounded-3xl border border-sand bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p
            className="leading-tight text-dark"
            style={{
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontWeight: 800,
              fontSize: "1.25rem",
            }}
          >
            {row.title}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-dark-muted">
            <span className="rounded-full bg-sand px-2 py-0.5 font-semibold uppercase tracking-wider">
              {TYPE_LABEL[row.type]}
            </span>
            <span>{dateLabel}</span>
            {row.requestedAt && (
              <span className="text-[11px]">
                · requested {relativeTime(row.requestedAt)}
              </span>
            )}
          </div>
        </div>
        <span className="inline-flex items-center rounded-full bg-[#E89A2A]/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#B0731A] dark:text-[#E89A2A]">
          Pending sign
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <Field label="Pet">
          <Link
            href={`/dashboard/pets/${row.pet.id}/health`}
            className="font-medium text-dark hover:text-terracotta"
          >
            {row.pet.name}
          </Link>{" "}
          <span className="text-dark-muted">· {row.pet.breed}</span>
        </Field>
        <Field label="Owner">
          {row.pet.owner.name ?? "—"}
          <span className="ml-1 text-[11px] text-dark-muted">
            ({row.pet.owner.email})
          </span>
        </Field>
        {row.notes && (
          <Field label="Owner notes" wide>
            {row.notes}
          </Field>
        )}
        {row.fileUrl && (
          <Field label="Attached document" wide>
            <a
              href={row.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-terracotta hover:text-[#B03E22]"
            >
              View document →
            </a>
          </Field>
        )}
      </dl>

      {showDecline && (
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Optional note to the owner (sent in the decline email)…"
          className="mt-4 w-full rounded-2xl border border-sand bg-cream px-3 py-2 text-sm text-dark outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/15"
        />
      )}

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        {showDecline ? (
          <>
            <button
              type="button"
              onClick={() => {
                setShowDecline(false);
                setNotes("");
              }}
              className="rounded-full border border-sand px-4 py-2 text-sm font-medium text-dark-muted hover:border-terracotta/40 hover:text-terracotta"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => mutation.mutate("decline")}
              disabled={mutation.isPending}
              className="rounded-full bg-[#C94B2A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#A33820] disabled:opacity-60"
            >
              {mutation.isPending ? "Declining…" : "Decline with note"}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setShowDecline(true)}
              className="rounded-full border border-sand px-4 py-2 text-sm font-medium text-dark-muted hover:border-terracotta/40 hover:text-terracotta"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={() => mutation.mutate("sign")}
              disabled={mutation.isPending}
              className="btn-primary !px-5 !py-2 !text-sm"
            >
              {mutation.isPending ? "Signing…" : "Sign as vet"}
            </button>
          </>
        )}
      </div>
    </article>
  );
}

/* ─── Recently signed card ───────────────────────────────────────────── */

function RecentCard({ row }: { row: RecentSign }) {
  return (
    <li className="rounded-2xl border border-sand bg-surface p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-dark">{row.title}</p>
          <p className="mt-0.5 truncate text-[11px] text-dark-muted">
            {row.pet.name} · {row.pet.breed}
          </p>
        </div>
        <span className="inline-flex items-center rounded-full bg-[#1D9E75]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#1D9E75] dark:text-[#7FBF88]">
          Signed
        </span>
      </div>
      {row.verifiedAt && (
        <p className="mt-2 text-[10px] uppercase tracking-wider text-dark-muted">
          {new Date(row.verifiedAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      )}
    </li>
  );
}

/* ─── Bits ───────────────────────────────────────────────────────────── */

function SectionHeader({
  title,
  count,
  subtitle,
}: {
  title: string;
  count: number;
  subtitle: string;
}) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4">
      <div>
        <h2
          className="leading-tight text-dark"
          style={{
            fontFamily: "var(--font-playfair, Georgia, serif)",
            fontWeight: 900,
            fontSize: "1.5rem",
          }}
        >
          {title}{" "}
          <span className="text-dark-muted text-base font-normal">({count})</span>
        </h2>
        <p className="mt-1 text-[12px] text-dark-muted">{subtitle}</p>
      </div>
    </div>
  );
}

function EmptyCard({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="card text-center py-10">
      <p className="font-serif text-lg font-bold text-dark">{title}</p>
      <p className="mt-2 max-w-md mx-auto text-sm text-dark-muted leading-relaxed">
        {copy}
      </p>
    </div>
  );
}

function Field({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-dark-muted">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-dark break-words">{children}</p>
    </div>
  );
}

function relativeTime(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
