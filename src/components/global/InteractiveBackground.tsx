"use client";

import { useEffect, useRef } from "react";

import { useTheme } from "@/components/providers/ThemeProvider";

/**
 * Global, fixed canvas backdrop. Mounted once in the root layout so it
 * persists across navigation without re-initializing.
 *
 * Tuned slightly lighter than the marketing-only original to stay calm
 * behind form-heavy pages:
 *   - 40 particles (was 55)
 *   - paw stamp alpha decays at 0.0028 / frame (was 0.0018)
 *   - cursor spotlight radius 110 (was 140)
 *
 * Respects prefers-reduced-motion: paints base fill + static orbs once,
 * then skips the animation loop.
 */
export function InteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const isCoarse = window.matchMedia("(pointer: coarse)").matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let t = 0;
    let rafId = 0;
    let lastStampAt = 0;

    type Orb = {
      ox: number;
      oy: number;
      r: number;
      depth: number;
      phase: number;
    };
    type Particle = { x: number; y: number; vx: number; vy: number; r: number };
    type Stamp = {
      x: number;
      y: number;
      angle: number;
      alpha: number;
      size: number;
    };

    const mouse = { x: -9999, y: -9999, vx: 0, vy: 0 };
    const orbs: Orb[] = [
      { ox: 0.15, oy: 0.2, r: 320, depth: 1.0, phase: 0 },
      { ox: 0.85, oy: 0.15, r: 260, depth: 0.7, phase: 1.05 },
      { ox: 0.5, oy: 0.55, r: 380, depth: 1.4, phase: 2.1 },
      { ox: 0.1, oy: 0.8, r: 240, depth: 0.6, phase: 3.14 },
      { ox: 0.9, oy: 0.75, r: 300, depth: 1.2, phase: 4.18 },
      { ox: 0.4, oy: 0.95, r: 280, depth: 0.9, phase: 5.23 },
    ];
    const particles: Particle[] = Array.from({ length: 40 }, () => ({
      x: Math.random() * 800,
      y: Math.random() * 600,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: 0.8 + Math.random() * 1.8,
    }));
    const stamps: Stamp[] = [];

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.floor(width * dpr);
      canvas!.height = Math.floor(height * dpr);
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function onMouseMove(e: MouseEvent) {
      mouse.vx = e.clientX - mouse.x;
      mouse.vy = e.clientY - mouse.y;
      mouse.x = e.clientX;
      mouse.y = e.clientY;

      if (prefersReduced || isCoarse) return;
      const now = performance.now();
      if (now - lastStampAt > 115) {
        lastStampAt = now;
        stamps.push({
          x: e.clientX,
          y: e.clientY,
          angle: Math.atan2(mouse.vy, mouse.vx) + Math.PI / 2,
          alpha: theme === "dark" ? 0.32 : 0.22,
          size: 26 + Math.random() * 12,
        });
        if (stamps.length > 60) stamps.splice(0, stamps.length - 60);
      }
    }

    function onMouseLeave() {
      mouse.x = -9999;
      mouse.y = -9999;
    }

    function drawOrbs(staticOnly = false) {
      for (const orb of orbs) {
        let cx = orb.ox * width;
        let cy = orb.oy * height;
        if (!staticOnly) {
          cx += Math.cos(t * 0.0006 + orb.phase) * 24;
          cy += Math.sin(t * 0.0008 + orb.phase) * 18;
          cx += (mouse.x / width - 0.5) * orb.depth * 22;
          cy += (mouse.y / height - 0.5) * orb.depth * 22;
        }
        const grad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, orb.r);
        if (theme === "dark") {
          grad.addColorStop(0, "rgba(100,30,10, 0.28)");
          grad.addColorStop(1, "rgba(100,30,10, 0)");
        } else {
          grad.addColorStop(0, "rgba(201,75,42, 0.10)");
          grad.addColorStop(1, "rgba(201,75,42, 0)");
        }
        ctx!.fillStyle = grad;
        ctx!.fillRect(0, 0, width, height);
      }
    }

    function drawShimmer() {
      const baseAlpha = theme === "dark" ? 0.04 : 0.025;
      for (let y = 0; y < height; y += 58) {
        const a = (Math.sin(t * 0.0011 + y * 0.013) + 1) * 0.5 * baseAlpha;
        ctx!.fillStyle = `rgba(201,75,42, ${a.toFixed(4)})`;
        ctx!.fillRect(0, y, width, 14);
      }
    }

    function drawParticles() {
      const repelRadius = 90;
      const linkRadius = 110;
      const linkBase = theme === "dark" ? 0.18 : 0.09;
      const dotAlpha = theme === "dark" ? 0.5 : 0.4;

      for (const p of particles) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < repelRadius * repelRadius && d2 > 0.0001) {
          const d = Math.sqrt(d2);
          const force = (1 - d / repelRadius) * 0.6;
          p.vx += (dx / d) * force;
          p.vy += (dy / d) * force;
        }
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;
      }

      ctx!.lineWidth = 0.7;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < linkRadius * linkRadius) {
            const alpha = (1 - Math.sqrt(d2) / linkRadius) * linkBase;
            ctx!.strokeStyle = `rgba(201,75,42, ${alpha.toFixed(4)})`;
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(b.x, b.y);
            ctx!.stroke();
          }
        }
      }
      ctx!.fillStyle =
        theme === "dark"
          ? `rgba(232,213,183, ${dotAlpha})`
          : `rgba(201,75,42, ${dotAlpha})`;
      for (const p of particles) {
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    function drawSpotlight() {
      if (mouse.x < 0 || mouse.y < 0) return;
      const grad = ctx!.createRadialGradient(
        mouse.x,
        mouse.y,
        0,
        mouse.x,
        mouse.y,
        110
      );
      grad.addColorStop(0, "rgba(201,75,42, 0.08)");
      grad.addColorStop(1, "rgba(201,75,42, 0)");
      ctx!.fillStyle = grad;
      ctx!.fillRect(mouse.x - 110, mouse.y - 110, 220, 220);
    }

    function drawPaw(x: number, y: number, size: number, angle: number) {
      ctx!.save();
      ctx!.translate(x, y);
      ctx!.rotate(angle);
      ellipse(0, size * 0.18, size * 0.44, size * 0.36, 0);
      const toes: [number, number, number, number, number][] = [
        [-0.38, -0.22, 0.2, 0.17, -0.38],
        [0.38, -0.22, 0.2, 0.17, 0.38],
        [-0.2, -0.44, 0.18, 0.15, -0.18],
        [0.2, -0.44, 0.18, 0.15, 0.18],
      ];
      for (const [tx, ty, rx, ry, rot] of toes) {
        ellipse(tx * size, ty * size, rx * size, ry * size, rot);
      }
      ctx!.restore();
    }

    function ellipse(x: number, y: number, rx: number, ry: number, rot: number) {
      ctx!.beginPath();
      ctx!.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
      ctx!.fill();
    }

    function drawStamps() {
      for (let i = stamps.length - 1; i >= 0; i--) {
        stamps[i].alpha -= 0.0028;
        if (stamps[i].alpha <= 0) stamps.splice(i, 1);
      }
      for (const s of stamps) {
        ctx!.fillStyle = `rgba(201,75,42, ${s.alpha.toFixed(4)})`;
        drawPaw(s.x, s.y, s.size, s.angle);
      }
    }

    function paintBaseFill() {
      ctx!.fillStyle = theme === "dark" ? "#1C1008" : "#F5EFE6";
      ctx!.fillRect(0, 0, width, height);
    }

    function frame() {
      paintBaseFill();
      drawOrbs();
      drawShimmer();
      drawParticles();
      drawSpotlight();
      drawStamps();
      t += 16;
      rafId = requestAnimationFrame(frame);
    }

    // Initial paint
    resize();

    if (prefersReduced) {
      paintBaseFill();
      drawOrbs(true);
    } else {
      rafId = requestAnimationFrame(frame);
    }

    // Resize via ResizeObserver on documentElement (handles route changes,
    // dynamic viewport changes, etc.)
    const ro = new ResizeObserver(() => {
      resize();
      if (prefersReduced) {
        paintBaseFill();
        drawOrbs(true);
      }
    });
    ro.observe(document.documentElement);
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseleave", onMouseLeave);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: "var(--z-background)" as unknown as number }}
    />
  );
}
