"use client";

import { useMemo, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

import { updatePetSchema } from "@/lib/validations/pet";
import { DOG_BREEDS, CAT_BREEDS } from "@/lib/data/breeds";

type Species = "DOG" | "CAT";
type Sex = "MALE" | "FEMALE";

interface PetSnapshot {
  id: string;
  name: string;
  species: Species;
  breed: string;
  sex: Sex;
  dateOfBirth: string; // yyyy-mm-dd
  color: string;
  weight: number | null;
  bio: string;
  isActive: boolean;
}

export function EditPetForm({ pet }: { pet: PetSnapshot }) {
  const router = useRouter();

  const [name, setName] = useState(pet.name);
  const [species, setSpecies] = useState<Species>(pet.species);
  const [breed, setBreed] = useState(pet.breed);
  const [sex, setSex] = useState<Sex>(pet.sex);
  const [dateOfBirth, setDateOfBirth] = useState(pet.dateOfBirth);
  const [color, setColor] = useState(pet.color);
  const [weight, setWeight] = useState(pet.weight !== null ? String(pet.weight) : "");
  const [bio, setBio] = useState(pet.bio);
  const [isActive, setIsActive] = useState(pet.isActive);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const breedOptions = species === "DOG" ? DOG_BREEDS : CAT_BREEDS;
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    const payload = {
      name,
      species,
      breed,
      sex,
      dateOfBirth,
      color: color || undefined,
      weight: weight ? Number(weight) : null,
      bio: bio || undefined,
      isActive,
    };

    const parsed = updatePetSchema.safeParse(payload);
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
    const res = await fetch(`/api/pets/${pet.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setSubmitting(false);
      setServerError(data.error ?? "Could not save changes");
      return;
    }

    router.push(`/dashboard/pets/${pet.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-6" noValidate>
      <Field label="Name" error={errors.name}>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>

      <div>
        <Label>Species</Label>
        <div className="grid grid-cols-2 gap-3">
          <SpeciesButton
            selected={species === "DOG"}
            onClick={() => setSpecies("DOG")}
            emoji="🐕"
            label="Dog"
          />
          <SpeciesButton
            selected={species === "CAT"}
            onClick={() => setSpecies("CAT")}
            emoji="🐈"
            label="Cat"
          />
        </div>
      </div>

      <Field label="Breed" error={errors.breed}>
        <select
          value={breed}
          onChange={(e) => setBreed(e.target.value)}
          className="w-full px-4 py-2.5 rounded-pill border border-sand bg-cream focus:outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20"
        >
          <option value="">Select a breed…</option>
          {breedOptions.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </Field>

      <div>
        <Label>Sex</Label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSex("MALE")}
            data-selected={sex === "MALE"}
            className="chip flex-1 justify-center py-2.5"
          >
            ♂ Male
          </button>
          <button
            type="button"
            onClick={() => setSex("FEMALE")}
            data-selected={sex === "FEMALE"}
            className="chip flex-1 justify-center py-2.5"
          >
            ♀ Female
          </button>
        </div>
      </div>

      <Field label="Date of Birth" error={errors.dateOfBirth}>
        <Input
          type="date"
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
          max={today}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Color" error={errors.color}>
          <Input
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="Black & white"
          />
        </Field>
        <Field label="Weight (kg)" error={errors.weight}>
          <Input
            type="number"
            step="0.1"
            min="0"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="12.5"
          />
        </Field>
      </div>

      <Field label="Bio" error={errors.bio}>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          placeholder="Tell us about your pet…"
          className="w-full px-4 py-2.5 rounded-card border border-sand bg-cream focus:outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20 resize-none"
        />
      </Field>

      <div className="rounded-card border border-sand p-4 flex items-center justify-between gap-4">
        <div>
          <p className="font-serif text-lg font-bold text-dark">Active profile</p>
          <p className="text-sm text-dark-muted leading-snug">
            When inactive, this pet is hidden from matchmaking.
          </p>
        </div>
        <Toggle checked={isActive} onChange={setIsActive} label="Active" />
      </div>

      {serverError && (
        <p className="text-sm text-terracotta text-center">{serverError}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sand pt-6">
        <button
          type="button"
          onClick={() => router.push(`/dashboard/pets/${pet.id}`)}
          className="text-sm font-medium text-dark-muted hover:text-terracotta px-3 py-2"
        >
          Cancel
        </button>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
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

function SpeciesButton({
  selected,
  onClick,
  emoji,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  emoji: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-3 rounded-card border-2 px-5 py-4 transition-colors ${
        selected
          ? "border-terracotta bg-terracotta/5"
          : "border-sand bg-cream hover:border-terracotta-light"
      }`}
    >
      <span className="text-2xl">{emoji}</span>
      <span className="font-medium text-dark">{label}</span>
    </button>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-terracotta" : "bg-sand"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
