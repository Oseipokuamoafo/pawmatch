"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/toast/ToastProvider";

interface DemoSeedButtonProps {
  /** Variant controls the button style; logic is identical. */
  variant?: "primary" | "secondary" | "link";
  /** Override the default label. */
  label?: string;
  /** When the user isn't signed in, where to send them. After they
   *  return signed in, the button is rendered again and the click
   *  takes them through the seed flow. */
  signedIn: boolean;
  className?: string;
}

/**
 * One-click button that creates Luna + Atlas on the current user and
 * redirects to /predict so they land on the Punnett output in a single
 * action. Idempotent — the API returns existing pet ids when they're
 * already seeded, so the button always lands the user on the same page
 * no matter how many times they click.
 *
 * For not-signed-in users, the click routes through /register?demo=1
 * — the register page picks up the query and re-fires the demo seed
 *   after sign-up. (Wiring on the register page is a follow-up; this
 *   button just delegates.)
 */
export function DemoSeedButton({
  variant = "primary",
  label = "Try a live demo",
  signedIn,
  className = "",
}: DemoSeedButtonProps) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!signedIn) {
      router.push("/register?demo=1");
      return;
    }

    setLoading(true);
    try {
      const r = await fetch("/api/demo/seed", { method: "POST" });
      const data = (await r.json()) as {
        predictUrl?: string;
        freshlySeeded?: boolean;
        error?: string;
      };
      if (!r.ok || !data.predictUrl) {
        throw new Error(data.error ?? "Couldn't seed the demo");
      }
      if (data.freshlySeeded) {
        toast.success(
          "Demo loaded — Luna & Atlas added to your pets",
          "Heading to the litter prediction…",
        );
      }
      router.push(data.predictUrl);
    } catch (err) {
      toast.error(
        "Couldn't load the demo",
        (err as Error).message ?? "Try again in a moment",
      );
      setLoading(false);
    }
  }

  const baseClass =
    variant === "primary"
      ? "btn-primary"
      : variant === "secondary"
        ? "btn-secondary"
        : "inline-flex items-center gap-1 text-sm font-semibold text-terracotta hover:text-[#B03E22]";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`${baseClass} ${className} disabled:opacity-60`}
    >
      <span className="inline-flex items-center gap-2">
        <span aria-hidden="true">🧬</span>
        <span>{loading ? "Loading demo…" : label}</span>
        {variant === "link" && <span aria-hidden="true">→</span>}
      </span>
    </button>
  );
}
