/**
 * Lightweight chat-message scam detector.
 *
 * Two tiers:
 *  - HARD: payment-rail terms, crypto addresses, advance-fee scams.
 *    These get refused (422) at the API boundary.
 *  - SOFT: off-platform contact, generic urgency, payment apps outside
 *    PawMatch. Allowed, but annotated so the UI can render a yellow
 *    "be careful" pill alongside the message.
 *
 * Detection is computed on the DECRYPTED content (server-side) both at
 * write-time (POST) and read-time (GET) so every reader sees the same
 * warnings without persisting the flag in the DB.
 */

export type ScamSeverity = "hard" | "soft";

export interface ScamMatch {
  severity: ScamSeverity;
  reason: string;
}

export interface ScamResult {
  blocked: boolean;
  matches: ScamMatch[];
}

const HARD_RULES: { test: RegExp; reason: string }[] = [
  { test: /\bwestern\s*union\b/i, reason: "Western Union" },
  { test: /\bmoneygram\b/i, reason: "MoneyGram" },
  { test: /\bwire\s+transfer\b/i, reason: "Wire transfer" },
  { test: /\b(bitcoin|btc|usdt|usdc|ethereum|eth)\b/i, reason: "Crypto reference" },
  { test: /\b0x[a-fA-F0-9]{40}\b/, reason: "Ethereum address" },
  { test: /\bbc1[ac-hj-np-z02-9]{8,87}\b/, reason: "Bitcoin address" },
  { test: /\b(advance|upfront)\s+fee\b/i, reason: "Advance-fee pattern" },
  { test: /\bnigerian\s+prince\b/i, reason: "Classic scam phrase" },
  {
    test: /\$\d{3,}.*\b(send|wire|transfer)\b/i,
    reason: "Large amount + send/wire phrasing",
  },
];

const SOFT_RULES: { test: RegExp; reason: string }[] = [
  { test: /\bwhatsapp\b/i, reason: "Off-platform: WhatsApp" },
  { test: /\btelegram\b/i, reason: "Off-platform: Telegram" },
  { test: /\bsignal\b/i, reason: "Off-platform: Signal" },
  { test: /\b(paypal|venmo|zelle|cashapp|cash\s+app)\b/i, reason: "External payment app" },
  { test: /\b(urgent|asap|today\s*only|act\s*now)\b/i, reason: "Urgency phrasing" },
  {
    test: /\bcall\s+me\s+at\s+\+?\d/i,
    reason: "Phone-number handoff",
  },
  {
    // Bare phone numbers with country code or US-style grouping
    test: /\+?\d[\d\s().-]{8,}\d/,
    reason: "Phone-number-like sequence",
  },
  {
    // Any http/https/www. URL — point users at the PawMatch DMs only
    test: /\b(https?:\/\/|www\.)[^\s]{3,}/i,
    reason: "External link",
  },
];

export function detectScam(content: string): ScamResult {
  const text = content.normalize("NFKC");
  const matches: ScamMatch[] = [];

  for (const rule of HARD_RULES) {
    if (rule.test.test(text)) {
      matches.push({ severity: "hard", reason: rule.reason });
    }
  }
  for (const rule of SOFT_RULES) {
    if (rule.test.test(text)) {
      matches.push({ severity: "soft", reason: rule.reason });
    }
  }

  // Dedupe by reason (some hard + soft regexes overlap)
  const seen = new Set<string>();
  const deduped: ScamMatch[] = [];
  for (const m of matches) {
    if (seen.has(m.reason)) continue;
    seen.add(m.reason);
    deduped.push(m);
  }

  return {
    blocked: deduped.some((m) => m.severity === "hard"),
    matches: deduped,
  };
}
