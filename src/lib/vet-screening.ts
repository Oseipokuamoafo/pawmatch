import Anthropic from "@anthropic-ai/sdk";
import * as Sentry from "@sentry/nextjs";

/**
 * Slice 4 — AI auto-screen for vet license applications.
 *
 * Calls Claude with the server-side `web_search` tool and asks it to
 * cross-reference the applicant's license against the issuing state's
 * veterinary medical board public licensee directory. The model returns a
 * structured verdict (status + confidence + evidence) which the caller
 * persists on `User.aiScreen*` and uses to route the application:
 *
 *   - status="match" + confidence ≥ AUTO_APPROVE_MIN → auto-promote to VET
 *   - everything else                                → human admin review
 *
 * Trust model: a high-confidence match *recommends* approval; a human still
 * clicks the button on the admin queue for full audit coverage. Auto-approve
 * is reserved for cases where the .gov board page directly corroborates the
 * application — the model is asked to be conservative on confidence and to
 * never fabricate evidence.
 */

/** Discriminator literal — matches the JSON schema returned by the model. */
export type ScreenStatus = "match" | "mismatch" | "no_data";

export interface ScreenEvidence {
  url: string;
  title: string;
  quote: string;
}

export interface VetScreenVerdict {
  status: ScreenStatus;
  confidence: number;
  reason: string;
  evidence: ScreenEvidence[];
}

export interface ScreenApplicantInput {
  name: string;
  licenseNumber: string;
  licenseState: string;
  practiceName: string;
  practiceAddress: string;
}

/** Default model + threshold — overridable via env so we can swap to a more
 *  capable model (Sonnet 4.6) without a code change if reliability slips. */
const DEFAULT_MODEL = process.env.VET_SCREEN_MODEL ?? "claude-haiku-4-5";
export const AUTO_APPROVE_MIN = Number.parseFloat(
  process.env.VET_SCREEN_AUTO_APPROVE_MIN ?? "0.85",
);

/** The rubric — long, frozen, and cached on the prefix so we only pay full
 *  input cost on the first applicant. Volatile applicant data lives in the
 *  user message, after the cache breakpoint. */
const SYSTEM_PROMPT = `You are a veterinary license verification analyst for PawMatch, a pet breeding matchmaking platform that depends on a trustworthy network of licensed vets. Your job is to verify whether an applicant's self-reported veterinary license is legitimate by cross-referencing public state veterinary medical board records.

For every application you receive, follow this procedure:

1. Use the web_search tool to locate the public licensee directory for the issuing state's veterinary medical board. Useful queries include:
   - "<state> veterinary medical board license lookup"
   - "<state> board of veterinary medicine verify"
   - "<state> DPR veterinarian license search"
   Prefer official .gov pages (boards of veterinary medicine, departments of professional regulation, secretaries of state). Treat third-party aggregators (Vetster, Healthgrades, Yelp, etc.) as weak corroboration only — never as the sole basis for a "match".

2. Within the official directory, find the record matching the supplied license number. Read the licensee's name, license status, and any practice info shown.

3. Compare the public record to the application:
   - License number — must match exactly for "match".
   - Licensee name — first + last must reasonably match the applicant. Minor differences (middle initial, "Dr." prefix, capitalization) are fine.
   - License status — only "active", "current", "in good standing", or equivalent qualifies for "match". "Expired", "lapsed", "suspended", "revoked", "probation", or "inactive" → "mismatch".
   - Practice name + address — use as corroborating evidence. Out-of-date practice info alone is NOT a mismatch (vets change practices often); it just reduces confidence.

4. Return your verdict as JSON matching the exact schema specified in the output configuration:
   - status: "match" | "mismatch" | "no_data"
       · "match"    — public record found and corroborates the application
       · "mismatch" — public record found but contradicts (wrong name, expired, suspended, revoked, etc.)
       · "no_data"  — no public record found, the state board lookup is paid-only / inaccessible, or the search returned nothing
   - confidence: a number in [0.0, 1.0] reflecting how certain you are:
       · ≥0.90 — direct license-number + name match on an official state .gov board page, status active
       · 0.70–0.89 — strong match with minor discrepancies (e.g. different practice address) or via state board page that's clearly authoritative but not .gov
       · 0.50–0.69 — partial evidence (e.g. name on a third-party aggregator only)
       · <0.50    — weak, ambiguous, or contradictory evidence
   - reason: one paragraph aimed at a human reviewer. Be specific — name the source you matched on, what aligned, and what didn't.
   - evidence: an array of the sources you ACTUALLY consulted, each with { url, title, quote }. The "quote" must be a short verbatim snippet from the page that supports your verdict — never invented.

Hard rules:
- NEVER fabricate evidence. If you couldn't find a source, return "no_data" with an empty evidence array.
- A suspended, revoked, expired, or inactive license is a "mismatch", not "no_data".
- If a state's board only offers paid or login-walled lookup, return "no_data" with confidence ≤0.3 and explain in "reason" — a human will follow up manually.
- Be conservative. When in doubt, drop the confidence score by 0.1–0.2. A false positive on a fake vet is far costlier than a manual review.
- Do not include applicant PII in the "evidence.quote" field beyond what the public board itself publishes (a name on the board roster is fine; a phone number or home address is not).
- Return ONLY the JSON verdict — no preamble, no explanation outside the schema.`;

