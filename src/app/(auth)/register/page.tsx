"use client";

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

import { signUpSchema } from "@/lib/validations/auth";
import { FloatingInput } from "@/components/forms/FloatingInput";

type Role = "OWNER" | "BREEDER" | "VET";
type FieldErrors = Partial<
  Record<
    | "name"
    | "email"
    | "password"
    | "role"
    | "licenseNumber"
    | "licenseState"
    | "practiceName"
    | "practiceAddress"
    | "practicePhone"
    | "root",
    string
  >
>;

export default function SignUpPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("OWNER");
  const [vetMode, setVetMode] = useState(false);
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseState, setLicenseState] = useState("");
  const [practiceName, setPracticeName] = useState("");
  const [practiceAddress, setPracticeAddress] = useState("");
  const [practicePhone, setPracticePhone] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});

    // Vet license fields ship when EITHER:
    //   1. user picked role=VET (mandatory in that path), OR
    //   2. user picked OWNER/BREEDER + ticked the optional vet add-on.
    const includeVetBlock = role === "VET" || vetMode;
    const payload = {
      name,
      email,
      password,
      role,
      ...(includeVetBlock
        ? {
            vetApplication: {
              licenseNumber,
              licenseState,
              practiceName,
              practiceAddress,
              practicePhone,
            },
          }
        : {}),
    };

    const parsed = signUpSchema.safeParse(payload);
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      const vetErrs =
        (parsed.error.flatten().fieldErrors as Record<string, string[] | undefined>);
      // vetApplication.<field> arrives flattened under the parent key by Zod.
      // Pull subfield errors from the issue list when present.
      const vetIssue = parsed.error.issues.filter((i) => i.path[0] === "vetApplication");
      const vetField = (k: string) =>
        vetIssue.find((i) => i.path[1] === k)?.message;
      setErrors({
        name: flat.name?.[0],
        email: flat.email?.[0],
        password: flat.password?.[0],
        role: flat.role?.[0],
        licenseNumber: vetField("licenseNumber"),
        licenseState: vetField("licenseState"),
        practiceName: vetField("practiceName"),
        practiceAddress: vetField("practiceAddress"),
        practicePhone: vetField("practicePhone"),
      });
      void vetErrs;
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setSubmitting(false);
      setErrors({ root: data.error ?? "Could not create account" });
      return;
    }

    const signInResult = await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
    setSubmitting(false);

    if (signInResult?.error) {
      router.push("/login");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-[calc(100vh-72px)] items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <div className="rounded-3xl border border-sand/60 bg-surface/95 p-8 shadow-[0_30px_60px_-30px_rgba(28,16,8,0.18)] backdrop-blur">
          <p
            className="mb-3"
            style={{
              fontSize: 11,
              letterSpacing: "0.22em",
              fontWeight: 600,
              textTransform: "uppercase",
              color: "#C94B2A",
            }}
          >
            Join the registry
          </p>

          <h1
            className="leading-[1.05] tracking-tight"
            style={{
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontWeight: 900,
              fontSize: "2.25rem",
              color: "#1C1008",
            }}
          >
            Create your account.
          </h1>
          <p className="mt-3 text-sm text-dark-muted">
            Find responsible, verified matches for your pet.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
            <FloatingInput
              label="Your name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
            />
            <FloatingInput
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
            />
            <FloatingInput
              label="Password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
            />

            <div>
              <p
                className="mb-2"
                style={{
                  fontSize: 11,
                  letterSpacing: "0.05em",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  color: "#3D2A1A",
                }}
              >
                I am a…
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <RoleCard
                  selected={role === "OWNER"}
                  onClick={() => setRole("OWNER")}
                  emoji="🐾"
                  label="Pet Owner"
                  copy="A loved pet at home"
                />
                <RoleCard
                  selected={role === "BREEDER"}
                  onClick={() => setRole("BREEDER")}
                  emoji="🏡"
                  label="Breeder"
                  copy="Responsible breeding program"
                />
                <RoleCard
                  selected={role === "VET"}
                  onClick={() => setRole("VET")}
                  emoji="🩺"
                  label="Veterinarian"
                  copy="Verify health records"
                />
              </div>
              {errors.role && (
                <p className="mt-1.5 text-sm text-terracotta">{errors.role}</p>
              )}
            </div>

            {/* ── Vet application ────────────────────────────────────────
                Two paths into the license fields:
                  - role=VET   → fields are required, panel always expanded
                  - OWNER/BREEDER + checkbox → optional add-on (vet who also
                    has pets or breeds)                                   */}
            <div className="rounded-2xl border border-sand bg-cream/40 p-4">
              {role === "VET" ? (
                <div>
                  <p className="text-sm font-semibold text-dark">
                    🩺 Veterinary license details
                  </p>
                  <p className="mt-0.5 text-xs text-dark-muted leading-relaxed">
                    We cross-reference your license against your state board
                    and email you within 24 hours. No pets required to sign up.
                  </p>
                </div>
              ) : (
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={vetMode}
                    onChange={(e) => setVetMode(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-terracotta"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-dark">
                      🩺 I&apos;m also a licensed veterinarian
                    </span>
                    <span className="mt-0.5 block text-xs text-dark-muted leading-relaxed">
                      Apply to co-sign health records on PawMatch alongside
                      your {role === "BREEDER" ? "breeder" : "owner"} profile.
                    </span>
                  </span>
                </label>
              )}

              {(role === "VET" || vetMode) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="mt-4 space-y-3 overflow-hidden"
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FloatingInput
                      label="License number"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      error={errors.licenseNumber}
                    />
                    <FloatingInput
                      label="Issuing state / region"
                      value={licenseState}
                      onChange={(e) => setLicenseState(e.target.value)}
                      error={errors.licenseState}
                    />
                  </div>
                  <FloatingInput
                    label="Practice name"
                    value={practiceName}
                    onChange={(e) => setPracticeName(e.target.value)}
                    error={errors.practiceName}
                  />
                  <FloatingInput
                    label="Practice address"
                    value={practiceAddress}
                    onChange={(e) => setPracticeAddress(e.target.value)}
                    error={errors.practiceAddress}
                  />
                  <FloatingInput
                    label="Practice phone"
                    type="tel"
                    value={practicePhone}
                    onChange={(e) => setPracticePhone(e.target.value)}
                    error={errors.practicePhone}
                  />
                </motion.div>
              )}
            </div>

            {errors.root && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-terracotta/10 px-4 py-2.5 text-center text-sm text-terracotta"
              >
                {errors.root}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full !py-3"
            >
              {submitting ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-dark-muted">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-terracotta transition-colors hover:text-[#B03E22]"
            >
              Sign in →
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-dark-muted">
          We never share your data. Every pet profile requires live photo verification.
        </p>
      </motion.div>
    </div>
  );
}

function RoleCard({
  selected,
  onClick,
  emoji,
  label,
  copy,
}: {
  selected: boolean;
  onClick: () => void;
  emoji: string;
  label: string;
  copy: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="flex flex-col items-start gap-1 rounded-2xl border-2 px-4 py-3 text-left transition-[border-color,background,transform] duration-150"
      style={{
        borderColor: selected ? "#C94B2A" : "#E8D5B7",
        background: selected ? "rgba(201,75,42, 0.06)" : "transparent",
      }}
    >
      <span className="text-2xl leading-none">{emoji}</span>
      <span className="font-semibold text-dark">{label}</span>
      <span className="text-xs text-dark-muted leading-snug">{copy}</span>
    </button>
  );
}
