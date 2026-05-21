"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useToast } from "@/components/toast/ToastProvider";

export interface VetApplicantRow {
  id: string;
  name: string | null;
  email: string;
  role: "OWNER" | "BREEDER" | "VET" | "ADMIN";
  vetApplicationStatus: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
  vetLicenseNumber: string | null;
  vetLicenseState: string | null;
  vetPracticeName: string | null;
  vetPracticeAddress: string | null;
  vetPracticePhone: string | null;
  vetApprovedAt: string | null;
  createdAt: string;
  aiScreenStatus: "PENDING" | "MATCH" | "MISMATCH" | "NO_DATA" | "ERROR" | null;
  aiScreenConfidence: number | null;
  aiScreenReason: string | null;
  aiScreenEvidence:
    | { url: string; title: string; quote: string }[]
    | null;
  aiScreenedAt: string | null;
  aiAutoApprovedAt: string | null;
}

export function AdminVetsTable({ rows }: { rows: VetApplicantRow[] }) {
  const pending = rows.filter((r) => r.vetApplicationStatus === "PENDING");
  const reviewed = rows.filter((r) => r.vetApplicationStatus !== "PENDING");

  return (
    <div className="space-y-10">
      <section>
        <SectionHeader
          title="Pending review"
          count={pending.length}
          subtitle="Confirm credentials, then approve to promote to VET role."
        />
        {pending.length === 0 ? (
          <EmptyCard
            title="No pending vet applications."
            copy="New applications land here as soon as someone signs up with the vet block ticked."
          />
        ) : (
          <ul className="space-y-3">
            {pending.map((row) => (
              <ApplicantCard key={row.id} row={row} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionHeader
          title="Reviewed"
          count={reviewed.length}
          subtitle="Approved + rejected applicants. Approval is reversible by an admin via Prisma Studio."
        />
        {reviewed.length === 0 ? (
          <EmptyCard
            title="Nothing reviewed yet."
            copy="Once you approve or reject the first applicant they'll appear here."
          />
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {reviewed.map((row) => (
              <ReviewedCard key={row.id} row={row} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ─── Applicant card ─────────────────────────────────────────────────── */

function ApplicantCard({ row }: { row: VetApplicantRow }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [notes, setNotes] = useState("");
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);

  const mutation = useMutation({
    mutationFn: async (action: "approve" | "reject") => {
      const r = await fetch(`/api/admin/vets/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          notes: action === "reject" ? notes.trim() || null : undefined,
        }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data.error ?? "Action failed");
      }
      return action;
    },
    onSuccess: (action) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "vets"] });
      toast.success(
        action === "approve" ? "Vet approved" : "Application rejected",
      );
      // The data lives on the server page, so refresh for the new lists.
      window.location.reload();
    },
    onError: (err: Error) => toast.error("Couldn't update", err.message),
  });

  const rescreen = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/admin/vets/${row.id}/screen`, {
        method: "POST",
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data.error ?? "Screen failed");
      }
      return r.json();
    },
    onSuccess: () => {
      toast.success("AI screen refreshed");
      window.location.reload();
    },
    onError: (err: Error) => toast.error("Couldn't re-screen", err.message),
  });

  return (
    <li className="rounded-3xl border border-sand bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-serif text-lg font-bold leading-tight text-dark">
            Dr. {row.name ?? "—"}
          </p>
          <p className="mt-0.5 text-[12px] text-dark-muted">{row.email}</p>
          {row.vetPracticeName && (
            <p className="mt-2 text-sm font-medium text-dark">
              {row.vetPracticeName}
            </p>
          )}
        </div>
        <span className="inline-flex items-center rounded-full bg-[#E89A2A]/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#B0731A] dark:text-[#E89A2A]">
          Pending
        </span>
      </div>

      {/* ── AI auto-screen verdict ─────────────────────────────────── */}
      <AIVerdictPanel
        row={row}
        rescreening={rescreen.isPending}
        onRescreen={() => rescreen.mutate()}
        showEvidence={showEvidence}
        onToggleEvidence={() => setShowEvidence((v) => !v)}
      />

      <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <Field label="License #">{row.vetLicenseNumber ?? "—"}</Field>
        <Field label="State / region">{row.vetLicenseState ?? "—"}</Field>
        <Field label="Practice phone">{row.vetPracticePhone ?? "—"}</Field>
        <Field label="Applied">
          {new Date(row.createdAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </Field>
        {row.vetPracticeAddress && (
          <Field label="Practice address" wide>
            {row.vetPracticeAddress}
          </Field>
        )}
      </dl>

      {showRejectBox && (
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional reviewer notes (sent in the rejection email)…"
          rows={2}
          className="mt-4 w-full rounded-2xl border border-sand bg-cream px-3 py-2 text-sm text-dark outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/15"
        />
      )}

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        {showRejectBox ? (
          <>
            <button
              type="button"
              onClick={() => {
                setShowRejectBox(false);
                setNotes("");
              }}
              className="rounded-full border border-sand px-4 py-2 text-sm font-medium text-dark-muted hover:border-terracotta/40 hover:text-terracotta"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => mutation.mutate("reject")}
              disabled={mutation.isPending}
              className="rounded-full bg-[#C94B2A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#A33820] disabled:opacity-60"
            >
              {mutation.isPending ? "Sending…" : "Reject with notes"}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setShowRejectBox(true)}
              className="rounded-full border border-sand px-4 py-2 text-sm font-medium text-dark-muted hover:border-terracotta/40 hover:text-terracotta"
            >
              Reject
            </button>
            <button
              type="button"
              onClick={() => mutation.mutate("approve")}
              disabled={mutation.isPending}
              className={`btn-primary !px-5 !py-2 !text-sm ${
                row.aiScreenStatus === "MATCH" &&
                (row.aiScreenConfidence ?? 0) >= 0.85
                  ? "ring-2 ring-[#1D9E75]/40"
                  : ""
              }`}
              title={
                row.aiScreenStatus === "MATCH" &&
                (row.aiScreenConfidence ?? 0) >= 0.85
                  ? "AI recommends approval"
                  : undefined
              }
            >
              {mutation.isPending ? "Promoting…" : "Approve as vet"}
            </button>
          </>
        )}
      </div>
    </li>
  );
}

/* ─── AI verdict panel ───────────────────────────────────────────────── */

function AIVerdictPanel({
  row,
  rescreening,
  onRescreen,
  showEvidence,
  onToggleEvidence,
}: {
  row: VetApplicantRow;
  rescreening: boolean;
  onRescreen: () => void;
  showEvidence: boolean;
  onToggleEvidence: () => void;
}) {
  const status = row.aiScreenStatus;
  const confidence = row.aiScreenConfidence;
  const evidence = row.aiScreenEvidence ?? [];

  const palette = palettesByStatus(status);

  return (
    <div
      className={`mt-4 rounded-2xl border ${palette.border} ${palette.bg} p-4`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-dark-muted">
            AI auto-screen
            {row.aiScreenedAt && (
              <span className="ml-2 text-dark-muted/70">
                · {timeAgo(row.aiScreenedAt)}
              </span>
            )}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${palette.chip}`}
            >
              {palette.icon}
              {labelForStatus(status)}
            </span>
            {typeof confidence === "number" && (
              <span className="text-[12px] font-medium text-dark">
                {(confidence * 100).toFixed(0)}% confidence
              </span>
            )}
            {row.aiAutoApprovedAt && (
              <span className="inline-flex items-center rounded-full bg-[#1D9E75]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#1D9E75] dark:text-[#7FBF88]">
                Auto-approved
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onRescreen}
          disabled={rescreening}
          className="rounded-full border border-sand bg-surface/40 px-3 py-1 text-[11px] font-medium text-dark-muted transition hover:border-terracotta/40 hover:text-terracotta disabled:opacity-60"
        >
          {rescreening ? "Re-screening…" : "Re-run AI screen"}
        </button>
      </div>

      {row.aiScreenReason && (
        <p className="mt-3 text-sm leading-relaxed text-dark">
          {row.aiScreenReason}
        </p>
      )}

      {evidence.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={onToggleEvidence}
            className="text-[11px] font-semibold uppercase tracking-wider text-terracotta hover:text-[#B03E22]"
          >
            {showEvidence
              ? "Hide evidence"
              : `Show ${evidence.length} source${evidence.length === 1 ? "" : "s"}`}
          </button>
          {showEvidence && (
            <ul className="mt-2 space-y-2">
              {evidence.map((ev, i) => (
                <li
                  key={`${ev.url}-${i}`}
                  className="rounded-xl border border-sand bg-surface/70 px-3 py-2 text-[12px] text-dark"
                >
                  <a
                    href={ev.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate font-semibold text-terracotta hover:text-[#B03E22]"
                  >
                    {ev.title || ev.url}
                  </a>
                  <p className="mt-1 text-dark-muted">“{ev.quote}”</p>
                  <p className="mt-1 truncate text-[10px] text-dark-muted/70">
                    {ev.url}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {status === "ERROR" && !row.aiScreenReason && (
        <p className="mt-3 text-sm italic text-dark-muted">
          The AI screen failed. Check ANTHROPIC_API_KEY and re-run.
        </p>
      )}

      {!status && (
        <p className="mt-3 text-sm italic text-dark-muted">
          No AI screen has been run yet — click “Re-run” to verify against the state board.
        </p>
      )}
    </div>
  );
}

function labelForStatus(s: VetApplicantRow["aiScreenStatus"]): string {
  switch (s) {
    case "MATCH":
      return "License matches";
    case "MISMATCH":
      return "Mismatch";
    case "NO_DATA":
      return "No public record";
    case "ERROR":
      return "Screen failed";
    case "PENDING":
      return "Screening…";
    default:
      return "Not run";
  }
}

function palettesByStatus(s: VetApplicantRow["aiScreenStatus"]) {
  switch (s) {
    case "MATCH":
      return {
        border: "border-[#1D9E75]/30",
        bg: "bg-[#1D9E75]/8",
        chip:
          "bg-[#1D9E75]/15 text-[#1D9E75] dark:text-[#7FBF88]",
        icon: <Dot tone="match" />,
      };
    case "MISMATCH":
      return {
        border: "border-[#C94B2A]/30",
        bg: "bg-[#C94B2A]/8",
        chip:
          "bg-[#C94B2A]/15 text-[#C94B2A] dark:text-[#E08B70]",
        icon: <Dot tone="mismatch" />,
      };
    case "PENDING":
      return {
        border: "border-sand",
        bg: "bg-cream/40",
        chip: "bg-sand text-dark-muted",
        icon: <Dot tone="pending" />,
      };
    case "ERROR":
      return {
        border: "border-[#C94B2A]/30",
        bg: "bg-[#C94B2A]/5",
        chip:
          "bg-dark/10 text-dark-muted",
        icon: <Dot tone="error" />,
      };
    case "NO_DATA":
    default:
      return {
        border: "border-sand",
        bg: "bg-cream/40",
        chip:
          "bg-[#E89A2A]/15 text-[#B0731A] dark:text-[#E89A2A]",
        icon: <Dot tone="no_data" />,
      };
  }
}

function Dot({
  tone,
}: {
  tone: "match" | "mismatch" | "pending" | "error" | "no_data";
}) {
  const cls =
    tone === "match"
      ? "bg-[#1D9E75]"
      : tone === "mismatch"
        ? "bg-[#C94B2A]"
        : tone === "pending"
          ? "bg-[#E89A2A] animate-pulse"
          : tone === "error"
            ? "bg-dark/40"
            : "bg-[#E89A2A]";
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-1.5 w-1.5 rounded-full ${cls}`}
    />
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

/* ─── Reviewed card ──────────────────────────────────────────────────── */

function ReviewedCard({ row }: { row: VetApplicantRow }) {
  const approved = row.vetApplicationStatus === "APPROVED";
  return (
    <li className="rounded-2xl border border-sand bg-surface p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-dark">
            Dr. {row.name ?? row.email}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-dark-muted">{row.email}</p>
          {row.vetPracticeName && (
            <p className="mt-1 truncate text-[11px] text-dark-muted">
              {row.vetPracticeName}
            </p>
          )}
        </div>
        <span
          className={
            approved
              ? "inline-flex items-center rounded-full bg-[#1D9E75]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#1D9E75] dark:text-[#7FBF88]"
              : "inline-flex items-center rounded-full bg-dark/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-dark-muted"
          }
        >
          {row.vetApplicationStatus.toLowerCase()}
        </span>
      </div>
      {row.vetApprovedAt && (
        <p className="mt-2 text-[10px] uppercase tracking-wider text-dark-muted">
          {approved ? "Approved " : "Reviewed "}
          {new Date(row.vetApprovedAt).toLocaleDateString(undefined, {
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
