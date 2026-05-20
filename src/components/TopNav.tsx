import Link from "next/link";

import { auth } from "@/lib/auth";
import { SignOutButton } from "./SignOutButton";
import { ThemeToggle } from "./ThemeToggle";
import { VerificationBadge } from "./ui/VerificationBadge";

/**
 * Sticky top nav, used by (auth) and (dashboard) layouts.
 * Marketing has its own custom nav and does not render this.
 */
export async function TopNav() {
  const session = await auth();
  const signedIn = Boolean(session?.user);
  const role = session?.user?.role;
  const isBreeder = role === "BREEDER";
  const isAdmin = role === "ADMIN";
  const isVerified = Boolean(session?.user?.isVerified);
  const initial =
    session?.user?.name?.[0]?.toUpperCase() ??
    session?.user?.email?.[0]?.toUpperCase() ??
    "·";

  return (
    <header
      className="sticky top-0 w-full border-b border-sand/40 bg-cream/85 backdrop-blur supports-[backdrop-filter]:bg-cream/65"
      style={{ zIndex: "var(--z-nav)" as unknown as number }}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 leading-none transition-opacity hover:opacity-80"
          style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}
        >
          <BrandMark />
          <span className="text-2xl font-black tracking-tight text-terracotta">
            PawMatch
          </span>
        </Link>

        {signedIn ? (
          <div className="flex items-center gap-1 sm:gap-2">
            <NavLink href="/dashboard">My pets</NavLink>
            <NavLink href="/browse">Browse</NavLink>
            <NavLink href="/matches">Matches</NavLink>
            <NavLink href="/dashboard/messages">Messages</NavLink>
            {isBreeder && !isVerified && (
              <NavLink href="/dashboard/verify">Get verified</NavLink>
            )}
            {isAdmin && (
              <>
                <NavLink href="/admin/verifications">Verify queue</NavLink>
                <NavLink href="/admin/reports">Reports</NavLink>
              </>
            )}
            {isVerified && (
              <span className="hidden md:inline-flex">
                <VerificationBadge size="sm" />
              </span>
            )}
            <span className="mx-1 hidden h-5 w-px bg-sand sm:inline-block" />
            <ThemeToggle />
            <SignOutButton />
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-terracotta text-sm font-semibold text-white"
              title={session?.user?.name ?? session?.user?.email ?? undefined}
            >
              {initial}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-sm font-semibold text-dark transition-colors hover:text-terracotta"
            >
              Sign in
            </Link>
            <Link href="/register" className="btn-primary !px-5 !py-2 !text-sm">
              Get started
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="hidden sm:inline-flex rounded-full px-3 py-2 text-sm font-semibold text-dark transition-colors hover:text-terracotta"
    >
      {children}
    </Link>
  );
}

function BrandMark() {
  return (
    <svg
      viewBox="0 0 28 28"
      width="22"
      height="22"
      fill="#C94B2A"
      aria-hidden="true"
    >
      <ellipse cx="6" cy="13" rx="2.6" ry="3.4" />
      <ellipse cx="22" cy="13" rx="2.6" ry="3.4" />
      <ellipse cx="10.5" cy="7" rx="2.2" ry="2.9" />
      <ellipse cx="17.5" cy="7" rx="2.2" ry="2.9" />
      <path d="M14 13c-4.5 0-7 3.4-7 6.5C7 23 9.5 25 14 25s7-2 7-5.5C21 16.4 18.5 13 14 13z" />
    </svg>
  );
}
