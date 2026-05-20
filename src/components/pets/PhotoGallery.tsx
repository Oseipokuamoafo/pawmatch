"use client";

import { useState, useMemo } from "react";

import { LiveVerifiedBadge } from "./LiveVerifiedBadge";

interface PhotoGalleryProps {
  heroUrl: string | null;
  photos: string[];
  livePhotoUrl: string | null;
  speciesEmoji: string;
  petName: string;
}

export function PhotoGallery({
  heroUrl,
  photos,
  livePhotoUrl,
  speciesEmoji,
  petName,
}: PhotoGalleryProps) {
  // De-duplicate and order: hero first, then the rest, then live photo last (as a distinct entry).
  const ordered = useMemo(() => {
    const seen = new Set<string>();
    const out: { url: string; isLive: boolean }[] = [];
    if (heroUrl) {
      out.push({ url: heroUrl, isLive: false });
      seen.add(heroUrl);
    }
    for (const p of photos) {
      if (!seen.has(p)) {
        out.push({ url: p, isLive: false });
        seen.add(p);
      }
    }
    if (livePhotoUrl && !seen.has(livePhotoUrl)) {
      out.push({ url: livePhotoUrl, isLive: true });
    }
    return out;
  }, [heroUrl, photos, livePhotoUrl]);

  const [active, setActive] = useState(0);
  const current = ordered[active];

  return (
    <div className="flex flex-col gap-3">
      {/* ── Hero frame ───────────────────────────────────────────────── */}
      <div className="group relative aspect-[4/5] overflow-hidden rounded-card bg-sand">
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.url}
            alt={petName}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-8xl">
            {speciesEmoji}
          </div>
        )}

        {/* corner seal — only when current photo is the live one OR when a live photo exists and we're on it */}
        {livePhotoUrl && current?.isLive && (
          <div className="absolute top-4 right-4">
            <LiveVerifiedBadge size="md" />
          </div>
        )}

        {/* live-verified note for non-live frames */}
        {livePhotoUrl && current && !current.isLive && (
          <div className="absolute top-4 right-4">
            <span
              className="inline-flex items-center gap-1.5 rounded-pill bg-cream/95 backdrop-blur px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-sage shadow-sm"
              title="This pet has a verified live photo"
            >
              <Checkmark className="w-3 h-3" />
              Identity verified
            </span>
          </div>
        )}

        {/* counter */}
        {ordered.length > 1 && (
          <span className="absolute bottom-4 left-4 inline-flex items-center rounded-pill bg-dark/65 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
            {active + 1} / {ordered.length}
          </span>
        )}

        {/* nav buttons (visible on hover / always on mobile) */}
        {ordered.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setActive((a) => (a - 1 + ordered.length) % ordered.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-cream/90 text-dark shadow ring-1 ring-sand/60 backdrop-blur hover:bg-cream transition-opacity md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100"
              aria-label="Previous photo"
            >
              <Chevron className="w-4 h-4 rotate-180" />
            </button>
            <button
              type="button"
              onClick={() => setActive((a) => (a + 1) % ordered.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-cream/90 text-dark shadow ring-1 ring-sand/60 backdrop-blur hover:bg-cream transition-opacity md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100"
              aria-label="Next photo"
            >
              <Chevron className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* ── Thumbnails ───────────────────────────────────────────────── */}
      {ordered.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {ordered.map((p, i) => (
            <button
              key={p.url}
              type="button"
              onClick={() => setActive(i)}
              className={`relative aspect-square overflow-hidden rounded-card transition-all ${
                i === active
                  ? "ring-2 ring-terracotta ring-offset-2 ring-offset-cream"
                  : "ring-1 ring-sand hover:ring-terracotta/60"
              }`}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === active ? "true" : undefined}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="h-full w-full object-cover" />
              {p.isLive && (
                <span className="absolute bottom-1 right-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-sage text-white">
                  <Checkmark className="w-2.5 h-2.5" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Chevron({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Checkmark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" fill="none" className={className} aria-hidden="true">
      <path
        d="M2 6.5 L 5 9.5 L 10 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
