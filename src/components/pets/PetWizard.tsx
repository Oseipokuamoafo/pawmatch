"use client";

import { useState, ChangeEvent } from "react";

import {
  petStep1Schema,
  petStep3Schema,
  createPetSchema,
} from "@/lib/validations/pet";
import { DOG_BREEDS, CAT_BREEDS, COMMON_TRAITS } from "@/lib/data/breeds";
import { LivePhotoCapture } from "@/components/pets/LivePhotoCapture";

type Species = "DOG" | "CAT";
type Sex = "MALE" | "FEMALE";
type Photo = { url: string; isPrimary: boolean };

const TOTAL_STEPS = 3;

interface PetWizardProps {
  /** Fires after a successful create with the new pet record. */
  onSuccess?: (pet: { id: string; name: string }) => void;
  /** Optional cancel button — renders if provided. */
  onCancel?: () => void;
  /** Show the framed header (defaults true; pass false for modal contexts). */
  showHeader?: boolean;
}

/**
 * 3-step pet creation flow — basic info, live photo + gallery, breeding goals.
 * Reusable as a full page or inside a modal.
 */
export function PetWizard({ onSuccess, onCancel, showHeader = true }: PetWizardProps) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Step 1
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<Species>("DOG");
  const [breed, setBreed] = useState("");
  const [sex, setSex] = useState<Sex>("MALE");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [color, setColor] = useState("");
  const [weight, setWeight] = useState("");
  const [bio, setBio] = useState("");

  // Step 2
  const [livePhotoUrl, setLivePhotoUrl] = useState<string>("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);

  // Step 3
  const [desiredTraits, setDesiredTraits] = useState<string[]>([]);
  const [preferredBreeds, setPreferredBreeds] = useState<string[]>([]);
  const [maxCOI, setMaxCOI] = useState(10);
  const [goalNotes, setGoalNotes] = useState("");

  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});

  const breedOptions = species === "DOG" ? DOG_BREEDS : CAT_BREEDS;

  function validateStep1() {
    const result = petStep1Schema.safeParse({
      name,
      species,
      breed,
      sex,
      dateOfBirth,
      color: color || undefined,
      weight: weight ? Number(weight) : undefined,
      bio: bio || undefined,
    });
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      const errs: Record<string, string> = {};
      Object.entries(flat).forEach(([k, v]) => {
        if (v?.[0]) errs[k] = v[0];
      });
      setStepErrors(errs);
      return false;
    }
    setStepErrors({});
    return true;
  }

  function validateStep3() {
    const result = petStep3Schema.safeParse({
      desiredTraits,
      preferredBreeds,
      maxCOI,
      goalNotes: goalNotes || undefined,
    });
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      const errs: Record<string, string> = {};
      Object.entries(flat).forEach(([k, v]) => {
        if (v?.[0]) errs[k] = v[0];
      });
      setStepErrors(errs);
      return false;
    }
    setStepErrors({});
    return true;
  }

  function next() {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !livePhotoUrl) {
      setStepErrors({ livePhotoUrl: "A live verification photo is required to continue." });
      return;
    }
    if (step === 3) return submit();
    setStepErrors({});
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  }

  function back() {
    setStep((s) => Math.max(1, s - 1));
    setStepErrors({});
  }

  async function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const remaining = 6 - photos.length;
    const toUpload = files.slice(0, remaining);
    if (toUpload.length === 0) return;

    setUploading(true);
    const uploaded: Photo[] = [];
    for (const file of toUpload) {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (res.ok) {
        const { url } = await res.json();
        uploaded.push({ url, isPrimary: false });
      }
    }
    setPhotos((prev) => {
      const merged = [...prev, ...uploaded];
      if (!merged.some((p) => p.isPrimary) && merged.length > 0) merged[0].isPrimary = true;
      return merged;
    });
    setUploading(false);
    e.target.value = "";
  }

  function setPrimary(idx: number) {
    setPhotos((prev) => prev.map((p, i) => ({ ...p, isPrimary: i === idx })));
  }

  function removePhoto(idx: number) {
    setPhotos((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (!next.some((p) => p.isPrimary) && next.length > 0) next[0].isPrimary = true;
      return next;
    });
  }

  function toggleTrait(trait: string) {
    setDesiredTraits((prev) =>
      prev.includes(trait) ? prev.filter((t) => t !== trait) : [...prev, trait]
    );
  }

  function togglePreferredBreed(breedName: string) {
    setPreferredBreeds((prev) =>
      prev.includes(breedName) ? prev.filter((b) => b !== breedName) : [...prev, breedName]
    );
  }

  async function submit() {
    if (!validateStep3()) return;
    setSubmitting(true);
    setServerError(null);

    const payload = {
      name,
      species,
      breed,
      sex,
      dateOfBirth,
      color: color || undefined,
      weight: weight ? Number(weight) : undefined,
      bio: bio || undefined,
      livePhotoUrl,
      photos,
      desiredTraits,
      preferredBreeds,
      maxCOI,
      goalNotes: goalNotes || undefined,
    };

    const finalCheck = createPetSchema.safeParse(payload);
    if (!finalCheck.success) {
      setSubmitting(false);
      setServerError("Please complete all required fields.");
      return;
    }

    const res = await fetch("/api/pets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setServerError(data.error ?? "Could not create pet");
      setSubmitting(false);
      return;
    }

    const { pet } = (await res.json()) as { pet: { id: string; name: string } };
    setSubmitting(false);
    onSuccess?.(pet);
  }

  return (
    <div className={showHeader ? "mx-auto max-w-2xl px-6 py-12" : ""}>
      {showHeader && (
        <>
          <h1 className="font-serif text-3xl font-bold text-dark mb-1">Add a Pet</h1>
          <p className="text-dark-muted mb-8">Step {step} of {TOTAL_STEPS}</p>
        </>
      )}

      <ProgressBar step={step} />

      <div className="card mt-6">
        {step === 1 && (
          <Step1
            name={name} setName={setName}
            species={species} setSpecies={setSpecies}
            breed={breed} setBreed={setBreed}
            sex={sex} setSex={setSex}
            dateOfBirth={dateOfBirth} setDateOfBirth={setDateOfBirth}
            color={color} setColor={setColor}
            weight={weight} setWeight={setWeight}
            bio={bio} setBio={setBio}
            breedOptions={breedOptions}
            errors={stepErrors}
          />
        )}

        {step === 2 && (
          <Step2
            livePhotoUrl={livePhotoUrl}
            onLiveCaptured={setLivePhotoUrl}
            onResetLive={() => setLivePhotoUrl("")}
            photos={photos}
            uploading={uploading}
            onUpload={handleFiles}
            onSetPrimary={setPrimary}
            onRemove={removePhoto}
            error={stepErrors.livePhotoUrl}
          />
        )}

        {step === 3 && (
          <Step3
            desiredTraits={desiredTraits}
            toggleTrait={toggleTrait}
            preferredBreeds={preferredBreeds}
            togglePreferredBreed={togglePreferredBreed}
            breedOptions={breedOptions}
            maxCOI={maxCOI}
            setMaxCOI={setMaxCOI}
            goalNotes={goalNotes}
            setGoalNotes={setGoalNotes}
          />
        )}

        {serverError && (
          <p className="mt-4 text-sm text-terracotta text-center">{serverError}</p>
        )}

        <div className="mt-8 flex items-center justify-between gap-4">
          {step > 1 ? (
            <button type="button" onClick={back} className="btn-secondary">
              Back
            </button>
          ) : onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full border border-sand bg-transparent px-5 py-2 text-sm font-medium text-dark-muted transition-colors hover:border-terracotta/40 hover:text-terracotta"
            >
              Cancel
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={next}
            disabled={submitting || uploading}
            className="btn-primary"
          >
            {submitting ? "Creating…" : step === TOTAL_STEPS ? "Create Pet" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  const labels = ["Basic Info", "Photos", "Breeding Goals"];
  return (
    <div className="flex items-center gap-2">
      {labels.map((label, i) => {
        const n = i + 1;
        const active = n <= step;
        return (
          <div key={n} className="flex-1">
            <div
              className={`h-1.5 rounded-pill transition-colors ${
                active ? "bg-terracotta" : "bg-sand"
              }`}
            />
            <p
              className={`mt-2 text-xs font-medium ${
                active ? "text-terracotta" : "text-dark-muted"
              }`}
            >
              {n}. {label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1 ───────────────────────────────────────────────────────────────────

interface Step1Props {
  name: string; setName: (v: string) => void;
  species: Species; setSpecies: (v: Species) => void;
  breed: string; setBreed: (v: string) => void;
  sex: Sex; setSex: (v: Sex) => void;
  dateOfBirth: string; setDateOfBirth: (v: string) => void;
  color: string; setColor: (v: string) => void;
  weight: string; setWeight: (v: string) => void;
  bio: string; setBio: (v: string) => void;
  breedOptions: string[];
  errors: Record<string, string>;
}

function Step1(p: Step1Props) {
  return (
    <div className="space-y-5">
      <div>
        <Label>Species</Label>
        <div className="grid grid-cols-2 gap-3">
          <SpeciesButton selected={p.species === "DOG"} onClick={() => p.setSpecies("DOG")} emoji="🐕" label="Dog" />
          <SpeciesButton selected={p.species === "CAT"} onClick={() => p.setSpecies("CAT")} emoji="🐈" label="Cat" />
        </div>
      </div>

      <Field label="Name" error={p.errors.name}>
        <Input value={p.name} onChange={(e) => p.setName(e.target.value)} placeholder="Luna" />
      </Field>

      <Field label="Breed" error={p.errors.breed}>
        <select
          value={p.breed}
          onChange={(e) => p.setBreed(e.target.value)}
          className="w-full px-4 py-2.5 rounded-pill border border-sand bg-cream focus:outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20"
        >
          <option value="">Select a breed…</option>
          {p.breedOptions.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </Field>

      <div>
        <Label>Sex</Label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => p.setSex("MALE")}
            data-selected={p.sex === "MALE"}
            className="chip flex-1 justify-center py-2.5"
          >
            ♂ Male
          </button>
          <button
            type="button"
            onClick={() => p.setSex("FEMALE")}
            data-selected={p.sex === "FEMALE"}
            className="chip flex-1 justify-center py-2.5"
          >
            ♀ Female
          </button>
        </div>
      </div>

      <Field label="Date of Birth" error={p.errors.dateOfBirth}>
        <Input
          type="date"
          value={p.dateOfBirth}
          onChange={(e) => p.setDateOfBirth(e.target.value)}
          max={new Date().toISOString().split("T")[0]}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Color (optional)" error={p.errors.color}>
          <Input value={p.color} onChange={(e) => p.setColor(e.target.value)} placeholder="Black & white" />
        </Field>
        <Field label="Weight kg (optional)" error={p.errors.weight}>
          <Input
            type="number"
            step="0.1"
            min="0"
            value={p.weight}
            onChange={(e) => p.setWeight(e.target.value)}
            placeholder="12.5"
          />
        </Field>
      </div>

      <Field label="Bio (optional)" error={p.errors.bio}>
        <textarea
          value={p.bio}
          onChange={(e) => p.setBio(e.target.value)}
          rows={3}
          placeholder="Tell us about your pet…"
          className="w-full px-4 py-2.5 rounded-card border border-sand bg-cream focus:outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20 resize-none"
        />
      </Field>
    </div>
  );
}

function SpeciesButton({ selected, onClick, emoji, label }: { selected: boolean; onClick: () => void; emoji: string; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-2 rounded-card border-2 p-6 transition-colors ${
        selected ? "border-terracotta bg-terracotta/5" : "border-sand bg-cream hover:border-terracotta-light"
      }`}
    >
      <span className="text-4xl">{emoji}</span>
      <span className="font-medium text-dark">{label}</span>
    </button>
  );
}

// ─── Step 2 ───────────────────────────────────────────────────────────────────

interface Step2Props {
  livePhotoUrl: string;
  onLiveCaptured: (url: string) => void;
  onResetLive: () => void;
  photos: Photo[];
  uploading: boolean;
  onUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onSetPrimary: (idx: number) => void;
  onRemove: (idx: number) => void;
  error?: string;
}

function Step2(p: Step2Props) {
  const remaining = 6 - p.photos.length;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-serif text-xl font-bold text-dark mb-2">Live Verification</h2>
        <LivePhotoCapture
          existingUrl={p.livePhotoUrl || undefined}
          onCaptured={p.onLiveCaptured}
          onReset={p.onResetLive}
        />
        {p.error && (
          <p className="mt-3 text-sm text-terracotta text-center">{p.error}</p>
        )}
      </div>

      {!p.livePhotoUrl ? (
        <div className="rounded-card border-2 border-dashed border-sand p-6 text-center">
          <p className="text-sm text-dark-muted">
            Add gallery photos after completing live verification above.
          </p>
        </div>
      ) : (
        <div>
          <h2 className="font-serif text-xl font-bold text-dark mb-2">Gallery Photos</h2>
          <p className="text-sm text-dark-muted mb-6">
            Optional — upload up to 6 photos. Click a photo to set it as the primary one.
          </p>

          {p.photos.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              {p.photos.map((photo, idx) => (
                <div key={photo.url} className="relative">
                  <button
                    type="button"
                    onClick={() => p.onSetPrimary(idx)}
                    className={`block w-full aspect-square overflow-hidden rounded-card border-2 ${
                      photo.isPrimary ? "border-terracotta" : "border-sand"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt="" className="h-full w-full object-cover" />
                  </button>
                  {photo.isPrimary && (
                    <span className="absolute bottom-2 left-2 rounded-pill bg-terracotta px-2 py-0.5 text-xs font-medium text-white">
                      Primary
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => p.onRemove(idx)}
                    className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-dark text-white text-xs hover:bg-terracotta"
                    aria-label="Remove photo"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {remaining > 0 && (
            <label className="block">
              <span className="btn-secondary cursor-pointer w-full">
                {p.uploading ? "Uploading…" : `+ Add Photos (${remaining} remaining)`}
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={p.onUpload}
                disabled={p.uploading}
                className="hidden"
              />
            </label>
          )}

          {p.photos.length === 0 && (
            <p className="mt-6 text-center text-sm text-dark-muted">
              No gallery photos yet — this step is optional.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Step 3 ───────────────────────────────────────────────────────────────────

interface Step3Props {
  desiredTraits: string[];
  toggleTrait: (t: string) => void;
  preferredBreeds: string[];
  togglePreferredBreed: (b: string) => void;
  breedOptions: string[];
  maxCOI: number;
  setMaxCOI: (n: number) => void;
  goalNotes: string;
  setGoalNotes: (v: string) => void;
}

function Step3(p: Step3Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-xl font-bold text-dark mb-2">Breeding Goals</h2>
        <p className="text-sm text-dark-muted">
          Help us find responsible, compatible matches.
        </p>
      </div>

      <div>
        <Label>Desired Traits</Label>
        <div className="flex flex-wrap gap-2">
          {COMMON_TRAITS.map((trait) => (
            <button
              key={trait}
              type="button"
              onClick={() => p.toggleTrait(trait)}
              data-selected={p.desiredTraits.includes(trait)}
              className="chip"
            >
              {trait}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>Preferred Breeds</Label>
        <div className="flex flex-wrap gap-2">
          {p.breedOptions.map((breed) => (
            <button
              key={breed}
              type="button"
              onClick={() => p.togglePreferredBreed(breed)}
              data-selected={p.preferredBreeds.includes(breed)}
              className="chip"
            >
              {breed}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label className="mb-0">Maximum COI</Label>
          <span className="text-sm font-medium text-terracotta">{p.maxCOI}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="25"
          step="0.5"
          value={p.maxCOI}
          onChange={(e) => p.setMaxCOI(Number(e.target.value))}
          className="w-full accent-terracotta"
        />
        <p className="mt-1 text-xs text-dark-muted">
          Coefficient of Inbreeding — lower is healthier (5% or less is ideal).
        </p>
      </div>

      <Field label="Notes (optional)">
        <textarea
          value={p.goalNotes}
          onChange={(e) => p.setGoalNotes(e.target.value)}
          rows={3}
          placeholder="Any other preferences or considerations…"
          className="w-full px-4 py-2.5 rounded-card border border-sand bg-cream focus:outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20 resize-none"
        />
      </Field>
    </div>
  );
}

// ─── Form primitives ──────────────────────────────────────────────────────────

function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <label className={`block text-sm font-medium text-dark mb-2 ${className}`}>{children}</label>;
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
