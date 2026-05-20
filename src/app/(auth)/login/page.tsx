"use client";

import { Suspense, useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

import { signInSchema } from "@/lib/validations/auth";
import { FloatingInput } from "@/components/forms/FloatingInput";

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; root?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});

    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setErrors({
        email: flat.email?.[0],
        password: flat.password?.[0],
      });
      return;
    }

    setSubmitting(true);
    const result = await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
    setSubmitting(false);

    if (result?.error) {
      setErrors({ root: "Invalid email or password" });
      return;
    }
    router.push(callbackUrl);
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
            Welcome back
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
            Sign in to PawMatch.
          </h1>
          <p className="mt-3 text-sm text-dark-muted">
            Continue where you left off.
          </p>

          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl })}
            className="btn-secondary mt-7 w-full"
          >
            <GoogleGlyph className="mr-2 h-5 w-5" />
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-4 text-xs text-dark-muted">
            <span className="h-px flex-1 bg-sand" />
            <span>or use your email</span>
            <span className="h-px flex-1 bg-sand" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
            />

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
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-dark-muted">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-terracotta transition-colors hover:text-[#B03E22]"
            >
              Create one →
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-dark-muted">
          By signing in you agree to our community standards on responsible breeding.
        </p>
      </motion.div>
    </div>
  );
}

function GoogleGlyph({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
