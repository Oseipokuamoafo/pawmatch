import {
  pendingViewStateFor,
  type AIScreenStatus,
} from "@/lib/vet-application-state";

interface VetApplicationPendingProps {
  name: string | null;
  practiceName: string | null;
  licenseState: string | null;
  aiScreenStatus: AIScreenStatus;
  submittedAt: string;
}

/**
 * Landing page shown to vet-only applicants while their application is
 * being reviewed. They have role=OWNER as a placeholder + zero pets, so
 * the regular owner dashboard would be a confusing empty state.
 *
 * We don't expose AI verdict details (status / confidence / evidence) on
 * this view — that's an admin-only signal. The applicant just sees that
 * something is happening and when to expect a decision. ERROR cases look
 * exactly like PENDING from this view (admin picks them up off-screen).
 */
export function VetApplicationPending({
  name,
  practiceName,
  licenseState,
  aiScreenStatus,
  submittedAt,
}: VetApplicationPendingProps) {
  const submittedLabel = new Date(submittedAt).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const view = pendingViewStateFor(aiScreenStatus);

  return (
    <div className="mx-auto max-w-3xl px-6 py-14 md:py-20">
      <div className="rounded-3xl border border-sand bg-surface p-8 shadow-card md:p-12">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-terracotta">
          Vet network · application in review
        </p>
        <h1
          className="mt-3 leading-[1.05] tracking-tight text-balance text-dark"
          style={{
            fontFamily: "var(--font-playfair, Georgia, serif)",
            fontWeight: 900,
            fontSize: "clamp(2.25rem, 5vw, 3rem)",
          }}
        >
          Welcome, Dr. {name?.split(" ").pop() ?? "—"}.
        </h1>

        <p className="mt-4 text-base leading-relaxed text-dark">
          {view.headline}
        </p>
        <p className="mt-2 text-base leading-relaxed text-dark-muted">
          {view.subhead}
        </p>

        <ol className="mt-8 space-y-4">
          <Step done label="Application submitted">
            <span className="text-dark-muted">{submittedLabel}</span>
          </Step>
          <Step
            done={view.screenStep === "done"}
            inflight={view.screenStep === "inflight"}
            label="Cross-referenced with state board"
          >
            <span className="text-dark-muted">
              {licenseState
                ? `${licenseState} veterinary medical board`
                : "State veterinary medical board"}
            </span>
          </Step>
          <Step
            done={false}
            inflight={view.adminStep === "inflight"}
            label="Admin sign-off + welcome email"
          >
            <span className="text-dark-muted">
              You&apos;ll get an email confirmation when you&apos;re live.
            </span>
          </Step>
        </ol>

        <div className="mt-10 rounded-2xl border border-sand bg-cream/40 p-5 text-sm text-dark-muted">
          <p className="font-semibold text-dark">What you can do right now</p>
          <p className="mt-1.5 leading-relaxed">
            Nothing — sit tight. Once approved, your dashboard becomes a vet
            inbox where owners send you health records to co-sign. No pet
            profile is required.
          </p>
          {practiceName && (
            <p className="mt-3 text-[12px] text-dark-muted/80">
              Practice on file: <span className="text-dark">{practiceName}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({
  done,
  inflight,
  label,
  children,
}: {
  done: boolean;
  inflight?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const indicator = done ? (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1D9E75]/15 text-[#1D9E75]"
      aria-hidden="true"
    >
      <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3">
        <path
          d="M2 6.5 5 9.5 10 3"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  ) : inflight ? (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E89A2A]/15 text-[#B0731A] dark:text-[#E89A2A]"
      aria-hidden="true"
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
    </span>
  ) : (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-sand text-dark-muted"
      aria-hidden="true"
    >
      <span className="h-1 w-1 rounded-full bg-current opacity-40" />
    </span>
  );

  return (
    <li className="flex items-start gap-3">
      {indicator}
      <div className="min-w-0">
        <p
          className={`text-sm font-semibold ${done || inflight ? "text-dark" : "text-dark-muted"}`}
        >
          {label}
        </p>
        <p className="mt-0.5 text-[13px] leading-relaxed">{children}</p>
      </div>
    </li>
  );
}
