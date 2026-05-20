/**
 * Brand tokens — single source of truth.
 * Marketing-grade components hardcode the hex (per UI spec).
 * Non-marketing components can import these so they can't drift.
 */
export const BRAND = {
  TERRA: "#C94B2A",
  TERRA_LT: "#E8593C",
  TERRA_DK: "#B03E22",
  CREAM: "#F5EFE6",
  CREAM_WARM: "#FDF8F2",
  SAND: "#E8D5B7",
  DARK: "#1C1008",
  DARK_MUTED: "#3D2A1A",
  VERIFIED: "#1D9E75",
  SAGE: "#7A9E7E",
} as const;

export const FONTS = {
  playfair: "var(--font-playfair, Georgia, serif)",
  inter: "var(--font-inter, system-ui, sans-serif)",
} as const;
