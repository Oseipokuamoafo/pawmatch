/**
 * Hairline + centered paw mark separator. Shared by all marketing sections.
 *
 * Uses the existing `.hairline` utility from globals.css and a paw glyph
 * whose silhouette matches the canvas `drawPaw` (main pad + 4 toes).
 */
export function PawDivider({ className = "" }: { className?: string }) {
  return (
    <div className={"relative my-16 flex items-center " + className}>
      <span className="hairline flex-1" />
      <PawGlyph className="mx-4 h-3.5 w-3.5" />
      <span className="hairline flex-1" />
    </div>
  );
}

function PawGlyph({ className = "" }: { className?: string }) {
  // 14px viewport — toe + pad layout mirrors the canvas drawPaw geometry.
  return (
    <svg
      viewBox="0 0 32 32"
      fill="#C94B2A"
      fillOpacity={0.5}
      className={className}
      aria-hidden="true"
    >
      <ellipse cx="7" cy="14" rx="3" ry="4" />
      <ellipse cx="25" cy="14" rx="3" ry="4" />
      <ellipse cx="12" cy="7" rx="2.6" ry="3.4" />
      <ellipse cx="20" cy="7" rx="2.6" ry="3.4" />
      <path d="M16 14c-5.5 0-8 4-8 7.5C8 25.5 11.5 28 16 28s8-2.5 8-6.5C24 18 21.5 14 16 14z" />
    </svg>
  );
}
