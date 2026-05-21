"use client";

import { useState } from "react";
import Link from "next/link";

import { useToast } from "@/components/toast/ToastProvider";

interface BillingPanelProps {
  planLabel: string;
  active: boolean;
  sub: {
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
  hasStripeCustomer: boolean;
  justUpgraded: boolean;
}

export function BillingPanel({
  planLabel,
  active,
  sub,
  hasStripeCustomer,
  justUpgraded,
}: BillingPanelProps) {
  const toast = useToast();
  const [loading, setLoading] = useState<"checkout" | "portal" | null>(null);

  async function startCheckout() {
    setLoading("checkout");
    try {
      const r = await fetch("/api/billing/checkout", { method: "POST" });
      const data = (await r.json()) as { url?: string; error?: string };
      if (!r.ok || !data.url) throw new Error(data.error ?? "Checkout failed");
      window.location.href = data.url;
    } catch (err) {
      toast.error("Checkout failed", (err as Error).message);
      setLoading(null);
    }
  }

  async function openPortal() {
    setLoading("portal");
    try {
      const r = await fetch("/api/billing/portal", { method: "POST" });
      const data = (await r.json()) as { url?: string; error?: string };
      if (!r.ok || !data.url) throw new Error(data.error ?? "Portal failed");
      window.location.href = data.url;
    } catch (err) {
      toast.error("Couldn't open portal", (err as Error).message);
      setLoading(null);
    }
  }

  const periodEnd = sub
    ? new Date(sub.currentPeriodEnd).toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 md:py-14">
      {justUpgraded && (
        <div
          role="status"
          className="mb-6 rounded-2xl border border-[#1D9E75]/30 bg-[#1D9E75]/8 px-4 py-3 text-sm text-[#1D9E75] dark:text-[#7FBF88]"
        >
          🎉 You&apos;re on Pro+. Your subscription is being activated — it may
          take a few seconds for the badge to appear across the app.
        </div>
      )}

      <header className="mb-10">
        <p className="eyebrow">Account · billing</p>
        <h1
          className="mt-3 leading-[1.05] tracking-tight text-balance text-dark"
          style={{
            fontFamily: "var(--font-playfair, Georgia, serif)",
            fontWeight: 900,
            fontSize: "clamp(2.25rem, 5vw, 3rem)",
          }}
        >
          {active ? `You're on ${planLabel}.` : "You're on the Free plan."}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-dark-muted">
          {active
            ? "Manage your subscription, payment method, and invoices through the Stripe Customer Portal."
            : "Upgrade to Pro+ to unlock the Claude-powered breeding assistant and the rest of the breeder toolkit."}
        </p>
      </header>

      <article className="card p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p
              className="leading-tight text-dark"
              style={{
                fontFamily: "var(--font-playfair, Georgia, serif)",
                fontWeight: 800,
                fontSize: "1.5rem",
              }}
            >
              {active ? planLabel : "Free"}
            </p>
            {sub && (
              <p className="mt-1 text-sm text-dark-muted">
                {sub.cancelAtPeriodEnd
                  ? `Cancels on ${periodEnd}`
                  : sub.status === "ACTIVE" || sub.status === "TRIALING"
                    ? `Next billing on ${periodEnd}`
                    : `Status: ${sub.status.toLowerCase()}`}
              </p>
            )}
          </div>
          <StatusPill active={active} sub={sub} />
        </div>

        <hr className="my-6 border-sand" />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-dark-muted max-w-md">
            {active
              ? "Open the Stripe portal to update your card, download invoices, or cancel."
              : "Start a Pro+ subscription at $19.99 / month. Cancel anytime."}
          </p>
          {active ? (
            <button
              type="button"
              onClick={openPortal}
              disabled={loading !== null}
              className="btn-primary !px-5 !py-2.5 !text-sm disabled:opacity-60"
            >
              {loading === "portal" ? "Opening…" : "Manage subscription"}
            </button>
          ) : (
            <button
              type="button"
              onClick={startCheckout}
              disabled={loading !== null}
              className="btn-primary !px-5 !py-2.5 !text-sm disabled:opacity-60"
            >
              {loading === "checkout" ? "Redirecting…" : "Upgrade to Pro+"}
            </button>
          )}
        </div>
      </article>

      {!active && hasStripeCustomer && (
        <p className="mt-6 text-center text-[12px] text-dark-muted">
          You&apos;ve checked out before.{" "}
          <button
            type="button"
            onClick={openPortal}
            className="font-semibold text-terracotta hover:underline"
          >
            View past invoices →
          </button>
        </p>
      )}

      <p className="mt-10 text-center text-sm text-dark-muted">
        Want to compare plans?{" "}
        <Link
          href="/pricing"
          className="font-semibold text-terracotta hover:underline"
        >
          See pricing
        </Link>
      </p>
    </div>
  );
}

function StatusPill({
  active,
  sub,
}: {
  active: boolean;
  sub: BillingPanelProps["sub"];
}) {
  if (active && sub?.cancelAtPeriodEnd) {
    return (
      <span className="inline-flex items-center rounded-full bg-[#E89A2A]/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#B0731A] dark:text-[#E89A2A]">
        Cancels soon
      </span>
    );
  }
  if (active) {
    return (
      <span className="inline-flex items-center rounded-full bg-[#1D9E75]/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#1D9E75] dark:text-[#7FBF88]">
        Active
      </span>
    );
  }
  if (sub?.status === "PAST_DUE") {
    return (
      <span className="inline-flex items-center rounded-full bg-[#C94B2A]/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#C94B2A]">
        Past due
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-sand px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-dark-muted">
      Free
    </span>
  );
}
