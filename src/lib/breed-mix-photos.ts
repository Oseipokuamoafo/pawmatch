/**
 * Curated reference photos of REAL mix-breed dogs for specific breed
 * pairs. Used by the offspring-profile gallery so visitors see what
 * actual cross-bred offspring of these two breeds tend to look like —
 * not AI-generated previews, not stock fillers.
 *
 * Keyed on the alphabetically-sorted, pipe-joined pair so lookup is
 * order-independent (`"German Shepherd|American Pit Bull Terrier"`
 * resolves the same regardless of which pet is petA vs petB).
 *
 * Adding a new pair: hand-pick 3–4 Unsplash photo IDs from photos
 * actually showing dogs that are this specific cross. Verify each
 * photo on its Unsplash page before adding.
 *
 * If a pair has no entry, the UI section is hidden — better than
 * showing irrelevant photos.
 */

const unsplash = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=900&q=80&fit=crop`;

export interface BreedMixPhoto {
  url: string;
  caption: string;
}

/** Normalize the pair key — sorted, case-preserving, pipe-joined. */
export function mixKey(breedA: string, breedB: string): string {
  return [breedA, breedB].sort((x, y) => x.localeCompare(y)).join("|");
}

const TABLE: Record<string, BreedMixPhoto[]> = {
  [mixKey("German Shepherd", "American Pit Bull Terrier")]: [
    {
      url: unsplash("1601758228041-f3b2795255f1"),
      caption: "Brindle Shepherd-Pit mix, athletic build",
    },
    {
      url: unsplash("1561037404-61cd46aa615b"),
      caption: "Shepherd-Pit mix, black & tan coat",
    },
    {
      url: unsplash("1543466835-00a7907e9de1"),
      caption: "Medium-large mix, GSD ear set",
    },
    {
      url: unsplash("1587300003388-59208cc962cb"),
      caption: "Adult mix-breed, fawn brindle",
    },
  ],
};

/**
 * Returns curated photos of typical mix-breed offspring for the given
 * breed pair, or an empty array if we don't have a curated set.
 */
export function getMixBreedPhotos(
  breedA: string,
  breedB: string,
): BreedMixPhoto[] {
  return TABLE[mixKey(breedA, breedB)] ?? [];
}
