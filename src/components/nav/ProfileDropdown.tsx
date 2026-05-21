"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";

import { useToast } from "@/components/toast/ToastProvider";
import { useCounts } from "@/hooks/useCounts";
import { calculateAge } from "@/lib/utils/age";
import type { Sex } from "@/generated/prisma";

/* ─── Types ──────────────────────────────────────────────────────────── */

interface PetRow {
  id: string;
  name: string;
  breed: string;
  sex: Sex;
  dateOfBirth: string;
  livePhotoUrl: string | null;
  photos?: { url: string; isPrimary: boolean }[];
}

interface PetsResp {
  pets: PetRow[];
}

interface ProfileDropdownProps {
  /** Member-since date — passed from the server since it's not on session */
  memberSince: string | null;
  /** Optional fallbacks while the session hook is still warming up */
  fallbackName?: string | null;
  fallbackEmail?: string | null;
  fallbackImage?: string | null;
  fallbackRole?: "OWNER" | "BREEDER" | "VET" | "ADMIN";
  fallbackIsVerified?: boolean;
}

/* ─── Easing constant ────────────────────────────────────────────────── */
const EASE = "cubic-bezier(.4,0,.2,1)";

/* ─── Component ──────────────────────────────────────────────────────── */

export function ProfileDropdown({
  memberSince,
  fallbackName,
  fallbackEmail,
  fallbackImage,
  fallbackRole,
  fallbackIsVerified,
}: ProfileDropdownProps) {
  const { data: session } = useSession();
  const toast = useToast();

  const name = session?.user?.name ?? fallbackName ?? "";
  const email = session?.user?.email ?? fallbackEmail ?? "";
  const image = session?.user?.image ?? fallbackImage ?? null;
  const role = session?.user?.role ?? fallbackRole;
  const isVerified = session?.user?.isVerified ?? fallbackIsVerified ?? false;

  const initials = computeInitials(name, email);
  const isBreeder = role === "BREEDER";
  const isPro = false; // hook up to billing tier when it ships

  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  /* ── Mobile detection ───────────────────────────────────────────── */
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  /* ── Click outside + Escape ─────────────────────────────────────── */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /* ── Lock scroll while the bottom sheet is open ─────────────────── */
  useEffect(() => {
    if (isMobile && open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isMobile, open]);

  /* ── Data ───────────────────────────────────────────────────────── */
  const pets = useQuery<PetsResp>({
    queryKey: ["dropdown", "pets"],
    queryFn: async () => {
      const r = await fetch("/api/pets");
      if (!r.ok) throw new Error("Failed to load pets");
      return r.json();
    },
    enabled: open,
    staleTime: 30_000,
  });

  // Shared with the nav badges — same query key, so opening the dropdown
  // hits the already-warmed cache instead of refetching.
  const counts = useCounts();

  /* ── Actions ────────────────────────────────────────────────────── */
  const handleSignOut = async () => {
    toast.success("Signing out…");
    await signOut({ callbackUrl: "/" });
  };

  const handleNav = (label: string) => {
    setOpen(false);
    toast.success(label);
  };

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="relative" ref={rootRef}>
      {/* ── Avatar trigger ─────────────────────────────────────────── */}
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="profile-avatar"
        title={name || email || undefined}
        data-open={open ? "true" : "false"}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={name || "Profile"}
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          <span className="text-sm font-semibold text-white tracking-wide">
            {initials}
          </span>
        )}
        <style>{`
          .profile-avatar {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 38px;
            height: 38px;
            border-radius: 9999px;
            background-color: var(--color-terracotta);
            color: #fff;
            border: 2.5px solid transparent;
            transition: transform 220ms ${EASE},
                        box-shadow 220ms ${EASE},
                        border-color 220ms ${EASE};
            cursor: pointer;
            overflow: hidden;
          }
          .profile-avatar:hover {
            transform: scale(1.08);
            box-shadow: 0 0 0 6px rgba(201, 75, 42, 0.15);
          }
          .profile-avatar[data-open="true"] {
            border-color: var(--color-terracotta);
            box-shadow: 0 0 0 4px rgba(201, 75, 42, 0.15);
          }
        `}</style>
      </button>

      {/* ── Panel (desktop) or bottom sheet (mobile) ───────────────── */}
      {open && (
        <>
          {isMobile && (
            <div
              role="presentation"
              onClick={() => setOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(28, 16, 8, 0.45)",
                zIndex: 80,
                animation: `pd-overlay-in 200ms ${EASE}`,
              }}
            />
          )}
          <div
            role="menu"
            aria-label="Profile menu"
            className={
              isMobile ? "pd-sheet" : "pd-panel"
            }
          >
            {/* Caret (desktop only) */}
            {!isMobile && <span className="pd-caret" aria-hidden="true" />}

            {/* Drag handle (mobile only) */}
            {isMobile && (
              <div className="flex justify-center pt-3">
                <span
                  className="block h-1.5 w-12 rounded-full"
                  style={{ background: "var(--pd-drag-handle)" }}
                />
              </div>
            )}

            {/* ── Section 1: Header ─────────────────────────────── */}
            <section className="pd-header">
              <Link
                href="/dashboard/settings"
                onClick={() => handleNav("Opening profile editor")}
                className="pd-edit-pill"
              >
                Edit profile
              </Link>
              <div className="flex items-center gap-3">
                <div className="pd-header-avatar">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image}
                      alt={name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-semibold text-white">
                      {initials}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-dark"
                    style={{
                      fontFamily: "Georgia, var(--font-playfair), serif",
                      fontSize: "15px",
                      fontWeight: 700,
                      lineHeight: 1.2,
                    }}
                  >
                    {name || "Welcome"}
                  </p>
                  <p className="mt-0.5 truncate text-[12px] text-dark-muted">
                    {email}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {isBreeder && isVerified && (
                  <span className="pd-chip pd-chip-sage">
                    <SmallCheck /> Verified Breeder
                  </span>
                )}
                {isPro && <span className="pd-chip pd-chip-terra">Pro</span>}
                {!isBreeder && !isPro && (
                  <span className="pd-chip pd-chip-sand">
                    {role === "ADMIN" ? "Admin" : "Owner"}
                  </span>
                )}
              </div>
            </section>

            {/* ── Section 2: Overview stats ────────────────────── */}
            <section className="px-4 pt-3 pb-1 grid grid-cols-3 gap-2">
              <StatCard
                value={counts.data?.pets}
                label="Pets"
                loading={counts.isLoading}
              />
              <StatCard
                value={counts.data?.pendingMatches}
                label="Matches"
                loading={counts.isLoading}
              />
              <StatCard
                value={counts.data?.avgHealthScore}
                label="Avg health"
                loading={counts.isLoading}
              />
            </section>

            {/* ── Section 3: My pets ───────────────────────────── */}
            <section className="px-4 pt-3 pb-1">
              <div className="mb-1.5 flex items-baseline justify-between">
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: "var(--pd-section-label)" }}
                >
                  My pets
                </p>
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="pd-link-view-all"
                >
                  View all
                </Link>
              </div>
              <ul className="space-y-0.5">
                {pets.isLoading ? (
                  <>
                    <PetSkeleton />
                    <PetSkeleton />
                  </>
                ) : pets.data?.pets.length ? (
                  pets.data.pets.slice(0, 4).map((p) => (
                    <li key={p.id}>
                      <PetRowLink pet={p} onNav={() => setOpen(false)} />
                    </li>
                  ))
                ) : (
                  <li className="px-2 py-3 text-center text-[12px] italic text-dark-muted">
                    No pets yet
                  </li>
                )}
                <li>
                  <Link
                    href="/dashboard/pets/new"
                    onClick={() => setOpen(false)}
                    className="pd-add-pet"
                  >
                    <span className="pd-add-icon">＋</span>
                    <span>Add a new pet</span>
                  </Link>
                </li>
              </ul>
            </section>

            {/* ── Section 4: Quick access ──────────────────────── */}
            <section className="px-4 pt-3 pb-1">
              <p
                className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em]"
                style={{ color: "var(--pd-section-label)" }}
              >
                Quick access
              </p>
              <ul>
                <QuickRow
                  href="/dashboard/pets"
                  icon={<HealthIcon />}
                  label="Health records"
                  onClick={() => setOpen(false)}
                />
                <QuickRow
                  href="/dashboard/verify"
                  icon={<ShieldIcon />}
                  label="Breeder verification"
                  onClick={() => setOpen(false)}
                />
                <QuickRow
                  href="/dashboard/billing"
                  icon={<BillingIcon />}
                  label="Billing & plan"
                  onClick={() => setOpen(false)}
                />
                <QuickRow
                  href="/dashboard/settings"
                  icon={<GearIcon />}
                  label="Settings"
                  onClick={() => setOpen(false)}
                />
                <QuickRow
                  href="#"
                  icon={<LifebuoyIcon />}
                  label="Help & support"
                  soon
                />
              </ul>
            </section>

            {/* ── Section 5: Footer ────────────────────────────── */}
            <footer className="px-4 pt-3 pb-4">
              <div className="mb-3 flex items-center gap-1.5 text-[11px] text-dark-muted">
                <CalendarIcon />
                <span>
                  Member since{" "}
                  {memberSince
                    ? new Date(memberSince).toLocaleDateString(undefined, {
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </span>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="pd-signout"
              >
                <LogOutIcon className="pd-signout-icon" />
                <span>Sign out</span>
              </button>
            </footer>
          </div>
        </>
      )}

      {/* ─── Styles for panel + sheet + chips + rows ─────────────── */}
      <style>{styles}</style>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────── */

function StatCard({
  value,
  label,
  loading,
}: {
  value: number | undefined;
  label: string;
  loading: boolean;
}) {
  return (
    <div className="pd-stat">
      <p className="pd-stat-value">
        {loading ? <span className="pd-skel-num" aria-hidden="true" /> : value ?? 0}
      </p>
      <p className="pd-stat-label">{label}</p>
    </div>
  );
}

function PetRowLink({
  pet,
  onNav,
}: {
  pet: PetRow;
  onNav: () => void;
}) {
  const photo = pet.photos?.find((p) => p.isPrimary)?.url
    ?? pet.photos?.[0]?.url
    ?? pet.livePhotoUrl;
  const live = Boolean(pet.livePhotoUrl);

  return (
    <Link
      href={`/dashboard/pets/${pet.id}`}
      onClick={onNav}
      className="pd-pet-row"
    >
      <div className="pd-pet-avatar">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={pet.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-base">{pet.sex === "MALE" ? "♂" : "♀"}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-semibold text-dark">
            {pet.name}
          </span>
          <span
            className={`pd-sex-pill ${pet.sex === "MALE" ? "pd-sex-male" : "pd-sex-female"}`}
          >
            {pet.sex === "MALE" ? "M" : "F"}
          </span>
          {live && <span className="pd-live-dot" aria-label="Live photo verified" />}
        </div>
        <p className="mt-0.5 truncate text-[11px] text-dark-muted">
          {pet.breed} · {calculateAge(pet.dateOfBirth)}
        </p>
      </div>
      <ChevronRight className="pd-chevron" />
    </Link>
  );
}

function PetSkeleton() {
  return (
    <li className="flex items-center gap-2.5 px-2 py-2">
      <span className="block h-[34px] w-[34px] animate-pulse rounded-md bg-sand" />
      <div className="flex-1 space-y-1.5">
        <span className="block h-3 w-24 animate-pulse rounded-full bg-sand" />
        <span className="block h-2.5 w-32 animate-pulse rounded-full bg-sand/60" />
      </div>
    </li>
  );
}

function QuickRow({
  href,
  icon,
  label,
  onClick,
  soon,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  soon?: boolean;
}) {
  if (soon) {
    return (
      <li className="pd-quick-row pd-quick-row-soon" aria-disabled="true">
        <span className="pd-quick-bar" />
        <span className="pd-quick-icon">{icon}</span>
        <span className="flex-1 text-[13px] text-dark-muted">{label}</span>
        <span className="pd-soon-pill">Soon</span>
      </li>
    );
  }
  return (
    <li>
      <Link href={href} onClick={onClick} className="pd-quick-row">
        <span className="pd-quick-bar" />
        <span className="pd-quick-icon">{icon}</span>
        <span className="flex-1 text-[13px] text-dark">{label}</span>
        <ArrowRight className="pd-quick-arrow" />
      </Link>
    </li>
  );
}

/* ─── Icons ──────────────────────────────────────────────────────────── */

function SmallCheck() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" aria-hidden="true">
      <path d="M2 6.5 L 5 9.5 L 10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRight({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowRight({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HealthIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M12 21s-7-4.5-7-10a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 19 11c0 5.5-7 10-7 10z"
        stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M12 3 4 6v6c0 4.5 3.4 8.4 8 9 4.6-.6 8-4.5 8-9V6l-8-3z M9 12l2 2 4-4"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.05a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.05A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.05A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87 1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.05a1.7 1.7 0 0 0-1.55 1z"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BillingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <rect
        x="3"
        y="6"
        width="18"
        height="13"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M7 15h3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LifebuoyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="m5 5 4 4M19 5l-4 4M5 19l4-4M19 19l-4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function LogOutIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
        stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────────── */

function computeInitials(name: string, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  if (email) return email[0]!.toUpperCase();
  return "·";
}

/* ─── Styles (single template literal to keep things in one file) ───── */

const styles = `
/* ── Theme tokens — light defaults ────────────────────────────────── */
:root, [data-theme="light"] {
  --pd-panel-bg:        #ffffff;
  --pd-panel-border:    #EAD9CC;
  --pd-panel-shadow:    0 18px 48px -18px rgba(28, 16, 8, 0.18),
                        0 6px 18px -8px rgba(28, 16, 8, 0.08);
  --pd-sheet-shadow:    0 -20px 60px -20px rgba(28, 16, 8, 0.25);

  --pd-header-bg:       #FEF3EF;
  --pd-header-bg-hover: #FDDDD4;
  --pd-edit-pill-bg:    #ffffff;
  --pd-edit-pill-bg-hover: #FFF7F3;
  --pd-header-ring:     #ffffff;        /* 3px ring around header avatar */

  --pd-chip-sage-bg:    #EDF7EE;
  --pd-chip-sage-color: #2E6B36;
  --pd-chip-terra-bg:   #FEF3EF;
  --pd-chip-sand-bg:    #F1E4D4;
  --pd-chip-sand-color: #6B4A2A;

  --pd-stat-bg:         #FDF8F2;
  --pd-stat-bg-hover:   #FEF3EF;
  --pd-stat-border-hover: #F1D8CB;
  --pd-stat-label:      #9B6F4F;
  --pd-skel-bg:         #F1E4D4;

  --pd-section-label:   #9B6F4F;

  --pd-row-bg-hover:    #FDF8F2;
  --pd-pet-avatar-bg:   #E8D5B7;

  --pd-sex-male-bg:     rgba(122,158,126,0.18);
  --pd-sex-male-color:  #4F7A55;
  --pd-sex-female-bg:   rgba(201,75,42,0.13);
  --pd-sex-female-color: #C94B2A;

  --pd-chevron-color:   #B59880;
  --pd-arrow-color:     #B59880;
  --pd-icon-color:      #9B6F4F;

  --pd-add-pet-border:  #E8D5B7;
  --pd-add-pet-color:   #9B6F4F;
  --pd-add-pet-bg-hover: #FEF3EF;

  --pd-soon-bg:         #F1E4D4;
  --pd-soon-color:      #6B4A2A;

  --pd-signout-border:  #EAD9CC;
  --pd-signout-color:   #5C3A23;
  --pd-signout-border-hover: #E24B4A;
  --pd-signout-bg-hover:     #FCEBEB;
  --pd-signout-color-hover:  #A32D2D;

  --pd-drag-handle:     #EAD9CC;
}

/* ── Theme tokens — dark overrides ────────────────────────────────── */
[data-theme="dark"] {
  --pd-panel-bg:        #261810;        /* matches --color-surface */
  --pd-panel-border:    rgba(232,213,183,0.18);
  --pd-panel-shadow:    0 18px 48px -18px rgba(0, 0, 0, 0.55),
                        0 6px 18px -8px rgba(0, 0, 0, 0.45);
  --pd-sheet-shadow:    0 -20px 60px -20px rgba(0, 0, 0, 0.60);

  --pd-header-bg:       rgba(201,75,42,0.16);
  --pd-header-bg-hover: rgba(201,75,42,0.28);
  --pd-edit-pill-bg:    #2F1E14;
  --pd-edit-pill-bg-hover: rgba(232,89,60,0.18);
  --pd-header-ring:     #2F1E14;

  --pd-chip-sage-bg:    rgba(79,184,147,0.18);
  --pd-chip-sage-color: #5DD7AC;
  --pd-chip-terra-bg:   rgba(232,89,60,0.18);
  --pd-chip-sand-bg:    rgba(232,213,183,0.12);
  --pd-chip-sand-color: rgba(245,239,230,0.78);

  --pd-stat-bg:         rgba(232,213,183,0.06);
  --pd-stat-bg-hover:   rgba(232,89,60,0.14);
  --pd-stat-border-hover: rgba(232,89,60,0.35);
  --pd-stat-label:      rgba(245,239,230,0.62);
  --pd-skel-bg:         rgba(232,213,183,0.14);

  --pd-section-label:   rgba(245,239,230,0.55);

  --pd-row-bg-hover:    rgba(232,213,183,0.07);
  --pd-pet-avatar-bg:   rgba(232,213,183,0.18);

  --pd-sex-male-bg:     rgba(79,184,147,0.20);
  --pd-sex-male-color:  #7DD9B5;
  --pd-sex-female-bg:   rgba(232,89,60,0.22);
  --pd-sex-female-color: #FF8A6B;

  --pd-chevron-color:   rgba(245,239,230,0.45);
  --pd-arrow-color:     rgba(245,239,230,0.45);
  --pd-icon-color:      rgba(245,239,230,0.62);

  --pd-add-pet-border:  rgba(232,213,183,0.30);
  --pd-add-pet-color:   rgba(245,239,230,0.68);
  --pd-add-pet-bg-hover: rgba(232,89,60,0.14);

  --pd-soon-bg:         rgba(232,213,183,0.12);
  --pd-soon-color:      rgba(245,239,230,0.7);

  --pd-signout-border:  rgba(232,213,183,0.20);
  --pd-signout-color:   rgba(245,239,230,0.88);
  --pd-signout-border-hover: #FF6F6E;
  --pd-signout-bg-hover:     rgba(226,75,74,0.18);
  --pd-signout-color-hover:  #FFA1A0;

  --pd-drag-handle:     rgba(232,213,183,0.28);
}

@keyframes pd-panel-in {
  from { opacity: 0; transform: translateY(-10px) scale(.97); }
  to   { opacity: 1; transform: translateY(0)     scale(1);   }
}
@keyframes pd-sheet-in {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
@keyframes pd-overlay-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes pd-live-pulse {
  0%, 100% { transform: scale(1);   opacity: 1;   }
  50%      { transform: scale(1.4); opacity: 0.45; }
}

/* ── Desktop panel ───────────────────────────────────────────────── */
.pd-panel {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  width: 320px;
  background: var(--pd-panel-bg);
  border: 1px solid var(--pd-panel-border);
  border-radius: 18px;
  box-shadow: var(--pd-panel-shadow);
  transform-origin: top right;
  animation: pd-panel-in 250ms ${EASE};
  z-index: 90;
  overflow: hidden;
}
.pd-caret {
  position: absolute;
  top: -6px;
  right: 14px;
  width: 12px;
  height: 12px;
  background: var(--pd-panel-bg);
  border-top: 1px solid var(--pd-panel-border);
  border-left: 1px solid var(--pd-panel-border);
  transform: rotate(45deg);
}

/* ── Mobile bottom sheet ─────────────────────────────────────────── */
.pd-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
  background: var(--pd-panel-bg);
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  box-shadow: var(--pd-sheet-shadow);
  animation: pd-sheet-in 320ms ${EASE};
  z-index: 90;
}

/* ── Section 1 — header ──────────────────────────────────────────── */
.pd-header {
  position: relative;
  padding: 18px 16px 14px;
  background: var(--pd-header-bg);
  transition: background-color 300ms ${EASE};
}
.pd-header:hover { background: var(--pd-header-bg-hover); }

.pd-edit-pill {
  position: absolute;
  top: 14px;
  right: 14px;
  display: inline-flex;
  align-items: center;
  background: var(--pd-edit-pill-bg);
  border: 1px solid var(--color-terracotta);
  color: var(--color-terracotta);
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 9999px;
  transition: transform 200ms ${EASE}, background-color 200ms ${EASE};
}
.pd-edit-pill:hover {
  transform: translateY(-2px);
  background: var(--pd-edit-pill-bg-hover);
}

.pd-header-avatar {
  width: 54px;
  height: 54px;
  border-radius: 9999px;
  background: var(--color-terracotta);
  border: 3px solid var(--pd-header-ring);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  transition: transform 200ms ${EASE};
}
.pd-header:hover .pd-header-avatar { transform: scale(1.06); }

.pd-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 9999px;
  letter-spacing: 0.03em;
  transition: transform 200ms ${EASE};
}
.pd-chip:hover { transform: scale(1.03); }
.pd-chip-sage  { background: var(--pd-chip-sage-bg); color: var(--pd-chip-sage-color); }
.pd-chip-terra { background: var(--pd-chip-terra-bg); color: var(--color-terracotta); }
.pd-chip-sand  { background: var(--pd-chip-sand-bg); color: var(--pd-chip-sand-color); }

/* ── Section 2 — stats ──────────────────────────────────────────── */
.pd-stat {
  background: var(--pd-stat-bg);
  border: 1px solid transparent;
  border-radius: 11px;
  padding: 8px 6px;
  text-align: center;
  cursor: default;
  transition: background-color 200ms ${EASE},
              border-color 200ms ${EASE},
              transform 200ms ${EASE};
}
.pd-stat:hover {
  background: var(--pd-stat-bg-hover);
  border-color: var(--pd-stat-border-hover);
  transform: translateY(-2px);
}
.pd-stat:active { transform: scale(.96); }
.pd-stat-value {
  font-size: 18px;
  font-weight: 800;
  color: var(--color-terracotta);
  line-height: 1;
}
.pd-stat-label {
  margin-top: 3px;
  font-size: 10px;
  font-weight: 600;
  color: var(--pd-stat-label);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.pd-skel-num {
  display: inline-block;
  width: 18px;
  height: 14px;
  background: var(--pd-skel-bg);
  border-radius: 4px;
  animation: pulse 1.4s ease-in-out infinite;
}

/* ── Section 3 — pets ───────────────────────────────────────────── */
.pd-link-view-all {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-terracotta);
}
.pd-link-view-all:hover { text-decoration: underline; }

.pd-pet-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 8px;
  border-radius: 10px;
  position: relative;
  transition: transform 200ms ${EASE}, background-color 200ms ${EASE};
}
.pd-pet-row:hover {
  background: var(--pd-row-bg-hover);
  transform: translateX(2px);
}
.pd-pet-row:active { transform: scale(.98) translateX(2px); }

.pd-pet-avatar {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: var(--pd-pet-avatar-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  transition: transform 200ms ${EASE};
  color: var(--color-dark);
}
.pd-pet-row:hover .pd-pet-avatar { transform: scale(1.05); }

.pd-sex-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 700;
  width: 14px;
  height: 14px;
  border-radius: 4px;
  line-height: 1;
}
.pd-sex-male   { background: var(--pd-sex-male-bg);   color: var(--pd-sex-male-color); }
.pd-sex-female { background: var(--pd-sex-female-bg); color: var(--pd-sex-female-color); }

.pd-live-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 9999px;
  background: var(--color-sage);
  animation: pd-live-pulse 2s ease-in-out infinite;
  flex-shrink: 0;
}

.pd-chevron {
  width: 14px;
  height: 14px;
  color: var(--pd-chevron-color);
  transition: transform 180ms ${EASE}, color 180ms ${EASE};
  flex-shrink: 0;
}
.pd-pet-row:hover .pd-chevron {
  color: var(--color-terracotta);
  transform: translateX(3px);
}

.pd-add-pet {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  margin-top: 4px;
  border: 1.5px dashed var(--pd-add-pet-border);
  border-radius: 10px;
  color: var(--pd-add-pet-color);
  font-size: 12px;
  font-weight: 600;
  transition: transform 200ms ${EASE},
              border-color 200ms ${EASE},
              background-color 200ms ${EASE},
              color 200ms ${EASE};
}
.pd-add-pet:hover {
  transform: translateY(-1px);
  border-color: var(--color-terracotta);
  background: var(--pd-add-pet-bg-hover);
  color: var(--color-terracotta);
}
.pd-add-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  font-size: 18px;
  line-height: 1;
  color: inherit;
  transition: transform 220ms ${EASE};
}
.pd-add-pet:hover .pd-add-icon { transform: rotate(90deg); }

/* ── Section 4 — quick access ───────────────────────────────────── */
.pd-quick-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  position: relative;
  transition: padding-left 220ms ${EASE},
              background-color 200ms ${EASE},
              color 200ms ${EASE};
}
.pd-quick-bar {
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 2px;
  background: var(--color-terracotta);
  opacity: 0;
  transition: opacity 220ms ${EASE};
}
.pd-quick-row:hover {
  padding-left: 16px;
  background: var(--pd-row-bg-hover);
  color: var(--color-terracotta);
}
.pd-quick-row:hover .pd-quick-bar { opacity: 1; }
.pd-quick-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  color: var(--pd-icon-color);
  transition: color 200ms ${EASE};
}
.pd-quick-row:hover .pd-quick-icon { color: var(--color-terracotta); }
.pd-quick-arrow {
  width: 14px;
  height: 14px;
  color: var(--pd-arrow-color);
  transition: color 200ms ${EASE}, transform 200ms ${EASE};
}
.pd-quick-row:hover .pd-quick-arrow {
  color: var(--color-terracotta);
  transform: translateX(3px);
}
.pd-quick-row-soon {
  cursor: default;
  opacity: 0.65;
}
.pd-quick-row-soon:hover {
  padding-left: 10px;
  background: transparent;
  color: inherit;
}
.pd-quick-row-soon:hover .pd-quick-icon { color: var(--pd-icon-color); }
.pd-soon-pill {
  background: var(--pd-soon-bg);
  color: var(--pd-soon-color);
  font-size: 9px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 9999px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* ── Section 5 — footer ─────────────────────────────────────────── */
.pd-signout {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1.5px solid var(--pd-signout-border);
  background: transparent;
  color: var(--pd-signout-color);
  font-size: 13px;
  font-weight: 600;
  padding: 9px 14px;
  border-radius: 12px;
  cursor: pointer;
  transition: transform 200ms ${EASE},
              border-color 200ms ${EASE},
              background-color 200ms ${EASE},
              color 200ms ${EASE};
}
.pd-signout:hover {
  border-color: var(--pd-signout-border-hover);
  color: var(--pd-signout-color-hover);
  background: var(--pd-signout-bg-hover);
  transform: translateY(-1px);
}
.pd-signout-icon {
  width: 15px;
  height: 15px;
  transition: transform 200ms ${EASE};
}
.pd-signout:hover .pd-signout-icon {
  transform: translateX(-2px);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: .5; }
}
`;
