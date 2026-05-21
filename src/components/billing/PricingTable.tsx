"use client";

import { useState } from "react";
import Link from "next/link";

import { useToast } from "@/components/toast/ToastProvider";

interface PricingTableProps {
  signedIn: boolean;
  alreadyPro: boolean;
  canceledFromCheckout: boolean;
  proPriceLabel: string;
}

export function PricingTable({
  signedIn,
  alreadyPro,
  canceledFromCheckout,
  proPriceLabel,
}: PricingTableProps) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  async function startCheckout() {
    if (!signedIn) {
      window.location.href = "/register?next=/pricing";
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/billing/checkout", { method: "POST" });
      const data = (await r.json()) as { url?: string; error?: string };
      if (!r.ok || !data.url) {
        throw new Error(data.error ?? "Couldn't start checkout");
      }
      window.location.href = data.url;
    } catch (err) {
      toast.error(
        "Checkout failed",
        (err as Error).message ?? "Try again in a moment",
      );
      setSubmitting(false);
    }
  }

  async function openPortal() {
    try {
      const r = await fetch("/api/billing/portal", { method: "POST" });
      const data = (await r.json()) as { url?: string; error?: string };
      if (!r.ok || !data.url) {
        throw new Error(data.error ?? "Couldn't open billing portal");
      }
      window.location.href = data.url;
    } catch (err) {
      toast.error("Portal failed", (err as Error).message);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-14 md:py-20">
      <header className="mx-auto max-w-3xl text-center">
        <p className="eyebrow">Pricing</p>
        <h1
          className="mt-3 leading-[1.05] tracking-tight text-balance text-dark"
          style={{
            fontFamily: "var(--font-playfair, Georgia, serif)",
            fontWeight: 900,
            fontSize: "clamp(2.5rem, 6vw, 4rem)",
          }}
        >
          Free for owners.
          <br className="hidden sm:block" /> Built for the vets behind them.
        </h1>
        <p className="mt-5 mx-auto max-w-2xl text-base leading-relaxed text-dark-muted">
          Every PawMatch account ships with verified matching and the vet
          network. Pro+ unlocks the AI breeding assistant for owners and
          breeders. The Vet Practice tier turns PawMatch into a co-sign
          inbox and compliance audit trail for your clinic.
        </p>
      </header>

      {canceledFromCheckout && (
        <div className="mx-auto mt-8 max-w-md rounded-2xl border border-sand bg-cream/40 px-4 py-3 text-center text-sm text-dark-muted">
          Checkout cancelled — your card was not charged.
        </div>
      )}

      <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-6">
        {/* Free */}
        <article className="card flex flex-col p-8">
          <p className="eyebrow">Free</p>
          <h2
            className="mt-2 leading-tight text-dark"
            style={{
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontWeight: 900,
              fontSize: "2rem",
            }}
          >
            $0
            <span className="ml-1 text-base font-normal text-dark-muted">
              forever
            </span>
          </h2>
          <p className="mt-2 text-sm text-dark-muted">
            Everything you need to find one good match.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            <Check>Unlimited pet profiles with live-photo verification</Check>
            <Check>Browse, filter, and request matches</Check>
            <Check>Health record uploads + DNA imports</Check>
            <Check>Request vet co-signature on records</Check>
            <Check>Heat-cycle tracker + dashboard forecast</Check>
            <Check>Breeding contract PDFs (standard templates)</Check>
          </ul>
          <div className="mt-auto pt-8">
            {signedIn ? (
              <Link
                href="/dashboard"
                className="btn-secondary inline-flex w-full justify-center"
              >
                Go to dashboard
              </Link>
            ) : (
              <Link
                href="/register"
                className="btn-secondary inline-flex w-full justify-center"
              >
                Create an account
              </Link>
            )}
          </div>
        </article>

        {/* Pro+ */}
        <article
          className="relative flex flex-col rounded-card border-2 p-8 shadow-card"
          style={{
            borderColor: "#C94B2A",
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--color-surface) 100%, transparent) 0%, color-mix(in srgb, #C94B2A 4%, var(--color-surface)) 100%)",
          }}
        >
          <span
            className="absolute -top-3 right-6 inline-flex items-center rounded-full bg-terracotta px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white shadow-sm"
            aria-label="Most popular"
          >
            ✨ Pro+
          </span>
          <p className="eyebrow" style={{ color: "#C94B2A" }}>
            Pro+
          </p>
          <h2
            className="mt-2 leading-tight text-dark"
            style={{
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontWeight: 900,
              fontSize: "2rem",
            }}
          >
            {proPriceLabel.split(" / ")[0]}
            <span className="ml-1 text-base font-normal text-dark-muted">
              / month
            </span>
          </h2>
          <p className="mt-2 text-sm text-dark-muted">
            Everything in Free, plus the AI advisor and the breeder toolkit.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            <Check strong>
              <strong>Claude-powered breeding assistant</strong> — chat about
              genetic risk, heat timing, and litter planning, grounded in
              your pet&apos;s actual record
            </Check>
            <Check strong>
              <strong>Cross-breed Punnett predictor</strong> with full health
              + COI scoring
            </Check>
            <Check>Priority placement in browse feeds</Check>
            <Check>Premium contract templates (stud, placement)</Check>
            <Check>Fast-track vet co-sign requests</Check>
            <Check>Cancel anytime — no minimum commitment</Check>
          </ul>
          <div className="mt-auto pt-8">
            {alreadyPro ? (
              <button
                type="button"
                onClick={openPortal}
                className="btn-primary inline-flex w-full justify-center !py-3"
              >
                Manage subscription
              </button>
            ) : (
              <button
                type="button"
                onClick={startCheckout}
                disabled={submitting}
                className="btn-primary inline-flex w-full justify-center !py-3 disabled:opacity-60"
              >
                {submitting ? "Redirecting…" : "Upgrade to Pro+"}
              </button>
            )}
            <p className="mt-3 text-center text-[11px] text-dark-muted">
              Powered by Stripe · Cancel anytime from the billing portal
            </p>
          </div>
        </article>

        {/* Vet Practice */}
        <article className="card flex flex-col p-8">
          <p className="eyebrow">Vet Practice</p>
          <h2
            className="mt-2 leading-tight text-dark"
            style={{
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontWeight: 900,
              fontSize: "2rem",
            }}
          >
            $99+
            <span className="ml-1 text-base font-normal text-dark-muted">
              / mo · per practice
            </span>
          </h2>
          <p className="mt-2 text-sm text-dark-muted">
            For licensed veterinary practices co-signing health records on
            PawMatch.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            <Check strong>
              <strong>Vet co-sign inbox</strong> with real-time owner
              requests and one-click sign / decline
            </Check>
            <Check strong>
              <strong>Compliance audit trail</strong> — exportable record
              of every signature for your practice files
            </Check>
            <Check>
              Public vet-profile listing in the PawMatch directory
            </Check>
            <Check>
              Per-record co-sign fee revenue share (clinics keep the
              majority of every signed record)
            </Check>
            <Check>
              Bulk staff seats — admins, technicians, associate vets
            </Check>
            <Check>
              Priority support + roadmap input
            </Check>
          </ul>
          <div className="mt-auto pt-8">
            <Link
              href="mailto:hello@pawmatch.app?subject=Vet%20Practice%20Tier%20Inquiry"
              className="btn-secondary inline-flex w-full justify-center !py-3"
            >
              Talk to sales
            </Link>
            <p className="mt-3 text-center text-[11px] text-dark-muted">
              Pricing scales with practice size · Pilot program available
            </p>
          </div>
        </article>
      </div>

      <p className="mt-12 text-center text-sm text-dark-muted">
        Running a kennel club, breed registry, or DNA-test partnership?{" "}
        <Link
          href="mailto:hello@pawmatch.app?subject=Partnership%20Inquiry"
          className="font-semibold text-terracotta hover:underline"
        >
          Let&apos;s talk
        </Link>
        .
      </p>
    </div>
  );
}

function Check({
  children,
  strong = false,
}: {
  children: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <li
      className={`flex items-start gap-3 leading-relaxed ${
        strong ? "text-dark" : "text-dark"
      }`}
    >
      <span
        aria-hidden="true"
        className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-terracotta text-white"
      >
        <svg viewBox="0 0 12 12" fill="none" className="h-2.5 w-2.5">
          <path
            d="M2 6.5 5 9.5 10 3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span>{children}</span>
    </li>
  );
}
