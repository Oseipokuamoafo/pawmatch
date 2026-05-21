"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useToast } from "@/components/toast/ToastProvider";
import {
  summarizeHeat,
  formatRelativeDays,
  type HeatCycleRow,
} from "@/lib/heat";

interface HeatCyclesSectionProps {
  petId: string;
  petName: string;
  species: "DOG" | "CAT";
}

interface ListResp {
  cycles: HeatCycleRow[];
}

/* ─── Component ──────────────────────────────────────────────────────── */

export function HeatCyclesSection({
  petId,
  petName,
  species,
}: HeatCyclesSectionProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);

  const { data, isLoading } = useQuery<ListResp>({
    queryKey: ["heat-cycles", petId],
    queryFn: async () => {
      const r = await fetch(`/api/pets/${petId}/heat-cycles`);
      if (!r.ok) throw new Error("Failed to load heat cycles");
      return r.json();
    },
  });

  const cycles = data?.cycles ?? [];
  const summary = useMemo(() => summarizeHeat(cycles, species), [cycles, species]);

  const createMut = useMutation({
    mutationFn: async (payload: NewCyclePayload) => {
      const r = await fetch(`/api/pets/${petId}/heat-cycles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to log cycle");
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["heat-cycles", petId] });
      setFormOpen(false);
      toast.success("Heat cycle logged");
    },
    onError: (err: Error) => toast.error("Couldn't save", err.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (cycleId: string) => {
      const r = await fetch(`/api/pets/${petId}/heat-cycles/${cycleId}`, {
        method: "DELETE",
      });
      if (!r.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["heat-cycles", petId] });
      toast.success("Cycle removed");
    },
    onError: (err: Error) => toast.error("Couldn't delete", err.message),
  });

  return (
    <section className="mx-auto max-w-6xl px-6 py-12 md:py-16">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 max-w-3xl">
        <div>
          <p className="eyebrow">Reproductive timeline</p>
          <h2 className="mt-3 font-serif text-3xl md:text-4xl font-bold leading-tight tracking-tight">
            Heat cycles
          </h2>
          <p className="mt-3 text-dark-muted leading-relaxed">
            Track {petName}&apos;s cycles to forecast the next heat and plan fertile-window
            breedings.{" "}
            {species === "CAT" && (
              <span className="italic">
                Cats are induced ovulators — predictions are heuristic; consult your
                vet for fertility timing.
              </span>
            )}
          </p>
        </div>
        {!formOpen && (
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="btn-primary !px-5 !py-2 !text-sm"
          >
            + Log a cycle
          </button>
        )}
      </header>

      {formOpen && (
        <LogForm
          submitting={createMut.isPending}
          onCancel={() => setFormOpen(false)}
          onSubmit={(payload) => createMut.mutate(payload)}
        />
      )}

      {/* ── Summary card ─────────────────────────────────────────── */}
      <SummaryCard summary={summary} isLoading={isLoading} />

      {/* ── Timeline list ────────────────────────────────────────── */}
      <div className="mt-8">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-dark-muted">
          Timeline
        </p>
        {isLoading ? (
          <ul className="space-y-2">
            <CycleSkeleton />
            <CycleSkeleton />
          </ul>
        ) : cycles.length === 0 ? (
          <div className="card text-center py-10">
            <p className="font-serif text-lg font-bold text-dark">
              No cycles logged yet
            </p>
            <p className="mt-2 text-sm text-dark-muted">
              Log the first cycle to start predicting {petName}&apos;s next heat.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {cycles.map((c) => (
              <CycleRow
                key={c.id}
                cycle={c}
                summary={summary}
                onDelete={() => deleteMut.mutate(c.id)}
                deleting={deleteMut.isPending && deleteMut.variables === c.id}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ─── Summary card ───────────────────────────────────────────────────── */

function SummaryCard({
  summary,
  isLoading,
}: {
  summary: ReturnType<typeof summarizeHeat>;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="card animate-pulse">
        <div className="h-4 w-32 rounded bg-sand" />
        <div className="mt-4 h-8 w-48 rounded bg-sand" />
        <div className="mt-3 h-3 w-64 rounded bg-sand/70" />
      </div>
    );
  }

  if (summary.total === 0) {
    return null;
  }

  const tone = summary.isActive
    ? { bg: "rgba(201,75,42,0.10)", border: "rgba(201,75,42,0.30)", color: "#C94B2A" }
    : summary.daysUntilNext != null && summary.daysUntilNext <= 14
      ? { bg: "rgba(232,154,42,0.12)", border: "rgba(232,154,42,0.30)", color: "#B0731A" }
      : { bg: "rgba(29,158,117,0.10)", border: "rgba(29,158,117,0.30)", color: "#1D9E75" };

  const headline = summary.isActive
    ? "Currently in heat"
    : summary.daysUntilNext != null
      ? `Next heat ${formatRelativeDays(summary.daysUntilNext)}`
      : "Tracking";

  return (
    <div
      className="rounded-3xl border p-6"
      style={{ background: tone.bg, borderColor: tone.border }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div className="min-w-0">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: tone.color }}
          >
            {summary.isActive ? "Status" : "Forecast"}
          </p>
          <p
            className="mt-1 leading-none text-dark"
            style={{
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontWeight: 900,
              fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
            }}
          >
            {headline}
          </p>
          {summary.nextPredictedStart && !summary.isActive && (
            <p className="mt-2 text-sm text-dark-muted">
              Predicted to start{" "}
              <strong className="font-semibold text-dark">
                {summary.nextPredictedStart.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </strong>
              .
            </p>
          )}
          {summary.fertileWindow && (
            <p className="mt-2 text-sm" style={{ color: tone.color }}>
              <strong>Peak fertility window:</strong>{" "}
              {fmtDate(summary.fertileWindow.start)} –{" "}
              {fmtDate(summary.fertileWindow.end)}
              {!cycleHasExplicitWindow(summary) && (
                <span className="ml-1 italic text-dark-muted">(est.)</span>
              )}
            </p>
          )}
        </div>

        <dl className="grid grid-cols-3 gap-x-6 gap-y-1 text-center">
          <Stat
            label="Avg gap"
            value={
              summary.averageCycleDays
                ? `${summary.averageCycleDays}d`
                : "—"
            }
          />
          <Stat label="Total" value={String(summary.total)} />
          <Stat
            label="Last"
            value={
              summary.lastCompleted
                ? fmtDate(toDate(summary.lastCompleted.startDate))
                : "—"
            }
          />
        </dl>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-dark-muted">
        {label}
      </dt>
      <dd className="mt-0.5 font-serif text-lg font-bold text-dark">{value}</dd>
    </div>
  );
}

function cycleHasExplicitWindow(s: ReturnType<typeof summarizeHeat>): boolean {
  // Heuristic: an active cycle is the source; we can detect explicit-ness
  // by re-comparing. Caller stitched the value, so simply rely on whether
  // the window length is exactly 5 days starting on day 9 from active start.
  if (!s.fertileWindow) return false;
  // Span > 4 days is the heuristic default; treat anything else as explicit.
  const span = (+s.fertileWindow.end - +s.fertileWindow.start) / 86_400_000;
  return Math.round(span) !== 4;
}

/* ─── Cycle row ──────────────────────────────────────────────────────── */

function CycleRow({
  cycle,
  summary,
  onDelete,
  deleting,
}: {
  cycle: HeatCycleRow;
  summary: ReturnType<typeof summarizeHeat>;
  onDelete: () => void;
  deleting: boolean;
}) {
  const isActive = cycle.id === summary.activeCycleId;
  const start = toDate(cycle.startDate);
  const end = cycle.endDate ? toDate(cycle.endDate) : null;
  const duration = end
    ? Math.max(1, Math.round((+end - +start) / 86_400_000) + 1)
    : null;

  return (
    <li
      className={`flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 ${
        isActive ? "border-terracotta/40 bg-terracotta/5" : "border-sand bg-surface"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-bold ${
            isActive ? "bg-terracotta text-white" : "bg-sand text-dark"
          }`}
          aria-hidden="true"
        >
          ♀
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-dark">
            {fmtDate(start)}
            {end ? ` – ${fmtDate(end)}` : " — ongoing"}
          </p>
          <p className="mt-0.5 text-[12px] text-dark-muted">
            {duration != null
              ? `${duration} day${duration === 1 ? "" : "s"}`
              : `Started ${formatRelativeDays(
                  Math.round((+start - +new Date()) / 86_400_000),
                )}`}
            {cycle.peakFertilityStart && cycle.peakFertilityEnd && (
              <>
                {" · Fertile "}
                {fmtDate(toDate(cycle.peakFertilityStart))}–
                {fmtDate(toDate(cycle.peakFertilityEnd))}
              </>
            )}
            {cycle.notes && <span> · {cycle.notes}</span>}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onDelete}
        disabled={deleting}
        className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-dark-muted transition-colors hover:text-terracotta disabled:opacity-50"
      >
        {deleting ? "…" : "Remove"}
      </button>
    </li>
  );
}

function CycleSkeleton() {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-sand bg-surface px-4 py-3">
      <span className="h-9 w-9 rounded-full bg-sand animate-pulse" />
      <div className="flex-1 space-y-2">
        <span className="block h-3 w-40 rounded bg-sand animate-pulse" />
        <span className="block h-2.5 w-56 rounded bg-sand/70 animate-pulse" />
      </div>
    </li>
  );
}

/* ─── Log form ───────────────────────────────────────────────────────── */

interface NewCyclePayload {
  startDate: string;
  endDate?: string | null;
  peakFertilityStart?: string | null;
  peakFertilityEnd?: string | null;
  notes?: string | null;
}

function LogForm({
  submitting,
  onSubmit,
  onCancel,
}: {
  submitting: boolean;
  onSubmit: (payload: NewCyclePayload) => void;
  onCancel: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState("");
  const [peakStart, setPeakStart] = useState("");
  const [peakEnd, setPeakEnd] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          startDate,
          endDate: endDate || null,
          peakFertilityStart: peakStart || null,
          peakFertilityEnd: peakEnd || null,
          notes: notes.trim() || null,
        });
      }}
      className="mb-6 rounded-3xl border border-sand bg-surface p-5"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-dark-muted">
        New cycle
      </p>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Start date" required>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className="input-base"
          />
        </Field>
        <Field label="End date (optional)">
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate}
            className="input-base"
          />
        </Field>
        <Field label="Peak fertility start (optional)">
          <input
            type="date"
            value={peakStart}
            onChange={(e) => setPeakStart(e.target.value)}
            min={startDate}
            className="input-base"
          />
        </Field>
        <Field label="Peak fertility end (optional)">
          <input
            type="date"
            value={peakEnd}
            onChange={(e) => setPeakEnd(e.target.value)}
            min={peakStart || startDate}
            className="input-base"
          />
        </Field>
      </div>
      <div className="mt-4">
        <Field label="Notes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Anything notable — flow, behavior, vet observations…"
            className="input-base resize-y"
          />
        </Field>
      </div>
      <div className="mt-5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-sand px-4 py-2 text-sm font-medium text-dark-muted hover:border-terracotta/40 hover:text-terracotta"
        >
          Cancel
        </button>
        <button type="submit" disabled={submitting} className="btn-primary !text-sm">
          {submitting ? "Saving…" : "Save cycle"}
        </button>
      </div>
      <style>{`
        .input-base {
          width: 100%;
          border-radius: 12px;
          border: 1px solid var(--color-sand);
          background: var(--color-cream);
          padding: 0.55rem 0.85rem;
          font-size: 0.875rem;
          color: var(--color-dark);
          outline: none;
          transition: border-color 150ms ease, background-color 150ms ease;
        }
        .input-base:focus {
          border-color: var(--color-terracotta);
          background: var(--color-surface);
          box-shadow: 0 0 0 3px rgba(201,75,42,0.15);
        }
      `}</style>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-wider text-dark-muted">
        {label}
        {required && <span className="ml-0.5 text-terracotta">*</span>}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────────── */

function toDate(d: string | Date): Date {
  return typeof d === "string" ? new Date(d) : d;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
