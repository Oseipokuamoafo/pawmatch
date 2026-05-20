"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export type ToastTone = "success" | "info" | "error";

interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  body?: string;
  /** Optional duration override in ms. Default 3500. */
  duration?: number;
  /** True between mount and the close-animation start. */
  open: boolean;
}

interface ToastContextValue {
  show: (toast: Omit<Toast, "id" | "open">) => void;
  success: (title: string, body?: string) => void;
  info: (title: string, body?: string) => void;
  error: (title: string, body?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 3500;
const EXIT_MS = 220;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const show = useCallback(
    ({ tone, title, body, duration }: Omit<Toast, "id" | "open">) => {
      const id = ++counter.current;
      setToasts((q) => [...q, { id, tone, title, body, duration, open: true }]);
      // Slide-out + remove after the duration window
      const ms = duration ?? DEFAULT_DURATION;
      window.setTimeout(() => {
        setToasts((q) => q.map((t) => (t.id === id ? { ...t, open: false } : t)));
        window.setTimeout(() => {
          setToasts((q) => q.filter((t) => t.id !== id));
        }, EXIT_MS);
      }, ms);
    },
    []
  );

  const success = useCallback(
    (title: string, body?: string) => show({ tone: "success", title, body }),
    [show]
  );
  const info = useCallback(
    (title: string, body?: string) => show({ tone: "info", title, body }),
    [show]
  );
  const error = useCallback(
    (title: string, body?: string) => show({ tone: "error", title, body }),
    [show]
  );

  return (
    <ToastContext.Provider value={{ show, success, info, error }}>
      {children}
      <ToastViewport toasts={toasts} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Allow imports outside the provider to no-op gracefully
    return {
      show: () => undefined,
      success: () => undefined,
      info: () => undefined,
      error: () => undefined,
    };
  }
  return ctx;
}

/* ─── Viewport ───────────────────────────────────────────────────────── */

function ToastViewport({ toasts }: { toasts: Toast[] }) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 top-4 z-[200] flex flex-col gap-2 sm:right-6 sm:top-6"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const [enter, setEnter] = useState(false);

  useEffect(() => {
    // Trigger enter transition on next frame so transform/opacity animate
    const id = window.requestAnimationFrame(() => setEnter(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  const tone = toast.tone;
  const accent =
    tone === "success"
      ? "#1D9E75"
      : tone === "error"
        ? "#C94B2A"
        : "#3D2A1A";

  const visible = enter && toast.open;

  return (
    <div
      role="status"
      className="pointer-events-auto rounded-2xl border bg-surface px-4 py-3 shadow-[0_18px_40px_-12px_rgba(28,16,8,0.18)]"
      style={{
        borderColor: `${accent}33`,
        minWidth: 260,
        maxWidth: 380,
        transform: visible ? "translateX(0)" : "translateX(120%)",
        opacity: visible ? 1 : 0,
        transition: `transform 220ms cubic-bezier(0.16,1,0.3,1), opacity 200ms ease`,
      }}
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
          style={{ background: `${accent}1A`, color: accent }}
          aria-hidden="true"
        >
          <ToneGlyph tone={tone} />
        </span>
        <div className="min-w-0 flex-1">
          <p
            className="text-sm font-semibold leading-tight text-dark"
            style={{ fontFamily: "var(--font-inter, system-ui, sans-serif)" }}
          >
            {toast.title}
          </p>
          {toast.body && (
            <p className="mt-0.5 text-xs leading-snug text-dark-muted">
              {toast.body}
            </p>
          )}
        </div>
      </div>

      {/* Progress underline */}
      <div className="mt-3 h-px overflow-hidden rounded-full bg-sand/60">
        <div
          className="h-full"
          style={{
            background: accent,
            width: visible ? "0%" : "100%",
            transition: `width ${(toast.duration ?? DEFAULT_DURATION) - 100}ms linear`,
          }}
        />
      </div>
    </div>
  );
}

function ToneGlyph({ tone }: { tone: ToastTone }) {
  if (tone === "success") {
    return (
      <svg viewBox="0 0 12 12" width="12" height="12" fill="none" aria-hidden="true">
        <path
          d="M2 6.5 5 9.5 10 3"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (tone === "error") {
    return (
      <svg viewBox="0 0 12 12" width="12" height="12" fill="none" aria-hidden="true">
        <path d="M3 3 9 9M9 3 3 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" fill="none" aria-hidden="true">
      <circle cx="6" cy="3.5" r="1" fill="currentColor" />
      <path d="M6 6v3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
