/**
 * Feature flags read from env at module load. Server-only helpers
 * here; client components should accept the resolved boolean as a
 * prop instead of re-reading process.env (which would force a
 * NEXT_PUBLIC_ var and leak the flag surface).
 *
 * Convention: `NEXT_PUBLIC_FEATURE_*` for anything the client needs
 * to know about (rare); plain `FEATURE_*` for server-only gates.
 */

/**
 * Phase 4 — Claude API breeding assistant. Disabled by default until
 * Stripe + Pro+ tier monetization is wired up. Set
 * `FEATURE_BREEDING_ASSISTANT=on` in `.env.local` to enable on dev.
 */
export function isBreedingAssistantEnabled(): boolean {
  return process.env.FEATURE_BREEDING_ASSISTANT === "on";
}
