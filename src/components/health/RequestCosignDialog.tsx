"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

import { useToast } from "@/components/toast/ToastProvider";

interface VetOption {
  id: string;
  name: string | null;
  vetPracticeName: string | null;
  vetPracticeAddress: string | null;
  vetLicenseState: string | null;
  vetLicenseNumber: string | null;
}

interface RequestCosignDialogProps {
  open: boolean;
  onClose: () => void;
  recordId: string;
  recordTitle: string;
  /** When non-null, the dialog opens in "change vet" mode. */
  currentRequestedVetId: string | null;
}

const SEARCH_DEBOUNCE_MS = 250;

export function RequestCosignDialog({
  open,
  onClose,
  recordId,
  recordTitle,
  currentRequestedVetId,
}: RequestCosignDialogProps) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VetOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const reqRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state every time the dialog opens
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setResults([]);
    setSelectedId(null);
    setSubmitting(false);
    // Initial empty-query fetch surfaces recently approved vets
    void fetchResults("");
    // Focus the search input
    setTimeout(() => inputRef.current?.focus(), 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function fetchResults(q: string) {
    setLoading(true);
    const reqId = ++reqRef.current;
    try {
      const r = await fetch(`/api/vet/search?q=${encodeURIComponent(q)}`);
      const data = (await r.json()) as { vets: VetOption[] };
      if (reqId !== reqRef.current) return;
      setResults(data.vets ?? []);
    } catch {
      if (reqId === reqRef.current) setResults([]);
    } finally {
      if (reqId === reqRef.current) setLoading(false);
    }
  }

  // Debounced search
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => void fetchResults(query), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [query, open]);

  const ctaLabel = useMemo(() => {
    if (submitting) return currentRequestedVetId ? "Updating…" : "Sending…";
    return currentRequestedVetId ? "Update request" : "Send request";
  }, [submitting, currentRequestedVetId]);

  async function submit() {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      const r = await fetch(`/api/health/${recordId}/request-cosign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vetId: selectedId }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not send request");
      }
      toast.success("Request sent — the vet will see it in their inbox.");
      onClose();
      window.location.reload();
    } catch (err) {
      toast.error("Couldn't send request", (err as Error).message);
      setSubmitting(false);
    }
  }

  async function cancelExisting() {
    if (!currentRequestedVetId) return;
    setCancelling(true);
    try {
      const r = await fetch(`/api/health/${recordId}/request-cosign`, {
        method: "DELETE",
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not cancel request");
      }
      toast.success("Request cancelled.");
      onClose();
      window.location.reload();
    } catch (err) {
      toast.error("Couldn't cancel", (err as Error).message);
      setCancelling(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-end justify-center bg-dark/40 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-lg overflow-hidden rounded-t-3xl bg-surface shadow-2xl sm:rounded-3xl"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-sand px-6 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-terracotta">
                Vet co-sign
              </p>
              <h2
                className="mt-1 leading-tight text-dark"
                style={{
                  fontFamily: "var(--font-playfair, Georgia, serif)",
                  fontWeight: 800,
                  fontSize: "1.5rem",
                }}
              >
                {currentRequestedVetId ? "Pick a different vet" : "Request a vet"}
              </h2>
              <p className="mt-1.5 text-sm text-dark-muted">
                For <em>{recordTitle}</em>. Only vets approved by the PawMatch
                admin team can co-sign.
              </p>
            </div>

            <div className="px-6 py-4">
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, practice, license #, or state…"
                className="w-full rounded-2xl border border-sand bg-cream px-4 py-2.5 text-sm text-dark outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/15"
              />
            </div>

            <div className="max-h-[50vh] overflow-y-auto px-3 pb-3">
              {loading && results.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-dark-muted">
                  Searching…
                </p>
              ) : results.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-dark-muted">
                  No matching vets. Try a broader search, or check spelling.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {results.map((vet) => {
                    const active = selectedId === vet.id;
                    return (
                      <li key={vet.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(vet.id)}
                          className={`flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                            active
                              ? "border-terracotta bg-terracotta/8"
                              : "border-transparent hover:border-sand hover:bg-cream/40"
                          }`}
                        >
                          <span
                            className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                              active
                                ? "border-terracotta bg-terracotta"
                                : "border-sand"
                            }`}
                          >
                            {active && (
                              <span className="h-1.5 w-1.5 rounded-full bg-white" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-dark">
                              Dr. {vet.name ?? "—"}
                            </span>
                            <span className="block truncate text-[12px] text-dark-muted">
                              {vet.vetPracticeName ?? "Independent"}
                              {vet.vetLicenseState ? ` · ${vet.vetLicenseState}` : ""}
                            </span>
                            {vet.vetPracticeAddress && (
                              <span className="mt-0.5 block truncate text-[11px] text-dark-muted">
                                {vet.vetPracticeAddress}
                              </span>
                            )}
                          </span>
                          <Link
                            href={`/vets/${vet.id}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="self-center text-[11px] font-semibold text-terracotta opacity-0 transition group-hover:opacity-100 hover:text-[#B03E22]"
                            style={{ opacity: active ? 1 : undefined }}
                          >
                            Profile →
                          </Link>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-sand bg-cream/40 px-6 py-4">
              <div className="flex gap-2">
                {currentRequestedVetId && (
                  <button
                    type="button"
                    onClick={cancelExisting}
                    disabled={cancelling || submitting}
                    className="rounded-full border border-sand px-4 py-2 text-sm font-medium text-dark-muted hover:border-terracotta/40 hover:text-terracotta disabled:opacity-60"
                  >
                    {cancelling ? "Cancelling…" : "Cancel request"}
                  </button>
                )}
              </div>
              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full px-4 py-2 text-sm font-medium text-dark-muted hover:text-terracotta"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={!selectedId || submitting}
                  className="btn-primary !px-5 !py-2 !text-sm disabled:opacity-60"
                >
                  {ctaLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
