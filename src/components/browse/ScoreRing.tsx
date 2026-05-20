/**
 * Compact score ring. Used by browse cards + matches list.
 *
 * Two visual states:
 *   - default: terracotta ring stroke
 *   - capped: amber/sage ring stroke (auto-flag fired)
 */
export function ScoreRing({
  score,
  size = 56,
  capped = false,
}: {
  score: number;
  size?: number;
  capped?: boolean;
}) {
  const r = size * 0.38;
  const cx = size / 2;
  const cy = size / 2;
  const c = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(1, score / 100)) * c;
  const stroke = capped ? "#C94B2A" : "#C94B2A";
  const bg = capped ? "rgba(201,75,42,0.10)" : "rgba(232,213,183,0.55)";

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      aria-label={`Compatibility score ${score} out of 100`}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="var(--color-surface)" stroke={bg} strokeWidth={size * 0.07} />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth={size * 0.07}
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
        />
      </svg>
      <div
        className="absolute inset-0 flex items-center justify-center font-black text-dark"
        style={{
          fontFamily: "var(--font-playfair, Georgia, serif)",
          fontSize: size * 0.34,
        }}
      >
        {score}
      </div>
    </div>
  );
}
