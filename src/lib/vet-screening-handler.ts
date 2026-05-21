import { Prisma } from "@/generated/prisma";

import { prisma } from "@/lib/prisma";
import { sendVetApplicationApproved } from "@/lib/email";
import {
  screenVetApplication,
  shouldAutoApprove,
  type ScreenApplicantInput,
  type VetScreenVerdict,
} from "@/lib/vet-screening";

/**
 * Orchestrates: run AI screen → persist verdict on User → auto-approve when
 * the verdict crosses the trust bar (status="match" + high confidence).
 *
 * Designed to be called as fire-and-forget from the register route — the
 * Promise we return resolves with the outcome but callers are free to skip
 * awaiting it (the custom Next + Socket.io server keeps the process alive
 * long enough for the background promise to complete).
 *
 * On failure the user row gets `aiScreenStatus = ERROR` so the admin queue
 * surfaces the application for manual review.
 */
export interface ScreenOutcome {
  userId: string;
  verdict: VetScreenVerdict | null;
  autoApproved: boolean;
}

export async function runScreenAndPersist(
  userId: string,
  applicant: ScreenApplicantInput,
): Promise<ScreenOutcome> {
  // Mark as PENDING so the admin queue shows the screen is in-flight.
  await prisma.user
    .update({
      where: { id: userId },
      data: {
        aiScreenStatus: "PENDING",
        aiScreenedAt: null,
        aiScreenConfidence: null,
        aiScreenReason: null,
        aiScreenEvidence: Prisma.JsonNull,
      },
    })
    .catch(() => {
      /* user may have been deleted between request + screen — ignore */
    });

  const verdict = await screenVetApplication(applicant);

  if (!verdict) {
    await prisma.user
      .update({
        where: { id: userId },
        data: {
          aiScreenStatus: "ERROR",
          aiScreenedAt: new Date(),
          aiScreenReason: "AI screen failed (no API key, network, or parsing).",
        },
      })
      .catch(() => {});
    return { userId, verdict: null, autoApproved: false };
  }

  const statusMap = {
    match: "MATCH",
    mismatch: "MISMATCH",
    no_data: "NO_DATA",
  } as const;

  await prisma.user.update({
    where: { id: userId },
    data: {
      aiScreenStatus: statusMap[verdict.status],
      aiScreenedAt: new Date(),
      aiScreenConfidence: verdict.confidence,
      aiScreenReason: verdict.reason,
      aiScreenEvidence: verdict.evidence as unknown as Prisma.InputJsonValue,
    },
  });

  // Auto-approve when the verdict crosses the bar AND the user is still
  // PENDING (an admin may have already acted manually).
  if (shouldAutoApprove(verdict)) {
    const current = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        vetApplicationStatus: true,
        vetPracticeName: true,
      },
    });
    if (current?.vetApplicationStatus === "PENDING") {
      await prisma.user.update({
        where: { id: userId },
        data: {
          role: "VET",
          vetApplicationStatus: "APPROVED",
          vetApprovedAt: new Date(),
          aiAutoApprovedAt: new Date(),
        },
      });
      await sendVetApplicationApproved({
        to: current.email,
        name: current.name,
        practiceName: current.vetPracticeName,
      });
      return { userId, verdict, autoApproved: true };
    }
  }

  return { userId, verdict, autoApproved: false };
}

/**
 * Fire-and-forget wrapper. Logs errors so they don't disappear silently
 * and never throws to the caller.
 */
export function kickoffScreen(
  userId: string,
  applicant: ScreenApplicantInput,
): void {
  void runScreenAndPersist(userId, applicant).catch((err) => {
    console.error("[vet-screening] background run failed:", err);
  });
}
