"use client";

import Link from "next/link";

import { useCounts } from "@/hooks/useCounts";

interface NavBadgeLinkProps {
  href: string;
  children: React.ReactNode;
  /** Which counts field drives the badge. */
  source: "pendingMatches" | "unreadMessages" | "vetPendingCosigns";
  /** Hide on the page that owns the inbox so it doesn't double-shout. */
  hideOnActive?: boolean;
}

/**
 * Sibling of the inline NavLink in TopNav, but with a live-updating count
 * pill driven by /api/counts via the shared useCounts hook. Renders nothing
 * past the link text when the count is 0.
 */
export function NavBadgeLink({
  href,
  children,
  source,
  hideOnActive = false,
}: NavBadgeLinkProps) {
  const { data } = useCounts();
  const raw = data?.[source] ?? 0;
  const count = Number.isFinite(raw) ? raw : 0;

  return (
    <Link
      href={href}
      className="hidden sm:inline-flex relative rounded-full px-3 py-2 text-sm font-semibold text-dark transition-colors hover:text-terracotta"
      data-hide-on-active={hideOnActive ? "true" : undefined}
    >
      {children}
      {count > 0 && <CountBadge count={count} />}
    </Link>
  );
}

function CountBadge({ count }: { count: number }) {
  const label = count > 99 ? "99+" : String(count);
  return (
    <span
      aria-label={`${count} unread`}
      className="absolute -top-0.5 -right-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-terracotta px-1.5 text-[10px] font-bold leading-none text-white shadow-[0_1px_2px_rgba(28,16,8,0.18)] ring-2 ring-cream dark:ring-[var(--color-cream)]"
    >
      {label}
    </span>
  );
}
