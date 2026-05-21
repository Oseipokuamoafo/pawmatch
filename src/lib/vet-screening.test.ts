import { test } from "node:test";
import assert from "node:assert/strict";

import {
  extractVerdict,
  shouldAutoApprove,
  type VetScreenVerdict,
} from "./vet-screening";

/* ─── verdict shape ──────────────────────────────────────────────────── */

const verdictText = JSON.stringify({
  status: "match",
  confidence: 0.93,
  reason: "Found Dr. X on the California Veterinary Medical Board site.",
  evidence: [
    {
      url: "https://bvm.ca.gov/lookup",
      title: "CA BVM lookup",
      quote: "License 12345 — Dr. X — Active",
    },
  ],
});

function buildResponse(content: { type: string; text?: string }[]): {
  content: { type: string; text?: string }[];
} {
  return { content };
}

test("extractVerdict pulls the last JSON text block", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = extractVerdict(
    buildResponse([
      { type: "server_tool_use" },
      { type: "text", text: "searching..." },
      { type: "text", text: verdictText },
    ]) as any,
  );
  assert.ok(r);
  assert.equal(r?.status, "match");
  assert.equal(r?.confidence, 0.93);
  assert.equal(r?.evidence.length, 1);
});

test("extractVerdict returns null on no JSON", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = extractVerdict(
    buildResponse([{ type: "text", text: "not json at all" }]) as any,
  );
  assert.equal(r, null);
});

test("extractVerdict rejects malformed verdicts (missing required keys)", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = extractVerdict(
    buildResponse([
      {
        type: "text",
        text: JSON.stringify({ status: "match", confidence: 0.9 }),
      },
    ]) as any,
  );
  assert.equal(r, null);
});

test("extractVerdict rejects unknown status values", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = extractVerdict(
    buildResponse([
      {
        type: "text",
        text: JSON.stringify({
          status: "approved", // not in enum
          confidence: 0.9,
          reason: "ok",
          evidence: [],
        }),
      },
    ]) as any,
  );
  assert.equal(r, null);
});

test("extractVerdict clamps confidence to [0,1]", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = extractVerdict(
    buildResponse([
      {
        type: "text",
        text: JSON.stringify({
          status: "match",
          confidence: 1.5, // out of range
          reason: "x",
          evidence: [],
        }),
      },
    ]) as any,
  );
  assert.equal(r?.confidence, 1);
});

test("extractVerdict filters malformed evidence rows", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = extractVerdict(
    buildResponse([
      {
        type: "text",
        text: JSON.stringify({
          status: "match",
          confidence: 0.9,
          reason: "x",
          evidence: [
            { url: "a", title: "b", quote: "c" },
            { url: "missing-quote", title: "x" }, // dropped
            "not an object", // dropped
          ],
        }),
      },
    ]) as any,
  );
  assert.equal(r?.evidence.length, 1);
  assert.equal(r?.evidence[0].url, "a");
});

/* ─── auto-approval policy ───────────────────────────────────────────── */

const baseVerdict: VetScreenVerdict = {
  status: "match",
  confidence: 0.92,
  reason: "ok",
  evidence: [],
};

test("shouldAutoApprove passes on match + high confidence", () => {
  assert.equal(shouldAutoApprove(baseVerdict), true);
});

test("shouldAutoApprove rejects mismatch even at high confidence", () => {
  assert.equal(
    shouldAutoApprove({ ...baseVerdict, status: "mismatch", confidence: 0.99 }),
    false,
  );
});

test("shouldAutoApprove rejects no_data even at high confidence", () => {
  assert.equal(
    shouldAutoApprove({ ...baseVerdict, status: "no_data", confidence: 0.95 }),
    false,
  );
});

test("shouldAutoApprove rejects match below threshold", () => {
  assert.equal(
    shouldAutoApprove({ ...baseVerdict, confidence: 0.7 }),
    false,
  );
});

test("shouldAutoApprove rejects null verdict", () => {
  assert.equal(shouldAutoApprove(null), false);
});

test("shouldAutoApprove rejects NaN confidence", () => {
  assert.equal(
    shouldAutoApprove({ ...baseVerdict, confidence: Number.NaN }),
    false,
  );
});
