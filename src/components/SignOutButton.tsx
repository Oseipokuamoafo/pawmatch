"use client";

import { signOut } from "next-auth/react";

interface SignOutButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export function SignOutButton({ className, children = "Sign out" }: SignOutButtonProps) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className={
        className ??
        "inline-flex items-center justify-center rounded-full border border-sand bg-transparent px-4 py-2 text-sm font-medium text-dark-muted transition-[background,color,border-color] duration-150 hover:border-terracotta/40 hover:bg-terracotta/5 hover:text-terracotta"
      }
    >
      {children}
    </button>
  );
}