const VERDICT_SCHEMA = {
  type: "object",
  properties: {
    status: { type: "string", enum: ["match", "mismatch", "no_data"] },
    confidence: { type: "number" },
    reason: { type: "string" },
    evidence: {
      type: "array",
      items: {
        type: "object",
        properties: {
          url: { type: "string" },
          title: { type: "string" },
          quote: { type: "string" },
        },
        required: ["url", "title", "quote"],
        additionalProperties: false,
      },
    },
  },
  required: ["status", "confidence", "reason", "evidence"],
  additionalProperties: false,
} as const;

/* ─── Public API ─────────────────────────────────────────────────────── */

/**
 * Run the Claude-driven screen and return a structured verdict.
 *
 * Returns `null` when the API key is missing or the API call fails — callers
 * persist this as `aiScreenStatus=ERROR` so the admin queue surfaces the
 * application normally for human review.
 */
export async function screenVetApplication(
  applicant: ScreenApplicantInput,
): Promise<VetScreenVerdict | null> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn(
      "[vet-screening] ANTHROPIC_API_KEY missing — skipping AI screen.",
    );
    return null;
  }

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 4096,
      // Cache the rubric — it's ~1.5K tokens and reused for every applicant.
      // Volatile applicant data is in the user message (after the breakpoint).
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: [
        // web_search_20250305 — the broadly available version. The newer
        // _20260209 (with dynamic filtering) is Opus/Sonnet-only and would
        // 400 on Haiku 4.5. Bump to _20260209 if VET_SCREEN_MODEL is
        // switched to claude-sonnet-4-6.
        { type: "web_search_20250305", name: "web_search" },
      ],
      output_config: {
        format: { type: "json_schema", schema: VERDICT_SCHEMA },
      },
      messages: [
        {
          role: "user",
          content: renderApplicantPrompt(applicant),
        },
      ],
    });

    return extractVerdict(response);
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.error(
        `[vet-screening] Anthropic API error ${err.status}:`,
        err.message,
      );
    } else {
      console.error("[vet-screening] unexpected error:", err);
    }
    Sentry.captureException(err, {
      tags: { surface: "vet-screening", model: DEFAULT_MODEL },
      extra: {
        licenseState: applicant.licenseState,
        // Don't leak the license number or applicant name to Sentry —
        // PII boundary. State is fine; it's how we segment errors by
        // state-board flakiness.
      },
    });
    return null;
  }
}

/**
 * Decide whether a verdict crosses the auto-approve bar.
 * Exported so tests can pin the policy without invoking the SDK.
 */
export function shouldAutoApprove(verdict: VetScreenVerdict | null): boolean {
  if (!verdict) return false;
  if (verdict.status !== "match") return false;
  if (
    typeof verdict.confidence !== "number" ||
    Number.isNaN(verdict.confidence)
  ) {
    return false;
  }
  return verdict.confidence >= AUTO_APPROVE_MIN;
}

/* ─── Internals ──────────────────────────────────────────────────────── */

function renderApplicantPrompt(a: ScreenApplicantInput): string {
  return [
    "Verify this veterinary license application for PawMatch:",
    "",
    `- Applicant name: ${a.name}`,
    `- License number: ${a.licenseNumber}`,
    `- Issuing state / region: ${a.licenseState}`,
    `- Practice name: ${a.practiceName}`,
    `- Practice address: ${a.practiceAddress}`,
    "",
    "Search the state veterinary medical board's public licensee directory, then return your structured verdict per the rubric.",
  ].join("\n");
}

/**
 * Pull the JSON verdict from the response. With `output_config.format`
 * the final text block contains the schema-conformant JSON; any earlier
 * text blocks are tool-search narration we ignore.
 */
export function extractVerdict(
  response: Anthropic.Message,
): VetScreenVerdict | null {
  // Walk content backwards — the final text block is the structured output.
  for (let i = response.content.length - 1; i >= 0; i--) {
    const block = response.content[i];
    if (block.type !== "text") continue;
    const parsed = safeParseVerdict(block.text);
    if (parsed) return parsed;
  }
  console.warn("[vet-screening] no JSON verdict found in response content");
  return null;
}

function safeParseVerdict(raw: string): VetScreenVerdict | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;

  const obj = data as Record<string, unknown>;
  const status = obj.status;
  const confidence = obj.confidence;
  const reason = obj.reason;
  const evidence = obj.evidence;

  if (status !== "match" && status !== "mismatch" && status !== "no_data") {
    return null;
  }
  if (typeof confidence !== "number" || Number.isNaN(confidence)) return null;
  if (typeof reason !== "string") return null;
  if (!Array.isArray(evidence)) return null;

  const normalizedEvidence: ScreenEvidence[] = [];
  for (const row of evidence) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (
      typeof r.url === "string" &&
      typeof r.title === "string" &&
      typeof r.quote === "string"
    ) {
      normalizedEvidence.push({ url: r.url, title: r.title, quote: r.quote });
    }
  }

  return {
    status,
    confidence: Math.max(0, Math.min(1, confidence)),
    reason,
    evidence: normalizedEvidence,
  };
}
