import { test } from "node:test";
import assert from "node:assert/strict";

import { isProPlusActive } from "./billing";

const NOW = new Date("2026-05-21T12:00:00Z");
const FUTURE = new Date("2026-06-21T12:00:00Z");
const PAST = new Date("2026-04-21T12:00:00Z");

/* ─── Granting states ─────────────────────────────────────────────────── */

test("isProPlusActive: ACTIVE + future period → grants access", () => {
  assert.equal(
    isProPlusActive(
      {
        status: "ACTIVE",
        currentPeriodEnd: FUTURE,
        cancelAtPeriodEnd: false,
      },
      NOW,
    ),
    true,
  );
});

test("isProPlusActive: TRIALING + future period → grants access", () => {
  assert.equal(
    isProPlusActive(
      {
        status: "TRIALING",
        currentPeriodEnd: FUTURE,
        cancelAtPeriodEnd: false,
      },
      NOW,
    ),
    true,
  );
});

test("isProPlusActive: ACTIVE + cancelAtPeriodEnd=true + future period → STILL grants (pre-paid through period)", () => {
  // Critical UX: a user who cancels keeps access until the period ends.
  assert.equal(
    isProPlusActive(
      {
        status: "ACTIVE",
        currentPeriodEnd: FUTURE,
        cancelAtPeriodEnd: true,
      },
      NOW,
    ),
    true,
  );
});

/* ─── Non-granting states ─────────────────────────────────────────────── */

test("isProPlusActive: ACTIVE + past period → denies access", () => {
  // Webhook hasn't fired yet but the period has elapsed — fail closed.
  assert.equal(
    isProPlusActive(
      {
        status: "ACTIVE",
        currentPeriodEnd: PAST,
        cancelAtPeriodEnd: false,
      },
      NOW,
    ),
    false,
  );
});

test("isProPlusActive: CANCELED → denies access regardless of period", () => {
  assert.equal(
    isProPlusActive(
      {
        status: "CANCELED",
        currentPeriodEnd: FUTURE,
        cancelAtPeriodEnd: false,
      },
      NOW,
    ),
    false,
  );
});

test("isProPlusActive: PAST_DUE → denies access (payment failed)", () => {
  assert.equal(
    isProPlusActive(
      {
        status: "PAST_DUE",
        currentPeriodEnd: FUTURE,
        cancelAtPeriodEnd: false,
      },
      NOW,
    ),
    false,
  );
});

test("isProPlusActive: PAUSED → denies access", () => {
  assert.equal(
    isProPlusActive(
      {
        status: "PAUSED",
        currentPeriodEnd: FUTURE,
        cancelAtPeriodEnd: false,
      },
      NOW,
    ),
    false,
  );
});

test("isProPlusActive: INCOMPLETE (Stripe payment failed at checkout) → denies access", () => {
  assert.equal(
    isProPlusActive(
      {
        status: "INCOMPLETE",
        currentPeriodEnd: FUTURE,
        cancelAtPeriodEnd: false,
      },
      NOW,
    ),
    false,
  );
});

test("isProPlusActive: INCOMPLETE_EXPIRED → denies access", () => {
  assert.equal(
    isProPlusActive(
      {
        status: "INCOMPLETE_EXPIRED",
        currentPeriodEnd: FUTURE,
        cancelAtPeriodEnd: false,
      },
      NOW,
    ),
    false,
  );
});

test("isProPlusActive: UNPAID → denies access", () => {
  assert.equal(
    isProPlusActive(
      {
        status: "UNPAID",
        currentPeriodEnd: FUTURE,
        cancelAtPeriodEnd: false,
      },
      NOW,
    ),
    false,
  );
});

/* ─── No subscription at all ──────────────────────────────────────────── */

test("isProPlusActive: null subscription → denies access", () => {
  assert.equal(isProPlusActive(null, NOW), false);
});

test("isProPlusActive: undefined subscription → denies access", () => {
  assert.equal(isProPlusActive(undefined, NOW), false);
});

/* ─── Boundary: exact period-end moment ───────────────────────────────── */

test("isProPlusActive: currentPeriodEnd === now → denies (period has ended)", () => {
  // Greater-than comparison: at exactly `now`, the period has elapsed.
  assert.equal(
    isProPlusActive(
      {
        status: "ACTIVE",
        currentPeriodEnd: NOW,
        cancelAtPeriodEnd: false,
      },
      NOW,
    ),
    false,
  );
});
