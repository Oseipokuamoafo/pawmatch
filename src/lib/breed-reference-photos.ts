/**
 * Curated reference photos per breed — real Unsplash photographs that
 * show typical examples of the breed. Used by the offspring-profile
 * gallery so visitors see *actual* dogs of each parent breed, not
 * AI-generated previews.
 *
 * Adding a new breed: paste 2–3 Unsplash photo IDs (the part after
 * `photo-` in the URL) and a credit caption. Always verify the photo
 * is licensed for embed at the photo's Unsplash page before adding.
 *
 * Photo IDs map to URLs via `unsplash()` — same helper format the
 * Breed seed uses. The first photo in each list is preferred as the
 * "lead" image.
 */

const unsplash = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=900&q=80&fit=crop`;

export interface BreedReferencePhoto {
  url: string;
  caption: string;
}

const TABLE: Record<string, BreedReferencePhoto[]> = {
  "German Shepherd": [
    { url: unsplash("1568393691622-c7ba131d63b4"), caption: "Black-and-tan German Shepherd" },
    { url: unsplash("1551717743-49959800b1f6"), caption: "Working-line German Shepherd" },
    { url: unsplash("1589941013454-ec7d8f92b467"), caption: "GSD profile" },
  ],
  "American Pit Bull Terrier": [
    { url: unsplash("1583511666372-62fc211f8377"), caption: "Brindle American Pit Bull Terrier" },
    { url: unsplash("1605897472359-85e4b94d685d"), caption: "APBT — athletic build" },
    { url: unsplash("1597633244018-0201d0158aab"), caption: "Pit Bull, fawn coat" },
  ],
};

/**
 * Returns curated reference photos for a breed name, or an empty array
 * if we don't have any. Callers typically fall back to the breed's
 * own `heroImageUrl` + the actual pet's photo for any pair.
 */
export function getBreedReferencePhotos(
  breedName: string,
): BreedReferencePhoto[] {
  return TABLE[breedName] ?? [];
}
