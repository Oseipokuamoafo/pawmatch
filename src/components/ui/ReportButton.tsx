"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import {
  REPORT_REASON_LABELS,
  type ReportReason,
} from "@/lib/validations/report";
import { useToast } from "@/components/toast/ToastProvider";

interface ReportButtonProps {
  /** Either targetUserId or targetPetId (or both) is required. */
  targetUserId?: string;
  targetPetId?: string;
  /** Override label. Defaults to "Report". */
  label?: string;
  /** Visual size; "xs" is the muted card link, "sm" is a quiet inline link. */
  size?: "xs" | "sm";
  className?: string;
}

/**
 * Subtle "Report" link with a modal flow. Stays muted by design — present
 * but never competing with primary actions.
 */
export function ReportButton({
  targetUserId,
  targetPetId,
  label = "Report",
  size = "xs",
  className = "",
}: ReportButtonProps) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!targetUserId && !targetPetId) return null;

  const sizeClasses =
    size === "xs"
      ? "text-[11px] font-medium"
      : "text-xs font-medium";

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!submitted) setOpen(true);
        }}
        disabled={submitted}
        title={submitted ? "Report submitted" : "Report this profile"}
        className={`${sizeClasses} text-dark-muted/70 transition-colors hover:text-terracotta disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      >
        {submitted ? "Reported · we'll look" : label}
      </button>

      <ReportModal
        open={open}
        onClose={() => setOpen(false)}
        onSubmitted={() => {
          setSubmitted(true);
          toast.success(
            "Report submitted",
            "Thanks — our trust team will take a look."
          );
        }}
        targetUserId={targetUserId}
        targetPetId={targetPetId}
      />
    </>
  );
}

/* ─── Modal ──────────────────────────────────────────────────────────── */

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  targetUserId?: string;
  targetPetId?: string;
}

function ReportModal({
  open,
  onClose,
  onSubmitted,
  targetUserId,
  targetPetId,
}: ReportModalProps) {
  const [mounted, setMounted] = useState(false);
  const [reason, setReason] = useState<ReportReason>("FAKE_PROFILE");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  async function submit() {
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetUserId,
        targetPetId,
        reason,
        description: description.trim() || undefined,
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not submit report");
      return;
    }
    onSubmitted();
    onClose();
    // Reset for any subsequent open (the parent disables the button so this
    // is just hygiene).
    setReason("FAKE_PROFILE");
    setDescription("");
  }

  if (!mounted) return null;

  const node = (
    <div
      aria-hidden={!open}
      className="fixed inset-0 isolate"
      style={{
        zIndex: 150,
        pointerEvents: open ? "auto" : "none",
      }}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 transition-opacity duration-200 ${
          open ? "opacity-100 bg-dark/40 backdrop-blur-sm" : "pointer-events-none opacity-0"
        }`}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Report this profile"
        className={`absolute left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-4 transition-[transform,opacity] duration-200 ${
          open ? "opacity-100" : "pointer-events-none scale-95 opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="rounded-3xl bg-surface p-6 shadow-[0_30px_60px_-20px_rgba(28,16,8,0.35)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta">
                Report a profile
              </p>
              <h2
                className="mt-1 leading-tight text-dark"
                style={{
                  fontFamily: "var(--font-playfair, Georgia, serif)",
                  fontWeight: 900,
                  fontSize: "1.5rem",
                }}
              >
                What&apos;s going on?
              </h2>
              <p className="mt-2 text-xs text-dark-muted">
                Reports are confidential. We&apos;ll act on patterns, not single
                clicks.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-sand text-dark-muted hover:border-terracotta/40 hover:text-terracotta"
            >
              ×
            </button>
          </div>

          {/* Reason picker */}
          <fieldset className="mt-5 grid grid-cols-1 gap-1.5">
            <legend className="sr-only">Reason</legend>
            {(Object.keys(REPORT_REASON_LABELS) as ReportReason[]).map((key) => {
              const meta = REPORT_REASON_LABELS[key];
              const active = reason === key;
              return (
                <label
                  key={key}
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3.5 py-2.5 transition-[border-color,background] duration-150 ${
                    active
                      ? "border-terracotta bg-terracotta/[0.06]"
                      : "border-sand hover:border-terracotta/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={key}
                    checked={active}
                    onChange={() => setReason(key)}
                    className="sr-only"
                  />
                  <span
                    className={`mt-1 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${
                      active ? "border-terracotta bg-terracotta" : "border-sand"
                    }`}
                    aria-hidden="true"
                  >
                    {active && (
                      <span className="block h-1.5 w-1.5 rounded-full bg-white" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-dark">
                      {meta.label}
                    </span>
                    <span className="block text-xs leading-snug text-dark-muted">
                      {meta.copy}
                    </span>
                  </span>
                </label>
              );
            })}
          </fieldset>

          {/* Description */}
          <div className="mt-4">
            <label
              htmlFor="report-desc"
              className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-dark-muted"
            >
              Anything else? (optional)
            </label>
            <textarea
              id="report-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="A specific example helps our team triage faster."
              className="mt-2 w-full rounded-2xl border border-sand bg-cream px-3 py-2 text-sm text-dark outline-none transition-[border-color,background] duration-150 focus:border-terracotta focus:bg-surface focus:ring-2 focus:ring-terracotta/15"
            />
            <p className="mt-1 text-right text-[10px] text-dark-muted">
              {description.length} / 500
            </p>
          </div>

          {error && (
            <p className="mt-3 rounded-xl bg-terracotta/10 px-3 py-2 text-center text-xs text-terracotta">
              {error}
            </p>
          )}

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-sand pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-sand bg-transparent px-4 py-2 text-sm font-medium text-dark-muted hover:border-terracotta/40 hover:text-terracotta"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="btn-primary !px-5 !py-2 !text-sm"
            >
              {submitting ? "Submitting…" : "Submit report"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
