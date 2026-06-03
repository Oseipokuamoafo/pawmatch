import * as Sentry from "@sentry/nextjs";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import type { Role } from "@/generated/prisma";

/**
 * Append-only audit log writer. Records compliance-relevant events so
 * we have a defensible answer when a vet board, insurer, or partner
 * asks "what actually happened with this record?".
 *
 * Design notes:
 *
 * 1. **Never block the caller.** Audit writes are best-effort — a DB
 *    hiccup must not break a vet co-sign or a Stripe webhook. We
 *    `await` the write so we can capture errors with context, but the
 *    helper itself swallows the failure (Sentry-captured) and returns
 *    normally. Callers should not try/catch around this.
 *
 * 2. **No FK relations.** AuditEntry.actorId is a plain string. If a
 *    user is deleted, their audit history must persist with the
 *    actorId preserved.
 *
 * 3. **Namespaced actions.** Use dot-separated lowercase strings:
 *    `vet.cosigned_record`, `subscription.canceled`. Keeps queries
 *    simple and lets us avoid an enum-bloat migration for every new
 *    event type.
 *
 * 4. **Metadata is freeform but constrained.** Store ids and state
 *    transitions — NOT full record contents (no decrypted message
 *    text, no full PHI). The point of an audit log is "what
 *    happened", not "what was said".
 */

/**
 * Canonical action names. Not exhaustive — callers may pass any string
 * — but using these constants keeps event names spelled consistently
 * across the codebase.
 */
export const AUDIT_ACTIONS = {
  // Vet co-sign workflow
  VET_COSIGNED_RECORD: "vet.cosigned_record",
  VET_DECLINED_COSIGN: "vet.declined_cosign",

  // Vet application lifecycle
  VET_APPLICATION_APPROVED: "vet_application.approved",
  VET_APPLICATION_REJECTED: "vet_application.rejected",
  VET_APPLICATION_AI_SCREENED: "vet_application.ai_screened",
  VET_APPLICATION_AUTO_APPROVED: "vet_application.auto_approved",

  // Owner verification
  VERIFICATION_APPROVED: "verification.approved",
  VERIFICATION_REJECTED: "verification.rejected",

  // Billing
  SUBSCRIPTION_CREATED: "subscription.created",
  SUBSCRIPTION_UPDATED: "subscription.updated",
  SUBSCRIPTION_CANCELED: "subscription.canceled",
  SUBSCRIPTION_PAYMENT_FAILED: "subscription.payment_failed",

  // Role changes
  USER_ROLE_CHANGED: "user.role_changed",
} as const;

export type AuditAction =
  | (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS]
  | (string & {});

export interface RecordAuditOptions {
  /** Who triggered the event. Null for system-initiated events. */
  actorId?: string | null;
  /** Snapshot the role at event time so later role changes don't
   *  rewrite history. */
  actorRole?: Role | null;
  /** Namespaced action string. Prefer constants from AUDIT_ACTIONS. */
  action: AuditAction;
  /** Model name of the subject row, e.g. "PetHealth", "User". */
  subjectType?: string;
  /** Id of the subject row. */
  subjectId?: string;
  /** Event-specific structured detail. Keep PHI minimal. */
  metadata?: Record<string, unknown>;
  /** Optional Request — IP + UA will be extracted from headers. */
  request?: Request | null;
}

/**
 * Write an audit entry. Best-effort: any failure is captured by Sentry
 * and the helper returns normally so callers never have to handle the
 * audit-side failure mode.
 *
 * Returns the entry id on success, null on failure.
 */
export async function recordAudit(
  opts: RecordAuditOptions,
): Promise<string | null> {
  try {
    const { ip, userAgent } = extractSource(opts.request ?? null);
    const entry = await prisma.auditEntry.create({
      data: {
        actorId: opts.actorId ?? null,
        actorRole: opts.actorRole ?? null,
        action: opts.action,
        subjectType: opts.subjectType ?? null,
        subjectId: opts.subjectId ?? null,
        metadata: opts.metadata
          ? (sanitizeMetadata(opts.metadata) as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        ip,
        userAgent,
      },
      select: { id: true },
    });
    return entry.id;
  } catch (err) {
    Sentry.captureException(err, {
      tags: { surface: "audit", action: opts.action },
      extra: {
        subjectType: opts.subjectType,
        subjectId: opts.subjectId,
      },
    });
    return null;
  }
}

function extractSource(req: Request | null): {
  ip: string | null;
  userAgent: string | null;
} {
  if (!req) return { ip: null, userAgent: null };
  const h = req.headers;
  // Prefer the first IP in X-Forwarded-For; fall back to X-Real-IP.
  // Don't trust either header — these are advisory for incident response,
  // not for authentication.
  const xff = h.get("x-forwarded-for");
  const ip = xff ? xff.split(",")[0].trim() : (h.get("x-real-ip") ?? null);
  const userAgent = h.get("user-agent");
  return { ip, userAgent: userAgent ?? null };
}

/**
 * Strip obvious secret-shaped values from metadata before writing. The
 * audit log is the wrong place for tokens, passwords, encryption keys,
 * or decrypted message content. Callers should already exclude these,
 * but this is a backstop.
 */
function sanitizeMetadata(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  const BANNED_KEYS = /password|secret|token|api[_-]?key|encryption|hash/i;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(metadata)) {
    if (BANNED_KEYS.test(k)) {
      out[k] = "[redacted]";
      continue;
    }
    out[k] = v;
  }
  return out;
}
