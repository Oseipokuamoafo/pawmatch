"use client";

export type DashboardFilter =
  | "all"
  | "dogs"
  | "cats"
  | "male"
  | "female"
  | "verified";

const OPTIONS: { key: DashboardFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "dogs", label: "Dogs" },
  { key: "cats", label: "Cats" },
  { key: "male", label: "Male" },
  { key: "female", label: "Female" },
  { key: "verified", label: "Live verified" },
];

export function FilterBar({
  active,
  onChange,
  counts,
}: {
  active: DashboardFilter;
  onChange: (f: DashboardFilter) => void;
  counts: Record<DashboardFilter, number>;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="tablist"
      aria-label="Filter pets"
    >
      {OPTIONS.map((opt) => {
        const isActive = active === opt.key;
        const count = counts[opt.key];
        return (
          <button
            key={opt.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            data-selected={isActive}
            onClick={() => onChange(opt.key)}
            className="chip inline-flex items-center gap-2 py-2"
          >
            {opt.label}
            <span
              className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
              style={
                isActive
                  ? { background: "rgba(255,255,255,0.25)", color: "#fff" }
                  : { background: "rgba(28,16,8,0.08)", color: "#3D2A1A" }
              }
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
