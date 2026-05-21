import { test } from "node:test";
import assert from "node:assert/strict";

import { signUpSchema, vetApplicationSchema } from "./auth";
import {
  cosignActionSchema,
  cosignRequestSchema,
  vetApplicationActionSchema,
} from "./vet";

/* ─── signUpSchema with optional vet block ───────────────────────────── */

test("signUpSchema accepts a regular owner/breeder without vetApplication", () => {
  const r = signUpSchema.safeParse({
    name: "Sienna Park",
    email: "sienna@example.com",
    password: "long-enough-password",
    role: "BREEDER",
  });
  assert.equal(r.success, true);
});

test("signUpSchema accepts a fully-formed vetApplication block", () => {
  const r = signUpSchema.safeParse({
    name: "Dr. Avery Wu",
    email: "avery@vet.example.com",
    password: "long-enough-password",
    role: "OWNER",
    vetApplication: {
      licenseNumber: "VL-9182",
      licenseState: "California",
      practiceName: "Bay Animal Hospital",
      practiceAddress: "742 Mission St, San Francisco, CA 94103",
      practicePhone: "+1 415 555 0199",
    },
  });
  assert.equal(r.success, true);
});

test("signUpSchema accepts role=VET with a full vetApplication", () => {
  const r = signUpSchema.safeParse({
    name: "Dr. Avery Wu",
    email: "avery@vet.example.com",
    password: "long-enough-password",
    role: "VET",
    vetApplication: {
      licenseNumber: "VL-9182",
      licenseState: "California",
      practiceName: "Bay Animal Hospital",
      practiceAddress: "742 Mission St, San Francisco, CA 94103",
      practicePhone: "+1 415 555 0199",
    },
  });
  assert.equal(r.success, true);
});

test("signUpSchema rejects role=VET without a vetApplication block", () => {
  const r = signUpSchema.safeParse({
    name: "Dr. Avery Wu",
    email: "avery@vet.example.com",
    password: "long-enough-password",
    role: "VET",
  });
  assert.equal(r.success, false);
});

test("signUpSchema rejects a half-filled vetApplication (missing fields)", () => {
  const r = signUpSchema.safeParse({
    name: "Dr. Avery Wu",
    email: "avery@vet.example.com",
    password: "long-enough-password",
    role: "OWNER",
    vetApplication: {
      licenseNumber: "VL-9182",
      // missing licenseState + practice* fields
    },
  });
  assert.equal(r.success, false);
});

test("vetApplicationSchema enforces minimum lengths", () => {
  const r = vetApplicationSchema.safeParse({
    licenseNumber: "A", // too short
    licenseState: "CA",
    practiceName: "X", // too short
    practiceAddress: "742 Mission St",
    practicePhone: "+1 415 555 0199",
  });
  assert.equal(r.success, false);
});

/* ─── admin action schema ────────────────────────────────────────────── */

test("vetApplicationActionSchema accepts approve without notes", () => {
  const r = vetApplicationActionSchema.safeParse({ action: "approve" });
  assert.equal(r.success, true);
});

test("vetApplicationActionSchema accepts reject with notes", () => {
  const r = vetApplicationActionSchema.safeParse({
    action: "reject",
    notes: "License number couldn't be confirmed with the state board.",
  });
  assert.equal(r.success, true);
});

test("vetApplicationActionSchema rejects unknown actions", () => {
  const r = vetApplicationActionSchema.safeParse({ action: "delete" });
  assert.equal(r.success, false);
});

/* ─── cosign request + action schemas ────────────────────────────────── */

test("cosignRequestSchema accepts a non-empty vetId", () => {
  const r = cosignRequestSchema.safeParse({ vetId: "ckxyz123" });
  assert.equal(r.success, true);
});

test("cosignRequestSchema rejects empty vetId", () => {
  const r = cosignRequestSchema.safeParse({ vetId: "" });
  assert.equal(r.success, false);
});

test("cosignActionSchema accepts a bare sign", () => {
  const r = cosignActionSchema.safeParse({ action: "sign" });
  assert.equal(r.success, true);
});

test("cosignActionSchema accepts a decline with notes", () => {
  const r = cosignActionSchema.safeParse({
    action: "decline",
    notes: "Record predates my license — can't speak to it.",
  });
  assert.equal(r.success, true);
});

test("cosignActionSchema rejects unknown actions", () => {
  const r = cosignActionSchema.safeParse({ action: "approve" });
  assert.equal(r.success, false);
});
