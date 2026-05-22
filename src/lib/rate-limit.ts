/**
 * In-memory token-bucket rate limiter.
 *
 * Lives in the same Node process as the custom Next + Socket.io server
 * (`src/server.ts`), so a single shared `Map` is the right data structure
 * for early-stage scale. If we ever move to a multi-instance deploy or
 * a fully-serverless platform, swap the storage layer for Redis or a
 * Postgres row — the `checkRateLimit` contract stays the same.
 *
 * Token bucket semantics (mental model):
 *   - Each bucket has a `capacity` (max burst — how many requests can
 *     land back-to-back before the user hits the wall).
 *   - Tokens refill at `tokensPerMs` continuously (long-term average
 *     allowed rate).
 *   - Each accepted request spends 1 token.
 *   - When tokens < 1, the request is rejected and `retryAfterMs`
 *     is how long until enough tokens have refilled.
 *
 * Why token bucket over fixed window? Token buckets allow controlled
 * bursting (good UX for users who legitimately fire off a few requests
 * in a row) while still enforcing a long-term cap. A fixed-window
 * counter would either reject the burst or allow 2x the cap at window
 * boundaries.
 */

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitPolicy {
  /** Maximum burst — how many requests can land back-to-back. */
  capacity: number;
  /** Long-term refill rate. Pick the unit that fits your policy. */
  refill: { tokens: number; perMs: number };
}

export interface RateLimitResult {
  ok: boolean;
  /** Remaining tokens after this check (floored at 0). */
  remaining: number;
  /** When the bucket will have enough tokens for another request. */
  retryAfterMs: number;
  /** The policy that was applied (echoed back for response headers). */
  policy: RateLimitPolicy;
}

/**
 * Common policies. Tuned for early-stage usage where any limit is
 * better than no limit; revisit once we have real production traffic.
 */
export const POLICIES = {
  /** Expensive Claude calls — adaptive thinking, 1500+ output tokens. */
  AI_HEAVY: {
    capacity: 5,
    refill: { tokens: 10, perMs: 60 * 60 * 1000 }, // 10 / hour
  },
  /** Interactive chat — higher allowance because turns are short. */
  AI_CHAT: {
    capacity: 10,
    refill: { tokens: 30, perMs: 60 * 60 * 1000 }, // 30 / hour
  },
  /** Mutations that hit external services (Stripe, email). */
  WRITE_SENSITIVE: {
    capacity: 10,
    refill: { tokens: 60, perMs: 60 * 60 * 1000 }, // 60 / hour
  },
} as const satisfies Record<string, RateLimitPolicy>;

/**
 * Consume one token from the bucket keyed by `key`. Returns whether the
 * caller is allowed to proceed and how long until the next allowed
 * request if not.
 *
 * The key is the entire identity of the bucket — usually
 * `${endpoint}:${userId}`. Don't reuse the same key across endpoints
 * unless that's intentional (shared quotas).
 */
export function checkRateLimit(
  key: string,
  policy: RateLimitPolicy,
): RateLimitResult {
  const now = Date.now();
  const tokensPerMs = policy.refill.tokens / policy.refill.perMs;
  const existing = buckets.get(key);
  const bucket: Bucket = existing ?? {
    tokens: policy.capacity,
    lastRefill: now,
  };

  // Continuous refill since last check, capped at capacity.
  const elapsed = now - bucket.lastRefill;
  bucket.tokens = Math.min(
    policy.capacity,
    bucket.tokens + elapsed * tokensPerMs,
  );
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    buckets.set(key, bucket);
    return {
      ok: true,
      remaining: Math.floor(bucket.tokens),
      retryAfterMs: 0,
      policy,
    };
  }

  // Time until tokens reach 1, with a ceiling so we never return 0.
  const needed = 1 - bucket.tokens;
  const retryAfterMs = Math.max(1, Math.ceil(needed / tokensPerMs));
  buckets.set(key, bucket);
  return {
    ok: false,
    remaining: 0,
    retryAfterMs,
    policy,
  };
}

/**
 * Build the standard rate-limit response headers (RFC-aligned where
 * possible — see https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/).
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.policy.capacity),
    "X-RateLimit-Remaining": String(result.remaining),
  };
  if (!result.ok) {
    headers["Retry-After"] = String(Math.ceil(result.retryAfterMs / 1000));
  }
  return headers;
}

/**
 * Test-only: wipe all buckets. Don't call this from app code.
 */
export function __resetRateLimitForTests(): void {
  buckets.clear();
}
