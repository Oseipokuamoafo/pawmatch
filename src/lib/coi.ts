/**
 * Coefficient of Inbreeding (COI) engine — Wright's path coefficient method,
 * 5-generation pedigree.
 *
 * This is currently a **deterministic stub** until pedigree data is wired in
 * (Phase 2: pedigree viewer + DNA import). It returns a stable per-pair value
 * derived from the two pet IDs so the UI is reproducible across renders
 * without random noise.
 *
 * When real pedigree data arrives:
 *   - Walk both pets' ancestor trees (5 generations / 31 ancestors each)
 *   - For each common ancestor A, contribute (0.5)^(n1+n2+1) * (1 + F_A)
 *     where n1, n2 are the number of generations from A to each pet and
 *     F_A is the inbreeding coefficient of that ancestor.
 *
 * Returns COI as a percentage (0–25 typical, clamped to that range).
 */
export function calculateCOI(petAId: string, petBId: string): number {
  // Deterministic pseudo-noise — same pair always returns same value.
  const seed = hashString(`${petAId}::${petBId}`);
  // Bias the distribution so most pairs land in 2%–8% (healthy range), with
  // a long tail toward the 12.5% danger threshold.
  const u = (seed % 10000) / 10000;
  const skewed = Math.pow(u, 1.6);
  const raw = skewed * 18 + 1.5; // 1.5%–19.5%
  return Math.round(raw * 10) / 10;
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}
