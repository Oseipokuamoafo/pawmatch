"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useToast } from "@/components/toast/ToastProvider";
import type { VerificationStatus } from "@/generated/prisma";

interface AdminRequest {
  id: string;
  userId: string;
  documents: string[];
  programDescription: string;
  status: VerificationStatus;
  createdAt: string;
  reviewedAt: string | null;
  notes: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    isVerified: boolean;
  };
}

interface ApiResponse {
  requests: AdminRequest[];
}

const QUERY_KEY = ["admin", "verifications"] as const;

export function AdminVerificationsTable({
  initialRequests,
}: {
  initialRequests: AdminRequest[];
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [rejectFor, setRejectFor] = useState<AdminRequest | null>(null);

  const { data } = useQuery<ApiResponse>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await fetch("/api/admin/verifications", { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load verifications");
      return res.json();
    },
    initialData: { requests: initialRequests },
    refetchOnWindowFocus: false,
  });

  const requests = data?.requests ?? [];
  const pending = requests.filter((r) => r.status === "PENDING");
  const decided = requests.filter((r) => r.status !== "PENDING");

  const actionMutation = useMutation<
    AdminRequest,
    Error,
    { id: string; action: "approve" | "reject"; notes?: string },
    { previous: ApiResponse | undefined }
  >({
    mutationFn: async ({ id, action, notes }) => {
      const res = await fetch(`/api/admin/verifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Action failed");
      }
      const { request } = (await res.json()) as { request: AdminRequest };
      return request;
    },
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<ApiResponse>(QUERY_KEY);
      queryClient.setQueryData<ApiResponse>(QUERY_KEY, (prev) =>
        prev
          ? {
              requests: prev.requests.map((r) =>
                r.id === vars.id
                  ? {
                      ...r,
                      status: vars.action === "approve" ? "APPROVED" : "REJECTED",
                      notes: vars.notes ?? r.notes,
                      reviewedAt: new Date().toISOString(),
                    }
                  : r
              ),
            }
          : prev
      );
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(QUERY_KEY, ctx.previous);
      toast.error("Action failed", err.message);
    },
    onSuccess: (_data, vars) => {
      toast.success(
        vars.action === "approve" ? "Breeder verified" : "Application declined",
        vars.action === "approve"
          ? "We've emailed them the confirmation."
          : "We've sent them the reviewer notes."
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  return (
    <>
      <Section title="Pending review" subtitle="Awaiting your decision">
        {pending.length === 0 ? (
          <EmptyRow message="No applications waiting." />
        ) : (
          <ul className="space-y-3">
            {pending.map((r) => (
              <RequestRow
                key={r.id}
                request={r}
                onApprove={() =>
                  actionMutation.mutate({ id: r.id, action: "approve" })
                }
                onReject={() => setRejectFor(r)}
                isWorking={actionMutation.isPending}
              />
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Recently decided"
        subtitle="Approved or declined in the last cycle"
      >
        {decided.length === 0 ? (
          <EmptyRow message="No history yet." />
        ) : (
          <ul className="space-y-3">
            {decided.slice(0, 10).map((r) => (
              <RequestRow key={r.id} request={r} readOnly />
            ))}
          </ul>
        )}
      </Section>

      {rejectFor && (
        <RejectModal
          applicantName={rejectFor.user.name ?? rejectFor.user.email}
          onCancel={() => setRejectFor(null)}
          onSubmit={(notes) => {
            actionMutation.mutate({
              id: rejectFor.id,
              action: "reject",
              notes,
            });
            setRejectFor(null);
          }}
        />
      )}
    </>
  );
}

/* ─── Row ────────────────────────────────────────────────────────────── */

function RequestRow({
  request: r,
  onApprove,
  onReject,
  isWorking = false,
  readOnly = false,
}: {
  request: AdminRequest;
  onApprove?: () => void;
  onReject?: () => void;
  isWorking?: boolean;
  readOnly?: boolean;
}) {
  const dateLabel = new Date(r.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <li className="card flex flex-col gap-4 sm:flex-row sm:items-start">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-terracotta/15 text-sm font-semibold text-terracotta"
          aria-hidden="true"
        >
          {(r.user.name ?? r.user.email)[0]?.toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <p
              className="leading-tight text-dark"
              style={{
                fontFamily: "var(--font-playfair, Georgia, serif)",
                fontWeight: 700,
                fontSize: "1.125rem",
              }}
            >
              {r.user.name ?? "—"}
            </p>
            <span className="text-sm text-dark-muted">{r.user.email}</span>
            <StatusPill status={r.status} />
          </div>
          <p className="mt-1 text-xs text-dark-muted">submitted {dateLabel}</p>

          <p className="mt-3 line-clamp-3 text-sm text-dark/90 leading-relaxed">
            {r.programDescription}
          </p>

          {r.documents.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-dark-muted">
                Documents:
              </span>
              {r.documents.map((url, i) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-full bg-sand px-2.5 py-0.5 text-xs font-semibold text-dark transition-colors hover:bg-terracotta hover:text-white"
                >
                  #{i + 1}
                </a>
              ))}
            </div>
          )}

          {r.notes && r.status !== "PENDING" && (
            <p className="mt-3 rounded-xl border border-sand bg-cream px-3 py-2 text-xs italic text-dark-muted">
              Reviewer notes: {r.notes}
            </p>
          )}
        </div>
      </div>

      {!readOnly && (
        <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={onApprove}
            disabled={isWorking}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50"
            style={{ background: "#1D9E75" }}
          >
            ✓ Approve
          </button>
          <button
            type="button"
            onClick={onReject}
            disabled={isWorking}
            className="rounded-full border border-terracotta px-4 py-2 text-sm font-semibold text-terracotta transition-colors hover:bg-terracotta/5 disabled:opacity-50"
          >
            Reject…
          </button>
        </div>
      )}
    </li>
  );
}

function StatusPill({ status }: { status: VerificationStatus }) {
  const map = {
    PENDING: { bg: "rgba(232,154,42,0.15)", color: "#B0731A", label: "Pending" },
    APPROVED: { bg: "rgba(29,158,117,0.15)", color: "#1D9E75", label: "Approved" },
    REJECTED: { bg: "rgba(201,75,42,0.12)", color: "#C94B2A", label: "Rejected" },
  } as const;
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

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12 first:mt-0">
      <header className="mb-4 flex items-baseline justify-between">
        <h2
          className="leading-tight text-dark"
          style={{
            fontFamily: "var(--font-playfair, Georgia, serif)",
            fontWeight: 900,
            fontSize: "1.5rem",
          }}
        >
          {title}
        </h2>
        <span className="text-xs uppercase tracking-[0.18em] text-dark-muted">
          {subtitle}
        </span>
      </header>
      {children}
    </section>
  );
}

function EmptyRow({ message }: { message: string }) {
  return (
    <div className="rounded-card border-2 border-dashed border-sand bg-surface/40 p-6 text-center text-sm italic text-dark-muted">
      {message}
    </div>
  );
}

/* ─── Reject modal ───────────────────────────────────────────────────── */

function RejectModal({
  applicantName,
  onCancel,
  onSubmit,
}: {
  applicantName: string;
  onCancel: () => void;
  onSubmit: (notes: string) => void;
}) {
  const [notes, setNotes] = useState("");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Reject application"
      className="fixed inset-0 flex items-center justify-center px-4"
      style={{ zIndex: "var(--z-modal)" as unknown as number }}
    >
      <div
        className="absolute inset-0 bg-dark/40 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md rounded-3xl bg-surface p-6 shadow-[0_30px_60px_-20px_rgba(28,16,8,0.35)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta">
          Reject application
        </p>
        <h2
          className="mt-2 leading-tight text-dark"
          style={{
            fontFamily: "var(--font-playfair, Georgia, serif)",
            fontWeight: 900,
            fontSize: "1.5rem",
          }}
        >
          Notes for {applicantName}
        </h2>
        <p className="mt-2 text-sm text-dark-muted">
          They&apos;ll see this verbatim in their email. Be specific so they can
          reapply successfully.
        </p>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          maxLength={1000}
          placeholder="e.g. We couldn't verify your kennel club registration — please attach a current copy."
          className="mt-4 w-full rounded-2xl border border-sand bg-cream px-4 py-3 text-base text-dark outline-none transition-[border-color,background] duration-150 focus:border-terracotta focus:bg-surface focus:ring-2 focus:ring-terracotta/15"
        />
        <p className="mt-1 text-right text-xs text-dark-muted">
          {notes.length} / 1000
        </p>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-sand pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-sand bg-transparent px-4 py-2 text-sm font-medium text-dark-muted hover:border-terracotta/40 hover:text-terracotta"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit(notes.trim())}
            className="rounded-full border border-terracotta px-4 py-2 text-sm font-semibold text-terracotta transition-colors hover:bg-terracotta hover:text-white"
          >
            Send rejection
          </button>
        </div>
      </div>
    </div>
  );
}
