import { CameraIcon } from "./LivePhotoCapture";

interface LiveVerifiedBadgeProps {
  size?: "sm" | "md";
  className?: string;
}

export function LiveVerifiedBadge({ size = "sm", className = "" }: LiveVerifiedBadgeProps) {
  const sizeClasses =
    size === "sm" ? "px-2 py-0.5 text-xs gap-1" : "px-2.5 py-1 text-sm gap-1.5";
  const iconSize = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";

  return (
    <span
      className={`inline-flex items-center rounded-pill bg-sage text-white font-medium ${sizeClasses} ${className}`}
      title="This pet has a verified live photo"
    >
      <CameraIcon className={iconSize} />
      Live Verified
    </span>
  );
}
