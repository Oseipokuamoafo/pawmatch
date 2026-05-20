"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { REPORT_REASON_LABELS, type ReportReason } from "@/lib/validations/report";
import { useToast } from "@/components/toast/ToastProvider";
import type { ReportStatus } from "@/generated/prisma";

interface AdminReport {
  id: string;
  reporterId: string;
  targetUserId: string | null;
  targetPetId: string | null;
  reason: string;
  description: string | null;
  status: ReportStatus;
  createdAt: string;
  reporter: { id: string; name: string | null; email: string };
  target: {
    pet: { id: string; name: string; breed: string; ownerId: string } | null;
    user: { id: string; name: string | null; email: string } | null;
  };
}

interface ApiResponse {
  reports: AdminReport[];
}

const QUERY_KEY = ["admin", "reports"] as const;

export function AdminReportsTable({
  initialReports,
}: {
  initialReports: AdminReport[];
}) {
  const toast = useToast();
  const qc = useQueryClient();

  const { data } = useQuery<ApiResponse>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await fetch("/api/admin/reports", { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load reports");
      return res.json();
    },
    initialData: { reports: initialReports },
    refetchOnWindowFocus: false,
  });

  const reports = data?.reports ?? [];
  const open = reports.filter((r) => r.status === "OPEN");
  const decided = reports.filter((r) => r.status !== "OPEN");

  const mutation = useMutation<
    AdminReport,
    Error,
    { id: string; status: ReportStatus },
    { previous: ApiResponse | undefined }
  >({
    mutationFn: async ({ id, status }) => {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Action failed");
      }
      const { report } = (await res.json()) as { report: AdminReport };
      return report;
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const previous = qc.getQueryData<ApiResponse>(QUERY_KEY);
      qc.setQueryData<ApiResponse>(QUERY_KEY, (prev) =>
        prev
          ? {
              reports: prev.reports.map((r) =>
                r.id === vars.id ? { ...r, status: vars.status } : r
              ),
            }
          : prev
      );
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(QUERY_KEY, ctx.previous);
      toast.error("Couldn't update", err.message);
    },
    onSuccess: (_d, vars) => {
      const label =
        vars.status === "REVIEWED"
          ? "Marked reviewed"
          : vars.status === "RESOLVED"
            ? "Marked resolved"
            : "Dismissed";
      toast.success(label);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  return (
    <>
      <Section title="Open" subtitle="Awaiting your decision">
        {open.length === 0 ? (
          <EmptyRow message="No open reports. Nice." />
        ) : (
          <ul className="space-y-3">
            {open.map((r) => (
              <ReportRow
                key={r.id}
                report={r}
                onAction={(status) => mutation.mutate({ id: r.id, status })}
                isWorking={mutation.isPending}
              />
            ))}
          </ul>
        )}
      </Section>

      <Section title="Recently decided" subtitle="Last 20">
        {decided.length === 0 ? (
          <EmptyRow message="No history yet." />
        ) : (
          <ul className="space-y-3">
            {decided.slice(0, 20).map((r) => (
              <ReportRow key={r.id} report={r} readOnly />
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}

/* ─── Row ────────────────────────────────────────────────────────────── */

function ReportRow({
  report: r,
  onAction,
  isWorking = false,
  readOnly = false,
}: {
  report: AdminReport;
  onAction?: (status: ReportStatus) => void;
  isWorking?: boolean;
  readOnly?: boolean;
}) {
  const reasonLabel =
    REPORT_REASON_LABELS[r.reason as ReportReason]?.label ?? r.reason;
  const dateLabel = new Date(r.createdAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <li className="card flex flex-col gap-4 sm:flex-row sm:items-start">
      <div className="flex min-w-0 flex-1 gap-3">
        <span
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-terracotta"
          style={{ background: "rgba(201,75,42,0.10)" }}
          aria-hidden="true"
        >
          !
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <ReasonChip reason={r.reason} />
            <StatusPill status={r.status} />
            <span className="text-[11px] text-dark-muted">{dateLabel}</span>
          </div>

          <p
            className="mt-2 leading-tight text-dark"
            style={{
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontWeight: 700,
              fontSize: "1.125rem",
            }}
          >
            {reasonLabel}
            {" — "}
            <TargetLabel report={r} />
          </p>

          <p className="mt-1 text-xs text-dark-muted">
            Reporter: <span className="font-semibold text-dark">{r.reporter.name ?? r.reporter.email}</span>
          </p>

          {r.description && (
            <p className="mt-2 rounded-xl border border-sand bg-cream px-3 py-2 text-sm leading-relaxed text-dark/85">
              {r.description}
            </p>
          )}
        </div>
      </div>

      {!readOnly && onAction && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => onAction("REVIEWED")}
            disabled={isWorking}
            className="rounded-full border border-sand px-3 py-1.5 text-xs font-semibold text-dark transition-colors hover:border-terracotta/40 hover:text-terracotta disabled:opacity-50"
          >
            Reviewed
          </button>
          <button
            type="button"
            onClick={() => onAction("RESOLVED")}
            disabled={isWorking}
            className="rounded-full px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50"
            style={{ background: "#1D9E75" }}
          >
            ✓ Resolved
          </button>
          <button
            type="button"
            onClick={() => onAction("DISMISSED")}
            disabled={isWorking}
            className="rounded-full border border-terracotta px-3 py-1.5 text-xs font-semibold text-terracotta transition-colors hover:bg-terracotta/5 disabled:opacity-50"
          >
            Dismiss
          </button>
        </div>
      )}
    </li>
  );
}

function TargetLabel({ report }: { report: AdminReport }) {
  if (report.target.pet) {
    return (
      <Link
        href={`/dashboard/pets/${report.target.pet.id}`}
        className="text-terracotta hover:underline"
      >
        🐾 {report.target.pet.name}
        <span className="text-dark-muted"> ({report.target.pet.breed})</span>
      </Link>
    );
  }
  if (report.target.user) {
    return (
      <span className="text-dark">
        👤 {report.target.user.name ?? report.target.user.email}
      </span>
    );
  }
  return <span className="italic text-dark-muted">unknown target</span>;
}

function ReasonChip({ reason }: { reason: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full bg-sand px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-dark-muted"
    >
      {reason.replace(/_/g, " ")}
    </span>
  );
}

function StatusPill({ status }: { status: ReportStatus }) {
  const map = {
    OPEN: { bg: "rgba(232,154,42,0.15)", color: "#B0731A", label: "Open" },
    REVIEWED: { bg: "rgba(54,121,210,0.15)", color: "#3679D2", label: "Reviewed" },
    RESOLVED: { bg: "rgba(29,158,117,0.15)", color: "#1D9E75", label: "Resolved" },
    DISMISSED: { bg: "rgba(28,16,8,0.08)", color: "#3D2A1A", label: "Dismissed" },
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
