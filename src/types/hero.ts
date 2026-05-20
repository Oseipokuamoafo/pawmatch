export interface Orb {
  /** Origin position in [0, 1] viewport coordinates */
  ox: number;
  oy: number;
  /** Radius in px */
  r: number;
  /** Parallax depth — higher = more cursor sensitivity */
  depth: number;
  /** Independent drift phase for sine/cosine motion */
  phase: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hue: number;
}

export interface Stamp {
  x: number;
  y: number;
  angle: number;
  alpha: number;
  size: number;
}

export type HeroMode = "light" | "dark";
