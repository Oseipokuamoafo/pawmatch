import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";

import { recordAudit, AUDIT_ACTIONS } from "./audit";

// We mock the prisma client so the test stays a pure unit test — no
// DB connection required. The contract we care about: recordAudit
// passes through the right fields, sanitizes metadata, extracts
// source headers, and swallows errors.

import { prisma } from "@/lib/prisma";

const created: unknown[] = [];
let shouldFail = false;

const originalCreate = prisma.auditEntry.create;

describe("recordAudit", () => {
  beforeEach(() => {
    created.length = 0;
    shouldFail = false;
    // Mock for unit test only — bypass Prisma's complex overloaded type.
    (
      prisma.auditEntry as unknown as {
        create: (args: { data: unknown }) => Promise<{ id: string }>;
      }
    ).create = async (args) => {
      if (shouldFail) throw new Error("DB exploded");
      created.push(args.data);
      return { id: `mock-${created.length}` };
    };
  });

  afterEach(() => {
    (prisma.auditEntry as unknown as { create: unknown }).create =
      originalCreate;
  });

  it("writes the basic fields", async () => {
    const id = await recordAudit({
      actorId: "user-1",
      actorRole: "VET",
      action: AUDIT_ACTIONS.VET_COSIGNED_RECORD,
      subjectType: "PetHealth",
      subjectId: "health-1",
    });
    assert.equal(id, "mock-1");
    assert.equal(created.length, 1);
    const row = created[0] as Record<string, unknown>;
    assert.equal(row.actorId, "user-1");
    assert.equal(row.actorRole, "VET");
    assert.equal(row.action, "vet.cosigned_record");
    assert.equal(row.subjectType, "PetHealth");
    assert.equal(row.subjectId, "health-1");
  });

  it("returns null on DB failure (no throw)", async () => {
    shouldFail = true;
    const id = await recordAudit({
      action: AUDIT_ACTIONS.VET_COSIGNED_RECORD,
    });
    assert.equal(id, null);
  });

  it("accepts a null actorId for system events", async () => {
    const id = await recordAudit({
      actorId: null,
      action: AUDIT_ACTIONS.SUBSCRIPTION_PAYMENT_FAILED,
      subjectType: "Subscription",
      subjectId: "sub-1",
    });
    assert.ok(id);
    const row = created[0] as Record<string, unknown>;
    assert.equal(row.actorId, null);
  });

  it("extracts IP from X-Forwarded-For", async () => {
    const req = new Request("https://x.com/", {
      headers: {
        "x-forwarded-for": "203.0.113.1, 198.51.100.2",
        "user-agent": "Mozilla/5.0",
      },
    });
    await recordAudit({
      actorId: "u",
      action: AUDIT_ACTIONS.VET_APPLICATION_APPROVED,
      request: req,
    });
    const row = created[0] as Record<string, unknown>;
    assert.equal(row.ip, "203.0.113.1");
    assert.equal(row.userAgent, "Mozilla/5.0");
  });

  it("falls back to X-Real-IP if X-Forwarded-For is absent", async () => {
    const req = new Request("https://x.com/", {
      headers: { "x-real-ip": "203.0.113.99" },
    });
    await recordAudit({
      actorId: "u",
      action: AUDIT_ACTIONS.VET_APPLICATION_APPROVED,
      request: req,
    });
    const row = created[0] as Record<string, unknown>;
    assert.equal(row.ip, "203.0.113.99");
  });

  it("redacts secret-shaped keys from metadata", async () => {
    await recordAudit({
      actorId: "u",
      action: "test.event",
      metadata: {
        userId: "u-1",
        password: "hunter2",
        apiKey: "sk-abc",
        stripeToken: "tok_abc",
        encryptionKey: "key-abc",
        passwordHash: "$2b$12$...",
        normalField: "ok",
      },
    });
    const row = created[0] as Record<string, unknown>;
    const m = row.metadata as Record<string, unknown>;
    assert.equal(m.userId, "u-1");
    assert.equal(m.normalField, "ok");
    assert.equal(m.password, "[redacted]");
    assert.equal(m.apiKey, "[redacted]");
    assert.equal(m.stripeToken, "[redacted]");
    assert.equal(m.encryptionKey, "[redacted]");
    assert.equal(m.passwordHash, "[redacted]");
  });

  it("preserves nested object values verbatim (only top-level key check)", async () => {
    // We intentionally don't deep-walk — callers should not nest
    // secrets, and a deep walk has surprising perf cost.
    await recordAudit({
      action: "test.event",
      metadata: {
        from: "PENDING",
        to: "APPROVED",
        diff: { reason: "AI auto-approve", confidence: 0.92 },
      },
    });
    const row = created[0] as Record<string, unknown>;
    const m = row.metadata as Record<string, unknown>;
    assert.deepEqual(m.diff, { reason: "AI auto-approve", confidence: 0.92 });
  });
});

mock.reset();
