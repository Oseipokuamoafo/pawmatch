"use client";

import { useRef, useState, ChangeEvent } from "react";
import { useRouter } from "next/navigation";

import { parseDnaJson, type DnaImportInput } from "@/lib/validations/dna";
import { useToast } from "@/components/toast/ToastProvider";

interface DNAImportProps {
  petId: string;
}

export function DNAImport({ petId }: DNAImportProps) {
  const router = useRouter();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [parsed, setParsed] = useState<DnaImportInput | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  function openPicker() {
    fileInputRef.current?.click();
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    setParseError(null);
    setParsed(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const raw = JSON.parse(text);
      const normalized = parseDnaJson(raw);
      setParsed(normalized);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Couldn't read that file.";
      setParseError(msg);
      toast.error("Couldn't parse the file", msg);
    } finally {
      e.target.value = "";
    }
  }

  async function confirmImport() {
    if (!parsed) return;
    setSubmitting(true);
    const res = await fetch(`/api/pets/${petId}/dna-import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
    });
    setSubmitting(false);

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error("Import failed", data.error ?? "Please try again.");
      return;
    }
    const { summary } = (await res.json()) as {
      summary: {
        provider: string;
        breedCount: number;
        markerCount: number;
        traitCount: number;
      };
    };
    toast.success(
      `Imported from ${summary.provider}`,
      `${summary.breedCount} breed${summary.breedCount === 1 ? "" : "s"} · ${summary.markerCount} markers · ${summary.traitCount} traits`
    );
    setParsed(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        onChange={onFile}
        className="hidden"
      />

      {parsed ? (
        <Preview
          data={parsed}
          submitting={submitting}
          onConfirm={confirmImport}
          onCancel={() => setParsed(null)}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={openPicker} className="btn-primary">
            Import DNA…
          </button>
          <button
            type="button"
            onClick={() => setShowHelp((s) => !s)}
            className="text-sm font-medium text-dark-muted hover:text-terracotta"
          >
            {showHelp ? "Hide format help" : "What format?"}
          </button>
        </div>
      )}

      {parseError && (
        <p className="text-sm text-terracotta">{parseError}</p>
      )}

      {showHelp && <FormatHelp />}
    </div>
  );
}

/* ─── Preview ────────────────────────────────────────────────────────── */

function Preview({
  data,
  submitting,
  onConfirm,
  onCancel,
}: {
  data: DnaImportInput;
  submitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const topBreeds = data.breedComposition.slice().sort((a, b) => b.percent - a.percent);
  const flaggedMarkers = data.healthMarkers.filter(
    (m) => !/^clear|normal$/i.test(m.status.trim())
  );
  const clearMarkers = data.healthMarkers.length - flaggedMarkers.length;

  return (
    <div className="rounded-2xl border border-sand bg-surface p-5">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta">
            Preview · from {data.provider}
          </p>
          <p
            className="mt-1 leading-tight text-dark"
            style={{
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontWeight: 900,
              fontSize: "1.5rem",
            }}
          >
            Review before importing
          </p>
        </div>
        {data.coi != null && (
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-[0.18em] text-dark-muted">
              COI
            </p>
            <p
              className="mt-1 text-terracotta"
              style={{
                fontFamily: "var(--font-playfair, Georgia, serif)",
                fontWeight: 900,
                fontSize: "1.5rem",
              }}
            >
              {data.coi.toFixed(1)}%
            </p>
          </div>
        )}
      </div>

      <Section
        title="Breed composition"
        empty="No breeds reported"
        count={data.breedComposition.length}
      >
        {topBreeds.length > 0 && (
          <ul className="space-y-2">
            {topBreeds.map((b) => (
              <li key={b.name} className="flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-sand/60">
                  <div
                    className="h-full rounded-full bg-terracotta"
                    style={{ width: `${Math.max(2, Math.round(b.percent))}%` }}
                  />
                </div>
                <span className="w-32 shrink-0 text-sm text-dark">{b.name}</span>
                <span className="w-12 shrink-0 text-right text-sm font-semibold text-terracotta">
                  {b.percent.toFixed(1)}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Health markers"
        empty="No health markers reported"
        count={data.healthMarkers.length}
      >
        {data.healthMarkers.length > 0 && (
          <>
            {flaggedMarkers.length > 0 && (
              <div className="mb-3 rounded-xl border border-terracotta/30 bg-terracotta/[0.06] px-3 py-2 text-xs text-dark">
                <strong className="text-terracotta">
                  {flaggedMarkers.length} non-clear
                </strong>{" "}
                marker{flaggedMarkers.length === 1 ? "" : "s"} — review carefully.
              </div>
            )}
            <ul className="flex flex-wrap gap-1.5">
              {flaggedMarkers.map((m) => (
                <li
                  key={m.name}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
                  style={{
                    background: "rgba(201,75,42,0.10)",
                    color: "#C94B2A",
                  }}
                  title={m.status}
                >
                  <span className="font-semibold">{m.name}</span>
                  <span className="opacity-80">· {m.status}</span>
                </li>
              ))}
            </ul>
            {clearMarkers > 0 && (
              <p className="mt-2 text-xs text-dark-muted">
                + {clearMarkers} clear / normal marker{clearMarkers === 1 ? "" : "s"}
              </p>
            )}
          </>
        )}
      </Section>

      <Section title="Traits" empty="No traits reported" count={data.traits.length}>
        {data.traits.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {data.traits.map((t) => (
              <li
                key={`${t.name}-${t.value}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-sand px-2.5 py-1 text-xs text-dark"
              >
                <span className="font-semibold">{t.name}</span>
                <span className="text-dark-muted">· {t.value}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-sand pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-sand bg-transparent px-4 py-2 text-sm font-medium text-dark-muted hover:border-terracotta/40 hover:text-terracotta"
        >
          Choose another file
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={submitting}
          className="btn-primary"
        >
          {submitting ? "Importing…" : "Confirm import"}
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5 border-t border-sand pt-4 first:mt-0 first:border-0 first:pt-0">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-dark-muted">
          {title}
        </p>
        <span className="text-xs text-dark-muted">{count}</span>
      </div>
      {count === 0 ? (
        <p className="text-sm italic text-dark-muted">{empty}</p>
      ) : (
        children
      )}
    </div>
  );
}

/* ─── Format helper ──────────────────────────────────────────────────── */

function FormatHelp() {
  return (
    <details
      open
      className="rounded-2xl border border-sand bg-cream/60 p-4 text-sm text-dark-muted"
    >
      <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta">
        Expected JSON shape
      </summary>
      <p className="mt-3 leading-relaxed">
        Upload the JSON export from{" "}
        <strong className="text-dark">Embark</strong> or{" "}
        <strong className="text-dark">Wisdom Panel</strong>. We auto-detect both.
        If your export is something else, normalize it to the shape below.
      </p>
      <pre className="mt-3 overflow-auto rounded-xl bg-dark p-3 text-[11px] leading-relaxed text-cream">
{`{
  "provider": "Embark" | "Wisdom Panel" | "Other",
  "breedComposition": [{ "name": "Golden Retriever", "percent": 48.2 }],
  "healthMarkers":    [{ "name": "Hyperuricosuria (HUU)", "status": "carrier" }],
  "traits":           [{ "name": "Coat Color", "value": "Black" }],
  "coi": 4.1,
  "testedOn": "2026-04-20"
}`}
      </pre>
      <p className="mt-3 text-xs">
        Embark exports use <code>breeds</code> / <code>healthResults</code> /{" "}
        <code>traits</code>. Wisdom Panel uses <code>breedComposition</code> /{" "}
        <code>healthTests</code> / <code>traitTests</code>. Both work.
      </p>
    </details>
  );
}
