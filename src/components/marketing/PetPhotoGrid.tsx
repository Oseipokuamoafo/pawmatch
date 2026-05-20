"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

const PETS = [
  { src: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=400&h=400&fit=crop&crop=face", alt: "Golden retriever",  size: 168, top: "6%",  left: "4%",   z: 1 },
  { src: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=400&fit=crop&crop=face", alt: "Tabby cat",         size: 156, top: "10%", left: "78%",  z: 1 },
  { src: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=300&h=300&fit=crop&crop=face", alt: "Husky",             size: 130, top: "60%", left: "3%",   z: 2 },
  { src: "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=300&h=300&fit=crop&crop=face", alt: "Persian cat",       size: 128, top: "62%", left: "82%",  z: 2 },
  { src: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=220&h=220&fit=crop&crop=face",   alt: "Labrador",          size: 96,  top: "20%", left: "22%",  z: 3 },
  { src: "https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=220&h=220&fit=crop&crop=face", alt: "Kitten",            size: 92,  top: "26%", left: "68%",  z: 3 },
  { src: "https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?w=160&h=160&fit=crop&crop=face", alt: "Small dog",         size: 76,  top: "72%", left: "30%",  z: 4 },
  { src: "https://images.unsplash.com/photo-1518791841217-8f162f1912da?w=160&h=160&fit=crop&crop=face", alt: "Cat",               size: 76,  top: "68%", left: "62%",  z: 4 },
];

/**
 * 8 floating photos scattered across the dark hero. Each one has its own
 * sine drift + a cursor-parallax offset driven by the parent's mouse position.
 */
export function PetPhotoGrid() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const photoRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const container = containerRef.current;
    if (!container) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let t = 0;
    let rafId = 0;

    const params = PETS.map((_, i) => ({
      phase: Math.random() * Math.PI * 2,
      amp: 6 + Math.random() * 10,
      speed: 0.0007 + Math.random() * 0.0006,
      depth: ((i % 3) + 1) * 0.011,
    }));

    function onMove(e: MouseEvent) {
      mouseX = e.clientX;
      mouseY = e.clientY;
    }

    function tick() {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const px = (mouseX / W - 0.5) * 85;
      const py = (mouseY / H - 0.5) * 85;

      for (let i = 0; i < photoRefs.current.length; i++) {
        const el = photoRefs.current[i];
        if (!el) continue;
        const p = params[i];
        const ty = prefersReduced ? 0 : Math.sin(t * p.speed + p.phase) * p.amp;
        const tx =
          prefersReduced
            ? 0
            : Math.cos(t * p.speed * 0.7 + p.phase) * p.amp * 0.35;
        const cpx = px * p.depth;
        const cpy = py * p.depth;
        el.style.transform = `translate3d(${tx + cpx}px, ${ty + cpy}px, 0)`;
      }

      t += 16;
      rafId = requestAnimationFrame(tick);
    }

    window.addEventListener("mousemove", onMove);
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[5]"
    >
      {PETS.map((p, i) => (
        <div
          key={i}
          ref={(el) => {
            photoRefs.current[i] = el;
          }}
          className="absolute overflow-hidden rounded-full"
          style={{
            top: p.top,
            left: p.left,
            width: p.size,
            height: p.size,
            zIndex: p.z,
            boxShadow:
              "0 18px 40px -10px rgba(0,0,0,0.55), 0 0 0 4px rgba(232,213,183,0.08)",
            willChange: "transform",
          }}
        >
          <Image src={p.src} alt={p.alt} fill sizes={`${p.size}px`} className="object-cover" />
        </div>
      ))}
    </div>
  );
}
