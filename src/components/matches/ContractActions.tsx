"use client";

import { useState } from "react";

import { useToast } from "@/components/toast/ToastProvider";
import type { ContractTemplate } from "@/lib/contracts";

interface ContractActionsProps {
  matchId: string;
  contractId: string | null;
}

const TEMPLATES: { value: ContractTemplate; label: string }[] = [
  { value: "STANDARD_BREEDING", label: "Standard breeding" },
  { value: "STUD_SERVICE", label: "Stud service" },
  { value: "PUPPY_PLACEMENT", label: "Puppy / kitten placement" },
];

/**
 * Inline cluster that lives below an accepted MatchRequestCard. Generates
 * a draft contract from one of the three built-in templates and links
 * straight to the streaming PDF download.
 */
export function ContractActions({ matchId, contractId }: ContractActionsProps) {
  const toast = useToast();
  const [template, setTemplate] = useState<ContractTemplate>("STANDARD_BREEDING");
  const [busy, setBusy] = useState(false);
  const [id, setId] = useState<string | null>(contractId);

  async function generate() {
    setBusy(true);
    try {
      const res = await fetch(`/api/matches/${matchId}/contract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error("Couldn't create contract", data.error ?? undefined);
        return;
      }
      const data = (await res.json()) as { contract: { id: string } };
      setId(data.contract.id);
      toast.success(
        id ? "Contract refreshed" : "Contract drafted",
        "Open the PDF to review or sign."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-sand bg-cream/60 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta">
            Contract
          </span>
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value as ContractTemplate)}
            className="rounded-full border border-sand bg-surface px-3 py-1.5 text-xs font-semibold text-dark focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/15"
          >
            {TEMPLATES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={generate}
            disabled={busy}
            className="rounded-full border border-terracotta px-4 py-1.5 text-xs font-semibold text-terracotta transition-colors hover:bg-terracotta/5 disabled:opacity-50"
          >
            {busy ? "Drafting…" : id ? "Refresh draft" : "Generate draft"}
          </button>
          {id && (
            <a
              href={`/api/contracts/${id}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="btn-primary !px-4 !py-1.5 !text-xs"
            >
              View PDF →
            </a>
          )}
        </div>
      </div>
      <p className="mt-2 text-[11px] text-dark-muted leading-snug">
        Generates an editable draft using a built-in template. Both parties
        review in-app before signing.
      </p>
    </div>
  );
}
