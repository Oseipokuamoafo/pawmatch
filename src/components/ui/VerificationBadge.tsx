interface VerificationBadgeProps {
  size?: "sm" | "md";
  className?: string;
  /** Show "Verified Breeder" label. Set false for just the check chip. */
  showLabel?: boolean;
}

/**
 * Trust badge for verified breeders. Blue checkmark on a soft blue chip,
 * Inter semibold. Spec says blue checkmark — we use a calm trust blue
 * that sits cleanly next to terracotta.
 */
export function VerificationBadge({
  size = "sm",
  className = "",
  showLabel = true,
}: VerificationBadgeProps) {
  const isSm = size === "sm";
  const padding = isSm ? "px-2.5 py-1" : "px-3 py-1.5";
  const fontSize = isSm ? 11 : 13;
  const iconSize = isSm ? 11 : 13;
  const label = "Verified Breeder";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${padding} ${className}`}
      style={{
        background: "rgba(54,121,210,0.10)",
        color: "#3679D2",
        fontSize,
        letterSpacing: 0.2,
      }}
      title={label}
    >
      <CheckShield className="shrink-0" size={iconSize} />
      {showLabel && label}
    </span>
  );
}

function CheckShield({ size = 11, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 14 14"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M7 0.6 L12.4 2.4 V6.8 c0 3.1 -2.2 5.6 -5.4 6.6 -3.2 -1 -5.4 -3.5 -5.4 -6.6 V2.4 L7 0.6 z" />
      <path
        d="M4.4 7 L6.2 8.8 L9.6 5.4"
        stroke="#FFFFFF"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
