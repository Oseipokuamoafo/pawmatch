import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  checkRateLimit,
  rateLimitHeaders,
  __resetRateLimitForTests,
  type RateLimitPolicy,
} from "./rate-limit";

const BURST_5_PER_HOUR_10: RateLimitPolicy = {
  capacity: 5,
  refill: { tokens: 10, perMs: 60 * 60 * 1000 },
};

describe("checkRateLimit — token bucket", () => {
  beforeEach(() => {
    __resetRateLimitForTests();
  });

  it("allows burst up to capacity, then blocks", () => {
    const key = "test:burst";
    for (let i = 0; i < 5; i++) {
      const r = checkRateLimit(key, BURST_5_PER_HOUR_10);
      assert.equal(r.ok, true, `request ${i + 1} should be allowed`);
    }
    const denied = checkRateLimit(key, BURST_5_PER_HOUR_10);
    assert.equal(denied.ok, false);
    assert.equal(denied.remaining, 0);
    assert.ok(denied.retryAfterMs > 0, "retryAfterMs must be positive");
  });

  it("isolates buckets per key", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("user:a", BURST_5_PER_HOUR_10);
    // user:a is exhausted, but user:b should be fresh
    const a = checkRateLimit("user:a", BURST_5_PER_HOUR_10);
    const b = checkRateLimit("user:b", BURST_5_PER_HOUR_10);
    assert.equal(a.ok, false);
    assert.equal(b.ok, true);
  });

  it("decrements remaining count visibly", () => {
    const key = "test:remaining";
    const first = checkRateLimit(key, BURST_5_PER_HOUR_10);
    const second = checkRateLimit(key, BURST_5_PER_HOUR_10);
    assert.equal(first.remaining, 4);
    assert.equal(second.remaining, 3);
  });

  it("computes retryAfterMs roughly matching refill rate", () => {
    const key = "test:retry";
    // Drain bucket
    for (let i = 0; i < 5; i++) checkRateLimit(key, BURST_5_PER_HOUR_10);
    const denied = checkRateLimit(key, BURST_5_PER_HOUR_10);
    // 10 tokens/hour = ~6 minutes per token. Expect retryAfterMs near 6 min,
    // allowing for the tiny elapsed time since the drain.
    const sixMinutes = 6 * 60 * 1000;
    assert.ok(
      denied.retryAfterMs > 0 && denied.retryAfterMs <= sixMinutes + 1000,
      `retryAfterMs ${denied.retryAfterMs} should be 0 < x <= ${sixMinutes + 1000}`,
    );
  });

  it("never returns retryAfterMs=0 on a denial", () => {
    const key = "test:nonzero";
    for (let i = 0; i < 5; i++) checkRateLimit(key, BURST_5_PER_HOUR_10);
    const denied = checkRateLimit(key, BURST_5_PER_HOUR_10);
    assert.equal(denied.ok, false);
    assert.ok(denied.retryAfterMs >= 1, "retryAfterMs must be at least 1ms");
  });

  it("supports a very small policy (capacity=1)", () => {
    const tight: RateLimitPolicy = {
      capacity: 1,
      refill: { tokens: 1, perMs: 1000 },
    };
    const first = checkRateLimit("tight:a", tight);
    const second = checkRateLimit("tight:a", tight);
    assert.equal(first.ok, true);
    assert.equal(second.ok, false);
  });
});

describe("rateLimitHeaders", () => {
  beforeEach(() => {
    __resetRateLimitForTests();
  });

  it("emits Limit + Remaining on success without Retry-After", () => {
    const r = checkRateLimit("headers:a", BURST_5_PER_HOUR_10);
    const h = rateLimitHeaders(r);
    assert.equal(h["X-RateLimit-Limit"], "5");
    assert.equal(h["X-RateLimit-Remaining"], "4");
    assert.equal(h["Retry-After"], undefined);
  });

  it("emits Retry-After (seconds, ceil) on denial", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("headers:b", BURST_5_PER_HOUR_10);
    const denied = checkRateLimit("headers:b", BURST_5_PER_HOUR_10);
    const h = rateLimitHeaders(denied);
    assert.equal(h["X-RateLimit-Remaining"], "0");
    assert.ok(h["Retry-After"], "Retry-After header required on denial");
    assert.ok(Number(h["Retry-After"]) > 0);
  });
});
