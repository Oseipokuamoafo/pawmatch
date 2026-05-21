"use client";

import { forwardRef, InputHTMLAttributes, useId, useState } from "react";

interface FloatingInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

/**
 * Floating-label input per UI spec (docs/UI.md).
 * Label floats up + shrinks when input has value or is focused.
 * Border transitions to terracotta on focus over 150ms.
 */
export const FloatingInput = forwardRef<HTMLInputElement, FloatingInputProps>(
  function FloatingInput({ label, error, id, value, defaultValue, onFocus, onBlur, ...rest }, ref) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const [focused, setFocused] = useState(false);
    const hasValue =
      value !== undefined
        ? String(value).length > 0
        : defaultValue !== undefined
          ? String(defaultValue).length > 0
          : undefined;
    const [internalHasValue, setInternalHasValue] = useState(Boolean(hasValue));
    const floating = focused || (hasValue ?? internalHasValue);

    return (
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          value={value}
          defaultValue={defaultValue}
          {...rest}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            setInternalHasValue(e.target.value.length > 0);
            onBlur?.(e);
          }}
          placeholder=" "
          className={
            "peer w-full rounded-2xl border bg-cream/60 px-4 pb-2.5 pt-6 text-base text-dark outline-none transition-[border-color,background,box-shadow] duration-150 " +
            (error
              ? "border-terracotta"
              : "border-sand focus:border-terracotta focus:bg-cream") +
            " focus:ring-2 focus:ring-terracotta/15"
          }
        />
        <label
          htmlFor={inputId}
          className={
            "pointer-events-none absolute left-4 select-none transition-[transform,color,font-size] duration-150 " +
            (error || (floating && focused)
              ? "text-terracotta"
              : "text-[#3D2A1A] dark:text-[#C4A882]")
          }
          style={{
            top: floating ? 8 : 18,
            fontSize: floating ? 11 : 15,
            letterSpacing: floating ? "0.05em" : "0",
            textTransform: floating ? "uppercase" : "none",
            fontWeight: floating ? 600 : 400,
          }}
        >
          {label}
        </label>
        {error && (
          <p className="mt-1.5 px-1 text-sm text-terracotta">{error}</p>
        )}
      </div>
    );
  }
);
