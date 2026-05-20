import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmissionForm } from "@/components/verify/SubmissionForm";
import { StatusCard } from "@/components/verify/StatusCard";

export default async function VerifyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard/verify");

  // Breeder-only. Owners get redirected back home.
  if (session.user.role !== "BREEDER") {
    redirect("/dashboard");
  }

  const request = await prisma.verificationRequest.findUnique({
    where: { userId: session.user.id },
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 md:py-14">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-dark-muted hover:text-terracotta transition-colors"
      >
        <BackArrow className="h-3.5 w-3.5" />
        Dashboard
      </Link>

      <header className="mt-6 mb-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-terracotta">
          Breeder verification
        </p>
        <h1
          className="mt-3 leading-[1.05] tracking-tight text-balance text-dark"
          style={{
            fontFamily: "var(--font-playfair, Georgia, serif)",
            fontWeight: 900,
            fontSize: "clamp(2.25rem, 5vw, 3.25rem)",
          }}
        >
          {request?.status === "APPROVED" ? (
            <>The badge that matters.</>
          ) : (
            <>
              Get the{" "}
              <em style={{ color: "#3679D2" }}>Verified Breeder</em> badge.
            </>
          )}
        </h1>
        <p className="mt-3 max-w-xl text-base text-dark-muted leading-relaxed">
          Owners trust verified breeders first. Submit credentials, tell us
          about your program, and we&apos;ll review within 72 hours.
        </p>
      </header>

      {request ? (
        <StatusCard
          status={request.status}
          createdAt={request.createdAt}
          reviewedAt={request.reviewedAt}
          notes={request.notes}
          programDescription={request.programDescription}
          documents={request.documents}
        />
      ) : (
        <SubmissionForm />
      )}
    </div>
  );
}

function BackArrow({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M19 12H5M11 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
