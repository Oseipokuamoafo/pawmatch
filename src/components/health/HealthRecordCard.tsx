import type { HealthRecordType } from "@/generated/prisma";

interface HealthRecordCardProps {
  record: {
    id: string;
    title: string;
    type: HealthRecordType;
    recordDate: Date | string;
    isVerified: boolean;
    verifiedBy?: string | null;
    verifiedAt?: Date | string | null;
    fileUrl: string | null;
    notes: string | null;
  };
}

const TYPE_LABEL: Record<HealthRecordType, string> = {
  VACCINE: "Vaccine",
  DNA: "DNA",
  VET_VISIT: "Vet visit",
  CERTIFICATE: "Certificate",
};

export function HealthRecordCard({ record }: HealthRecordCardProps) {
  const recordDate = new Date(record.recordDate);
  const dateLabel = recordDate.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <article className="card flex items-start gap-4">
      <RecordIcon type={record.type} />

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3
            className="leading-tight text-dark"
            style={{
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontWeight: 700,
              fontSize: "1.125rem",
            }}
          >
            {record.title}
          </h3>
          <TypeChip type={record.type} />
        </div>

        <p className="mt-1 text-sm text-dark-muted">
          {dateLabel}
          {record.isVerified && record.verifiedBy ? ` · verified by ${record.verifiedBy}` : ""}
        </p>

        {record.notes && (
          <p className="mt-2 text-sm leading-relaxed text-dark-muted">
            {record.notes}
          </p>
        )}

        {record.fileUrl && (
          <a
            href={record.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-terracotta hover:text-[#B03E22]"
          >
            View document
            <ExternalArrow className="h-3 w-3" />
          </a>
        )}
      </div>

      <VerifiedBadge verified={record.isVerified} />
    </article>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────── */

function VerifiedBadge({ verified }: { verified: boolean }) {
  if (verified) {
    return (
      <span
        className="inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold"
        style={{ background: "rgba(29,158,117,0.15)", color: "#1D9E75" }}
      >
        <Check className="h-3 w-3" />
        Verified
      </span>
    );
  }
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
      style={{ background: "rgba(232,213,183,0.55)", color: "#3D2A1A" }}
      title="Owner-reported — not yet verified by a vet"
    >
      <span
        className="block h-1.5 w-1.5 rounded-full"
        style={{ background: "#3D2A1A", opacity: 0.45 }}
      />
      Self-reported
    </span>
  );
}

function TypeChip({ type }: { type: HealthRecordType }) {
  return (
    <span
      className="inline-flex items-center rounded-full bg-sand px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-dark-muted"
    >
      {TYPE_LABEL[type]}
    </span>
  );
}

function RecordIcon({ type }: { type: HealthRecordType }) {
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-terracotta"
      style={{ background: "rgba(201,75,42,0.10)" }}
    >
      {type === "VACCINE" && <SyringeIcon className="h-5 w-5" />}
      {type === "DNA" && <DnaIcon className="h-5 w-5" />}
      {type === "VET_VISIT" && <StethoscopeIcon className="h-5 w-5" />}
      {type === "CERTIFICATE" && <CertIcon className="h-5 w-5" />}
    </span>
  );
}

/* ─── Icons ──────────────────────────────────────────────────────────── */

function Check({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" fill="none" className={className} aria-hidden="true">
      <path
        d="M2 6.5 5 9.5 10 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExternalArrow({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" fill="none" className={className} aria-hidden="true">
      <path
        d="M3 9l6-6M4 3h5v5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SyringeIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M14 4l6 6M11 7l6 6M4.5 19.5l3-3m0 0L13 11l5 5-5.5 5.5a2 2 0 01-3-3z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function DnaIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M6 3c0 6 12 6 12 12s-12 6-12 12M18 3c0 6-12 6-12 12s12 6 12 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M8 7h8M8 17h8M9 11h6M9 13h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function StethoscopeIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M6 3v6a4 4 0 008 0V3M10 17a4 4 0 108 0v-2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="18" cy="15" r="2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
function CertIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="4" y="4" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 9h8M8 13h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="16" cy="18" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
