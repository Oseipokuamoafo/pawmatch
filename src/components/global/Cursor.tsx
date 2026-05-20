"use client";

import { useEffect, useRef, useState } from "react";

import { useTheme } from "@/components/providers/ThemeProvider";

/**
 * Global custom cursor. Mounts once in root layout, listens on document.
 *
 *  - Dot snaps to the pointer
 *  - Ring lerps behind it at 0.18/frame
 *  - On hover over interactive elements both grow + recolor
 *  - On click, spawns 3 staggered ripples at the click position
 *
 * Early-returns on coarse pointers (touch devices), and gracefully
 * degrades for prefers-reduced-motion (snap to position, no ripples).
 */
export function Cursor() {
  const { theme } = useTheme();
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const ripplesRef = useRef<HTMLDivElement | null>(null);
  const [hovering, setHovering] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Skip entirely on touch / coarse-pointer devices
    if (window.matchMedia("(pointer: coarse)").matches) return;
    setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const dot = dotRef.current;
    const ring = ringRef.current;
    const ripples = ripplesRef.current;
    if (!dot || !ring) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;
    let rafId = 0;
    let pressed = false;

    function isInteractive(el: EventTarget | null): boolean {
      if (!(el instanceof Element)) return false;
      return Boolean(
        el.closest('a, button, [role="button"], input, label, select, textarea')
      );
    }

    function onMove(e: MouseEvent) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (prefersReduced) {
        // No lerp — snap ring to mouse
        ringX = mouseX;
        ringY = mouseY;
      }
    }
    function onOver(e: MouseEvent) {
      setHovering(isInteractive(e.target));
    }
    function onOut() {
      setHovering(false);
    }
    function onDown(e: MouseEvent) {
      pressed = true;
      if (prefersReduced || !ripples) return;
      for (let i = 0; i < 3; i++) {
        const el = document.createElement("div");
        el.className = "cursor-ripple";
        el.style.left = `${e.clientX}px`;
        el.style.top = `${e.clientY}px`;
        el.style.animationDelay = `${i * 0.11}s`;
        el.addEventListener("animationend", () => el.remove(), { once: true });
        ripples.appendChild(el);
      }
    }
    function onUp() {
      pressed = false;
    }

    function tick() {
      if (!prefersReduced) {
        ringX += (mouseX - ringX) * 0.18;
        ringY += (mouseY - ringY) * 0.18;
      }
      const dotScale = pressed ? 1.55 : 1;
      dot!.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%) scale(${dotScale})`;
      ring!.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
      rafId = requestAnimationFrame(tick);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseover", onOver);
    window.addEventListener("mouseout", onOut);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      window.removeEventListener("mouseout", onOut);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
    };
  }, [enabled]);

  if (!enabled) return null;

  const ringSize = hovering ? 52 : 36;
  const dotSize = hovering ? 5 : 11;
  const ringBorder =
    theme === "dark"
      ? hovering
        ? "rgba(232,213,183, 0.95)"
        : "rgba(232,213,183, 0.55)"
      : hovering
        ? "rgba(201,75,42, 0.85)"
        : "rgba(201,75,42, 0.45)";
  const dotColor = theme === "dark" ? "#E8D5B7" : "#C94B2A";

  return (
    <>
      <div
        ref={ringRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 hidden rounded-full md:block"
        style={{
          width: ringSize,
          height: ringSize,
          border: `1.5px solid ${ringBorder}`,
          zIndex: "var(--z-cursor)" as unknown as number,
          transition:
            "width 200ms ease, height 200ms ease, border-color 200ms ease",
          willChange: "transform",
        }}
      />
      <div
        ref={dotRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 hidden rounded-full md:block"
        style={{
          width: dotSize,
          height: dotSize,
          background: dotColor,
          zIndex: "calc(var(--z-cursor) + 1)" as unknown as number,
          transition:
            "width 200ms ease, height 200ms ease, background 200ms ease",
          willChange: "transform",
        }}
      />
      <div
        ref={ripplesRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 hidden md:block"
        style={{ zIndex: "calc(var(--z-cursor) - 1)" as unknown as number }}
      />
    </>
  );
}
