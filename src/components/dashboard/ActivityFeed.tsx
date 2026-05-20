import type { ActivityEvent } from "@/lib/dashboard-stats";

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  return (
    <section className="card flex h-full flex-col p-0">
      <header className="border-b border-sand px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta">
          Recent activity
        </p>
        <h2
          className="mt-1 leading-tight text-dark"
          style={{
            fontFamily: "var(--font-playfair, Georgia, serif)",
            fontWeight: 900,
            fontSize: "1.25rem",
          }}
        >
          Latest moves
        </h2>
      </header>

      {events.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-6 py-10 text-center">
          <p className="text-sm italic text-dark-muted">
            Nothing yet — add a pet and start sending match requests.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-sand">
          {events.map((e, i) => (
            <li key={i} className="flex items-start gap-3 px-5 py-3">
              <Glyph kind={e.kind} />
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug text-dark">{describe(e)}</p>
                <p className="mt-0.5 text-[11px] text-dark-muted">
                  {formatRelative(e.at)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function describe(e: ActivityEvent): React.ReactNode {
  switch (e.kind) {
    case "match.created":
      return (
        <>
          {e.youAreInitiator ? (
            <>
              You sent a match request for{" "}
              <strong className="font-semibold">{e.petName}</strong> → {e.counterpartName}
            </>
          ) : (
            <>
              <strong className="font-semibold">{e.counterpartName}</strong> wants to match
              with {e.petName}
            </>
          )}
        </>
      );
    case "match.accepted":
      return (
        <>
          <strong className="font-semibold text-[#1D9E75]">Accepted</strong> — {e.petName} &{" "}
          {e.counterpartName} are a match
        </>
      );
    case "match.rejected":
      return (
        <>
          Declined — {e.petName} & {e.counterpartName}
        </>
      );
    case "pet.added":
      return (
        <>
          Added <strong className="font-semibold">{e.petName}</strong> to your registry
        </>
      );
    case "health.added":
      return (
        <>
          Recorded <strong className="font-semibold">{e.title}</strong> for {e.petName}
        </>
      );
  }
}

function Glyph({ kind }: { kind: ActivityEvent["kind"] }) {
  const color =
    kind === "match.accepted"
      ? "#1D9E75"
      : kind === "match.rejected"
        ? "#3D2A1A"
        : "#C94B2A";
  const icon =
    kind === "match.accepted" ? "✓" : kind === "match.rejected" ? "·" : "♥";
  return (
    <span
      className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
      style={{ background: `${color}1A`, color }}
      aria-hidden="true"
    >
      {icon}
    </span>
  );
}

function formatRelative(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const diffMin = (Date.now() - date.getTime()) / 60_000;
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${Math.floor(diffMin)}m ago`;
  if (diffMin < 60 * 24) return `${Math.floor(diffMin / 60)}h ago`;
  if (diffMin < 60 * 24 * 7) return `${Math.floor(diffMin / (60 * 24))}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
