"use client";

import { useMemo, useState, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";

import { createHealthRecordSchema } from "@/lib/validations/pet";

type RecordType = "VACCINE" | "DNA" | "VET_VISIT" | "CERTIFICATE";

const TYPE_OPTIONS: { value: RecordType; label: string; copy: string }[] = [
  { value: "VACCINE", label: "Vaccine", copy: "Rabies, distemper, etc." },
  { value: "DNA", label: "DNA", copy: "Embark, Wisdom Panel, breed test." },
  { value: "VET_VISIT", label: "Vet visit", copy: "Checkup, blood work, exam." },
  { value: "CERTIFICATE", label: "Certificate", copy: "Kennel club, championship." },
];

export function NewHealthRecordForm({
  petId,
  petName,
}: {
  petId: string;
  petName: string;
}) {
  const router = useRouter();

  const [type, setType] = useState<RecordType>("VACCINE");
  const [title, setTitle] = useState("");
  const [recordDate, setRecordDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [fileUrl, setFileUrl] = useState("");
  const [notes, setNotes] = useState("");

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setServerError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setServerError(data.error ?? "Upload failed");
        return;
      }
      const { url } = await res.json();
      setFileUrl(url);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    const payload = {
      type,
      title,
      recordDate,
      fileUrl: fileUrl || undefined,
      notes: notes || undefined,
    };

    const parsed = createHealthRecordSchema.safeParse(payload);
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      const errs: Record<string, string> = {};
      Object.entries(flat).forEach(([k, v]) => {
        if (v?.[0]) errs[k] = v[0];
      });
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    const res = await fetch(`/api/pets/${petId}/health`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setSubmitting(false);
      setServerError(data.error ?? "Could not save record");
      return;
    }

    router.push(`/dashboard/pets/${petId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-6" noValidate>
      <div>
        <Label>Type</Label>
        <div className="grid grid-cols-2 gap-2">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setType(opt.value)}
              data-selected={type === opt.value}
              aria-pressed={type === opt.value}
              className={`flex flex-col items-start gap-1 rounded-card border-2 px-4 py-3 text-left transition-colors ${
                type === opt.value
                  ? "border-terracotta bg-terracotta/5"
                  : "border-sand bg-cream hover:border-terracotta-light"
              }`}
            >
              <span className="font-medium text-dark">{opt.label}</span>
              <span className="text-xs text-dark-muted leading-snug">{opt.copy}</span>
            </button>
          ))}
        </div>
      </div>

      <Field label="Title" error={errors.title}>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={titlePlaceholderFor(type)}
        />
      </Field>

      <Field label="Date" error={errors.recordDate}>
        <Input
          type="date"
          value={recordDate}
          onChange={(e) => setRecordDate(e.target.value)}
          max={today}
        />
      </Field>

      <div>
        <Label>Document (optional)</Label>
        {fileUrl ? (
          <div className="flex items-center justify-between gap-3 rounded-card border border-sand bg-cream px-4 py-3">
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="truncate text-sm text-terracotta hover:underline"
            >
              {fileUrl}
            </a>
            <button
              type="button"
              onClick={() => setFileUrl("")}
              className="text-sm font-medium text-dark-muted hover:text-terracotta"
            >
              Remove
            </button>
          </div>
        ) : (
          <label className="block">
            <span className="btn-secondary cursor-pointer w-full">
              {uploading ? "Uploading…" : "Upload PDF or image"}
            </span>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFile}
              disabled={uploading}
              className="hidden"
            />
          </label>
        )}
        <p className="mt-2 text-xs text-dark-muted">
          PDFs and images up to 8 MB. Documents are stored privately.
        </p>
      </div>

      <Field label="Notes (optional)" error={errors.notes}>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Anything else worth recording…"
          className="w-full px-4 py-2.5 rounded-card border border-sand bg-cream focus:outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20 resize-none"
        />
      </Field>

      <div className="rounded-card bg-cream border border-sand px-4 py-3 text-sm text-dark-muted leading-relaxed">
        <strong className="text-dark">Heads up.</strong> New records start as
        <span className="font-italic-serif"> self-reported</span> until a vet
        verifies them. Verified records carry a sage check on {petName}'s profile.
      </div>

      {serverError && (
        <p className="text-sm text-terracotta text-center">{serverError}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sand pt-6">
        <button
          type="button"
          onClick={() => router.push(`/dashboard/pets/${petId}`)}
          className="text-sm font-medium text-dark-muted hover:text-terracotta px-3 py-2"
        >
          Cancel
        </button>
        <button type="submit" disabled={submitting || uploading} className="btn-primary">
          {submitting ? "Saving…" : "Add record"}
        </button>
      </div>
    </form>
  );
}

function titlePlaceholderFor(t: RecordType): string {
  switch (t) {
    case "VACCINE":
      return "e.g. Rabies (3-year)";
    case "DNA":
      return "e.g. Embark breed + health panel";
    case "VET_VISIT":
      return "e.g. Annual wellness exam";
    case "CERTIFICATE":
      return "e.g. AKC Conformation Championship";
  }
}

/* ─── Primitives ───────────────────────────────────────────────────────── */

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-dark mb-2">{children}</label>;
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {error && <p className="mt-1 text-sm text-terracotta">{error}</p>}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={
        "w-full px-4 py-2.5 rounded-pill border border-sand bg-cream focus:outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20 " +
        (props.className ?? "")
      }
    />
  );
}
