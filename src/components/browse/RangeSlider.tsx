"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

interface RangeSliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  /** Formats the tooltip + live value label. */
  format?: (v: number) => string;
  /** Optional eyebrow shown above the track. */
  label?: string;
  /** Optional "at-max" / "any" sentinel label override. */
  sentinelAtMin?: string;
  sentinelAtMax?: string;
  ariaLabel?: string;
}

/**
 * Custom pointer-driven range slider. Native HTML <input range> styling
 * always looks cheap and doesn't theme cleanly across browsers; this gives
 * us a single source of truth.
 *
 * Features:
 *  - terracotta fill + white thumb with shadow lift on grab
 *  - tooltip showing the current value above the thumb during drag
 *  - keyboard accessible (←/→ / Home/End / PageUp/Down)
 *  - aria-valuetext is human-formatted via `format`
 *  - snap to step on commit
 */
export function RangeSlider({
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  label,
  sentinelAtMin,
  sentinelAtMax,
  ariaLabel,
}: RangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const tooltipId = useId();

  const clamped = clamp(value, min, max);
  const pct = ((clamped - min) / (max - min)) * 100;

  const valueText =
    clamped === min && sentinelAtMin
      ? sentinelAtMin
      : clamped === max && sentinelAtMax
        ? sentinelAtMax
        : format
          ? format(clamped)
          : String(clamped);

  const setFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
      const raw = min + ratio * (max - min);
      const snapped = Math.round(raw / step) * step;
      onChange(clamp(snapped, min, max));
    },
    [min, max, step, onChange],
  );

  /* ── Pointer drag ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => setFromClientX(e.clientX);
    const onUp = () => setDragging(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging, setFromClientX]);

  function onKey(e: React.KeyboardEvent<HTMLDivElement>) {
    let next = clamped;
    const bigStep = Math.max(step, Math.round((max - min) / 10));
    switch (e.key) {
      case "ArrowRight":
      case "ArrowUp":
        next = clamped + step;
        break;
      case "ArrowLeft":
      case "ArrowDown":
        next = clamped - step;
        break;
      case "PageUp":
        next = clamped + bigStep;
        break;
      case "PageDown":
        next = clamped - bigStep;
        break;
      case "Home":
        next = min;
        break;
      case "End":
        next = max;
        break;
      default:
        return;
    }
    e.preventDefault();
    onChange(clamp(next, min, max));
  }

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && (
        <div className="flex items-baseline justify-between text-[11px]">
          <span className="font-semibold uppercase tracking-[0.12em] text-dark-muted">
            {label}
          </span>
          <span className="font-semibold text-dark tabular-nums" aria-live="polite">
            {valueText}
          </span>
        </div>
      )}

      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label={ariaLabel ?? label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={clamped}
        aria-valuetext={valueText}
        aria-describedby={tooltipId}
        onKeyDown={onKey}
        onPointerDown={(e) => {
          (e.currentTarget as HTMLElement).focus();
          setDragging(true);
          setFromClientX(e.clientX);
        }}
        className="relative h-9 cursor-pointer select-none focus:outline-none"
      >
        {/* Track */}
        <div className="absolute left-0 right-0 top-1/2 h-[6px] -translate-y-1/2 rounded-full bg-sand" />
        {/* Filled portion */}
        <div
          className="absolute left-0 top-1/2 h-[6px] -translate-y-1/2 rounded-full bg-terracotta"
          style={{ width: `${pct}%` }}
        />
        {/* Thumb */}
        <div
          className="absolute top-1/2 grid place-items-center"
          style={{
            left: `${pct}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <span
            className={`block rounded-full border-2 border-terracotta bg-surface transition-all ${
              dragging ? "h-[24px] w-[24px] shadow-[0_4px_12px_-2px_rgba(201,75,42,0.40)]" : "h-[20px] w-[20px] shadow-[0_2px_6px_-2px_rgba(28,16,8,0.20)]"
            }`}
          />
          {/* Tooltip */}
          {dragging && (
            <span
              id={tooltipId}
              role="tooltip"
              className="pointer-events-none absolute bottom-[calc(100%+8px)] whitespace-nowrap rounded-full bg-terracotta px-2 py-1 text-[11px] font-semibold text-white shadow-[0_4px_12px_-4px_rgba(201,75,42,0.4)]"
            >
              {valueText}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
