"use client";

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

import { signUpSchema } from "@/lib/validations/auth";
import { FloatingInput } from "@/components/forms/FloatingInput";

type Role = "OWNER" | "BREEDER";
type FieldErrors = Partial<Record<"name" | "email" | "password" | "role" | "root", string>>;

export default function SignUpPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("OWNER");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});

    const parsed = signUpSchema.safeParse({ name, email, password, role });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setErrors({
        name: flat.name?.[0],
        email: flat.email?.[0],
        password: flat.password?.[0],
        role: flat.role?.[0],
      });
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
              <div className="grid grid-cols-2 gap-2">
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
              </div>
              {errors.role && (
                <p className="mt-1.5 text-sm text-terracotta">{errors.role}</p>
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
