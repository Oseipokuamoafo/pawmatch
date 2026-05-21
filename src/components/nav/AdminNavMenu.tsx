"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const EASE = "cubic-bezier(.4,0,.2,1)";

interface AdminItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const ITEMS: AdminItem[] = [
  { href: "/admin/verifications", label: "Verify queue", icon: <ShieldIcon /> },
  { href: "/admin/vets", label: "Vet queue", icon: <StethoscopeIcon /> },
  { href: "/admin/reports", label: "Reports", icon: <FlagIcon /> },
];

/**
 * "Admin ▾" disclosure menu for the top nav.
 */
export function AdminNavMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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

  const activeChild = ITEMS.some((i) => pathname?.startsWith(i.href));

  return (
    <div className="relative hidden sm:inline-flex" ref={rootRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        data-open={open ? "true" : "false"}
        data-active={activeChild ? "true" : "false"}
        className="admin-trigger"
      >
        <ShieldIcon className="h-3.5 w-3.5" />
        Admin
        <Caret className={`h-2.5 w-2.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div role="menu" className="admin-panel">
          <span className="admin-caret" aria-hidden="true" />
          <p className="admin-eyebrow">Admin tools</p>
          <ul className="admin-list">
            {ITEMS.map((item) => {
              const active = pathname?.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`admin-row ${active ? "admin-row-active" : ""}`}
                  >
                    <span className="admin-bar" />
                    <span className="admin-icon">{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    <ArrowRight className="admin-arrow h-3.5 w-3.5" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
}

function ShieldIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 3 4 6v6c0 4.5 3.4 8.4 8 9 4.6-.6 8-4.5 8-9V6l-8-3z M9 12l2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StethoscopeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M6 3v6a4 4 0 0 0 8 0V3M10 17a4 4 0 1 0 8 0v-2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="18" cy="15" r="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M5 21V4h13l-2.5 4 2.5 4H5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Caret({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" fill="none" className={className} aria-hidden="true">
      <path
        d="m3 4.5 3 3 3-3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowRight({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const styles = `
:root, [data-theme="light"] {
  --admin-panel-bg:        #ffffff;
  --admin-panel-border:    #EAD9CC;
  --admin-panel-shadow:    0 18px 48px -18px rgba(28, 16, 8, 0.18),
                           0 6px 18px -8px rgba(28, 16, 8, 0.08);
  --admin-row-hover-bg:    #FDF8F2;
  --admin-icon-color:      #9B6F4F;
  --admin-arrow-color:     #B59880;
  --admin-section-label:   #9B6F4F;
}
[data-theme="dark"] {
  --admin-panel-bg:        #261810;
  --admin-panel-border:    rgba(232,213,183,0.18);
  --admin-panel-shadow:    0 18px 48px -18px rgba(0, 0, 0, 0.55),
                           0 6px 18px -8px rgba(0, 0, 0, 0.45);
  --admin-row-hover-bg:    rgba(232,213,183,0.07);
  --admin-icon-color:      rgba(245,239,230,0.62);
  --admin-arrow-color:     rgba(245,239,230,0.45);
  --admin-section-label:   rgba(245,239,230,0.55);
}

@keyframes admin-panel-in {
  from { opacity: 0; transform: translateY(-8px) scale(.97); }
  to   { opacity: 1; transform: translateY(0)    scale(1);   }
}

.admin-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-dark);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 150ms ${EASE}, background-color 150ms ${EASE};
}
.admin-trigger:hover {
  color: var(--color-terracotta);
}
.admin-trigger[data-open="true"],
.admin-trigger[data-active="true"] {
  color: var(--color-terracotta);
}
.admin-trigger[data-open="true"] {
  background: rgba(201, 75, 42, 0.08);
}

.admin-panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 240px;
  background: var(--admin-panel-bg);
  border: 1px solid var(--admin-panel-border);
  border-radius: 14px;
  box-shadow: var(--admin-panel-shadow);
  transform-origin: top right;
  animation: admin-panel-in 220ms ${EASE};
  z-index: 90;
  padding: 10px 8px 8px;
}
.admin-caret {
  position: absolute;
  top: -6px;
  right: 22px;
  width: 12px;
  height: 12px;
  background: var(--admin-panel-bg);
  border-top: 1px solid var(--admin-panel-border);
  border-left: 1px solid var(--admin-panel-border);
  transform: rotate(45deg);
}
.admin-eyebrow {
  padding: 0 8px 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--admin-section-label);
}
.admin-list { margin: 0; padding: 0; list-style: none; }
.admin-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  position: relative;
  text-decoration: none;
  color: var(--color-dark);
  font-size: 0.875rem;
  font-weight: 500;
  transition: padding-left 200ms ${EASE},
              background-color 200ms ${EASE},
              color 200ms ${EASE};
}
.admin-row:hover {
  padding-left: 16px;
  background: var(--admin-row-hover-bg);
  color: var(--color-terracotta);
}
.admin-row:hover .admin-bar { opacity: 1; }
.admin-row:hover .admin-icon { color: var(--color-terracotta); }
.admin-row:hover .admin-arrow {
  color: var(--color-terracotta);
  transform: translateX(3px);
}
.admin-row-active {
  background: rgba(201, 75, 42, 0.08);
  color: var(--color-terracotta);
}
.admin-row-active .admin-bar { opacity: 1; }
.admin-row-active .admin-icon { color: var(--color-terracotta); }
.admin-bar {
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
.admin-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  color: var(--admin-icon-color);
  transition: color 200ms ${EASE};
}
.admin-arrow {
  color: var(--admin-arrow-color);
  transition: color 200ms ${EASE}, transform 200ms ${EASE};
}
`;
