"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";

import { verifyRequestSchema } from "@/lib/validations/verification";
import { useToast } from "@/components/toast/ToastProvider";

const MAX_FILES = 5;
const ALLOWED = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
];

interface SubmissionFormProps {
  /** Pre-fill the description (used when reapplying). */
  initialDescription?: string;
}

export function SubmissionForm({ initialDescription = "" }: SubmissionFormProps) {
  const router = useRouter();
  const toast = useToast();

  const [documents, setDocuments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [description, setDescription] = useState(initialDescription);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ documents?: string; description?: string; root?: string }>({});

  async function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const remaining = MAX_FILES - documents.length;
    const toUpload = files.slice(0, remaining);
    if (toUpload.length === 0) return;

    setUploading(true);
    setErrors((prev) => ({ ...prev, documents: undefined }));

    const uploaded: string[] = [];
    for (const file of toUpload) {
      if (!ALLOWED.includes(file.type)) continue;
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (res.ok) {
        const { url } = await res.json();
        uploaded.push(url);
      }
    }
    if (uploaded.length > 0) {
      setDocuments((d) => [...d, ...uploaded]);
    } else {
      toast.error("Couldn't upload", "Try a PDF, JPG, PNG or HEIC under 8 MB.");
    }
    setUploading(false);
    e.target.value = "";
  }

  function removeDoc(idx: number) {
    setDocuments((d) => d.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});

    const parsed = verifyRequestSchema.safeParse({
      documents,
      programDescription: description,
    });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setErrors({
        documents: flat.documents?.[0],
        description: flat.programDescription?.[0],
      });
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/verify/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrors({ root: data.error ?? "Could not submit application" });
      toast.error("Submission failed", data.error);
      return;
    }
    toast.success(
      "Application submitted",
      "We'll review and email you within 72 hours."
    );
    router.refresh();
  }

  const remaining = MAX_FILES - documents.length;

  return (
    <form onSubmit={handleSubmit} className="card space-y-8" noValidate>
      <div>
        <label className="block">
          <p
            className="leading-tight text-dark"
            style={{
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontWeight: 700,
              fontSize: "1.25rem",
            }}
          >
            Supporting documents
          </p>
          <p className="mt-1 text-sm text-dark-muted">
            Kennel club registration, AKC papers, vet references, breeder
            certifications — anything that shows you're the real deal. PDF, JPG,
            PNG, or HEIC. Up to {MAX_FILES} files.
          </p>
        </label>

        {documents.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {documents.map((url, idx) => (
              <DocThumb
                key={url}
                url={url}
                onRemove={() => removeDoc(idx)}
              />
            ))}
          </div>
        )}

        {remaining > 0 && (
          <label className="mt-4 block">
            <span className="btn-secondary cursor-pointer w-full">
              {uploading
                ? "Uploading…"
                : documents.length === 0
                  ? "Upload documents"
                  : `Add more (${remaining} remaining)`}
            </span>
            <input
              type="file"
              accept="image/*,application/pdf"
              multiple
              onChange={handleFiles}
              disabled={uploading}
              className="hidden"
            />
          </label>
        )}

        {errors.documents && (
          <p className="mt-2 text-sm text-terracotta">{errors.documents}</p>
        )}
      </div>

      <div>
        <label htmlFor="program-description" className="block">
          <p
            className="leading-tight text-dark"
            style={{
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontWeight: 700,
              fontSize: "1.25rem",
            }}
          >
            Tell us about your breeding program
          </p>
          <p className="mt-1 text-sm text-dark-muted">
            How long you've been breeding, what breeds you specialize in, how
            you think about health and welfare. At least 50 characters.
          </p>
        </label>
        <textarea
          id="program-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          placeholder="We've been raising Golden Retrievers for 8 years, focused on hip dysplasia screening and temperament testing…"
          className="mt-4 w-full rounded-2xl border border-sand bg-cream px-4 py-3 text-base text-dark outline-none transition-[border-color,background] duration-150 focus:border-terracotta focus:bg-surface focus:ring-2 focus:ring-terracotta/15"
        />
        <div className="mt-1.5 flex items-center justify-between text-xs text-dark-muted">
          <span>{description.length} / 4000</span>
          {description.length > 0 && description.length < 50 && (
            <span className="text-terracotta">
              {50 - description.length} more
            </span>
          )}
        </div>
        {errors.description && (
          <p className="mt-1 text-sm text-terracotta">{errors.description}</p>
        )}
      </div>

      {errors.root && (
        <p className="rounded-xl bg-terracotta/10 px-4 py-2.5 text-center text-sm text-terracotta">
          {errors.root}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sand pt-6">
        <p className="text-xs text-dark-muted">
          Reviews complete within 72 hours.
        </p>
        <button
          type="submit"
          disabled={submitting || uploading}
          className="btn-primary"
        >
          {submitting ? "Submitting…" : "Submit application"}
        </button>
      </div>
    </form>
  );
}

/* ─── Doc thumbnail ──────────────────────────────────────────────────── */

function DocThumb({ url, onRemove }: { url: string; onRemove: () => void }) {
  const isPdf = /\.pdf(\?.*)?$/i.test(url);
  return (
    <div className="relative aspect-square overflow-hidden rounded-card border border-sand bg-cream">
      {isPdf ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-center text-dark-muted"
        >
          <FileGlyph className="h-7 w-7 text-terracotta" />
          <span className="text-[10px] font-semibold uppercase tracking-wider">PDF</span>
          <span className="truncate text-[10px]">View</span>
        </a>
      ) : (
        <a href={url} target="_blank" rel="noreferrer" className="block h-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="h-full w-full object-cover" />
        </a>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove document"
        className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-dark text-xs text-white hover:bg-terracotta"
      >
        ×
      </button>
    </div>
  );
}

function FileGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
