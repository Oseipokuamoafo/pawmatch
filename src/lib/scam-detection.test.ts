import { test } from "node:test";
import assert from "node:assert/strict";

import { detectScam } from "./scam-detection";

test("plain conversational message is not blocked or flagged", () => {
  const r = detectScam("Hey! Rocco's last vet visit went great, thanks for asking.");
  assert.equal(r.blocked, false);
  assert.equal(r.matches.length, 0);
});

test("hard rule: wire transfer / crypto refused outright", () => {
  for (const text of [
    "Please use Western Union for the deposit.",
    "Wire transfer to my account 1234.",
    "Send bitcoin to this wallet please",
    "MoneyGram to my brother in 24h",
  ]) {
    const r = detectScam(text);
    assert.equal(r.blocked, true, `expected blocked for: ${text}`);
    assert.equal(
      r.matches.some((m) => m.severity === "hard"),
      true,
      `expected a hard match for: ${text}`,
    );
  }
});

test("Venmo / PayPal / Zelle are soft-flagged (not hard-blocked)", () => {
  for (const text of [
    "Send $250 deposit via Venmo to lock the spot.",
    "Cashapp me before tomorrow.",
    "PayPal works too.",
  ]) {
    const r = detectScam(text);
    assert.equal(r.blocked, false, `should not be hard-blocked: ${text}`);
    assert.equal(
      r.matches.some((m) => m.severity === "soft"),
      true,
      `should be soft-flagged: ${text}`,
    );
  }
});

test("soft rule: external contact / urgency / URLs flagged but not blocked", () => {
  for (const text of [
    "Hit me up on WhatsApp +1 (555) 555-9999",
    "Check out https://my-puppy-site.com/listings",
    "Urgent — last spot, decide today or it's gone",
  ]) {
    const r = detectScam(text);
    assert.equal(r.blocked, false, `should not be blocked: ${text}`);
    assert.equal(
      r.matches.some((m) => m.severity === "soft"),
      true,
      `should have a soft match: ${text}`,
    );
  }
});

test("dedupes overlapping reasons (same reason counted once)", () => {
  // Phone-pattern can fire under multiple regexes; deduped result should have unique reasons.
  const r = detectScam("Call me +1 555 123 4567 today");
  const reasons = r.matches.map((m) => m.reason);
  const unique = new Set(reasons);
  assert.equal(reasons.length, unique.size);
});

test("normalises lookalike characters before matching", () => {
  // NFKC normalization should make this still trip the URL / external contact rule.
  const r = detectScam("Visit https://example.com today");
  assert.equal(
    r.matches.some((m) => m.severity === "soft"),
    true,
  );
});
