import { test } from "node:test";
import assert from "node:assert/strict";

import { pendingViewStateFor } from "./vet-application-state";

/* ─── In-flight screening states ─────────────────────────────────────── */

test("pendingViewStateFor: null status → still screening", () => {
  const s = pendingViewStateFor(null);
  assert.equal(s.phase, "screening");
  assert.equal(s.screenStep, "inflight");
  assert.equal(s.adminStep, "pending");
  assert.match(s.headline, /checking your license/i);
});

test("pendingViewStateFor: PENDING → still screening", () => {
  const s = pendingViewStateFor("PENDING");
  assert.equal(s.phase, "screening");
  assert.equal(s.screenStep, "inflight");
  assert.equal(s.adminStep, "pending");
});

/* ─── Concluded verdicts ─────────────────────────────────────────────── */

test("pendingViewStateFor: MATCH → admin review", () => {
  const s = pendingViewStateFor("MATCH");
  assert.equal(s.phase, "admin_review");
  assert.equal(s.screenStep, "done");
  assert.equal(s.adminStep, "inflight");
  assert.match(s.headline, /final review/i);
});

test("pendingViewStateFor: MISMATCH → admin review", () => {
  const s = pendingViewStateFor("MISMATCH");
  assert.equal(s.phase, "admin_review");
  assert.equal(s.screenStep, "done");
  assert.equal(s.adminStep, "inflight");
});

test("pendingViewStateFor: NO_DATA → admin review", () => {
  const s = pendingViewStateFor("NO_DATA");
  assert.equal(s.phase, "admin_review");
  assert.equal(s.screenStep, "done");
  assert.equal(s.adminStep, "inflight");
});

/* ─── Regression: ERROR must NOT show as done ────────────────────────── */

test("pendingViewStateFor: ERROR is treated as still-screening from the applicant view", () => {
  // The bug we're fixing: previously ERROR rendered a green checkmark
  // on the "Cross-referenced with state board" step because the
  // component just checked `status !== "PENDING" && status !== null`.
  // From the applicant's perspective, AI screen failure looks like
  // pending — an admin will pick it up. Never leak the error.
  const s = pendingViewStateFor("ERROR");
  assert.equal(s.phase, "screening");
  assert.equal(s.screenStep, "inflight");
  assert.notEqual(s.screenStep, "done");
  assert.match(s.headline, /checking your license/i);
});

/* ─── Subhead copy stays applicant-friendly across states ────────────── */

test("pendingViewStateFor: subhead never mentions errors or AI internals", () => {
  for (const status of [
    null,
    "PENDING",
    "MATCH",
    "MISMATCH",
    "NO_DATA",
    "ERROR",
  ] as const) {
    const s = pendingViewStateFor(status);
    assert.doesNotMatch(s.subhead, /error|fail|api|claude/i);
  }
});
