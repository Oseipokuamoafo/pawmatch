"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { PetWizard } from "@/components/pets/PetWizard";

interface AddPetModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (pet: { id: string; name: string }) => void;
}

/**
 * Slide-up modal hosting the 3-step pet wizard.
 *
 * Rendered via a portal to <body> so it escapes any parent stacking context
 * (the dashboard layout creates one via z-index: var(--z-content)). Without
 * the portal, the modal would be visually trapped below the global cursor
 * even though its inner z-index is higher.
 *
 *  - Backdrop blur + click-to-close
 *  - Escape key closes
 *  - Locks body scroll while open
 *  - Slide-up animation on open, slide-down on close (CSS transitions)
 */
export function AddPetModal({ open, onClose, onCreated }: AddPetModalProps) {
  const [mounted, setMounted] = useState(false);

  // SSR-safe portal — only mount after the client picks up
  useEffect(() => {
    setMounted(true);
  }, []);

  // Body scroll lock + escape key
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!mounted) return null;

  const node = (
    <div
      aria-hidden={!open}
      // Use `inset-0` + isolate so this owns its own root context at body level
      className="fixed inset-0 isolate"
      style={{
        // Above the cursor (50) and below toasts (200); ensures the modal
        // sits on top of every page chrome layer.
        zIndex: 150,
        pointerEvents: open ? "auto" : "none",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 transition-opacity duration-300 ${
          open ? "opacity-100 bg-dark/45 backdrop-blur-sm" : "pointer-events-none opacity-0"
        }`}
        aria-hidden="true"
      />

      {/* Slide-up panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add a pet"
        className={`absolute inset-x-0 bottom-0 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          open ? "translate-y-0" : "translate-y-full pointer-events-none"
        }`}
        style={{ maxHeight: "92vh" }}
        // Stop bubbling so panel clicks never reach the backdrop's onClose
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="relative mx-auto max-w-3xl rounded-t-3xl bg-cream shadow-[0_-30px_60px_-20px_rgba(28,16,8,0.35)]">
          {/* Drag handle */}
          <div className="flex items-center justify-center pt-3">
            <span className="block h-1.5 w-12 rounded-full bg-sand" aria-hidden="true" />
          </div>

          {/* Close button (floats top-right; no headline above the wizard) */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-sand bg-cream text-dark-muted transition-colors hover:border-terracotta/40 hover:text-terracotta"
          >
            ×
          </button>

          {/* Scrollable body */}
          <div
            className="overflow-y-auto px-6 pb-8 pt-6"
            style={{ maxHeight: "calc(92vh - 60px)" }}
          >
            {open && (
              <PetWizard
                showHeader={false}
                onCancel={onClose}
                onSuccess={(pet) => {
                  onCreated(pet);
                  onClose();
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
