import assert from "node:assert/strict";
import test from "node:test";
import { canIssueLinkForClinic, clinicReadSql, clinicWriteError } from "./clinic-scope.ts";
import { canVoidOriginalAfterReissue, statusFromDurableSignatures } from "./integrity.ts";
import { assertSigningOrder } from "./rules.ts";
import { resolveSessionSecret } from "./session-secret.ts";

test("session secret fails closed and rejects the public fallback", () => {
  assert.throws(() => resolveSessionSecret({}), /Session secret is not configured/);
  assert.throws(() => resolveSessionSecret({ SESSION_SECRET: "confirm-dev-session" }), /Session secret is not configured/);
  assert.throws(() => resolveSessionSecret({ CONFIRM_SESSION_SECRET: "   " }), /Session secret is not configured/);
  assert.equal(resolveSessionSecret({ SESSION_SECRET: "desk-only-secret" }), "desk-only-secret");
  assert.equal(resolveSessionSecret({ CONFIRM_SESSION_SECRET: "confirm-only", SESSION_SECRET: "desk-only-secret" }), "confirm-only");
});

test("clinic managers cannot read or write another clinic", () => {
  const clinic = { scope: "clinic", branchId: "branch-brooklyn" };
  const org = { scope: "organisation", branchId: "branch-brooklyn" };
  assert.equal(clinicReadSql("confirm_agreements", org, 1), null);
  assert.deepEqual(clinicReadSql("confirm_agreements", clinic, 2), { sql: "clinic_id = $2", value: "branch-brooklyn" });
  assert.equal(clinicWriteError("confirm_agreements", clinic, { clinic_id: "branch-lynnwood" }), "That pack belongs to another clinic.");
  assert.equal(clinicWriteError("confirm_templates", clinic, { name: "x" }), "That change is limited to Head Office.");
  assert.equal(clinicWriteError("confirm_agreements", org, { clinic_id: "branch-lynnwood" }), null);
  assert.equal(canIssueLinkForClinic(clinic, "branch-lynnwood"), false);
  assert.equal(canIssueLinkForClinic(clinic, "branch-brooklyn"), true);
  assert.equal(canIssueLinkForClinic(org, "branch-lynnwood"), true);
});

test("reissue does not void the original until a replacement id exists", () => {
  assert.equal(canVoidOriginalAfterReissue("awaiting_signatures", null), false);
  assert.equal(canVoidOriginalAfterReissue("awaiting_signatures", "AGR-NEW"), true);
  assert.equal(canVoidOriginalAfterReissue("completed", "AGR-NEW"), false);
});

test("pack status is taken from durable signature counts", () => {
  assert.equal(statusFromDurableSignatures(0, 3), "awaiting_signatures");
  assert.equal(statusFromDurableSignatures(2, 3), "partially_signed");
  assert.equal(statusFromDurableSignatures(3, 3), "completed");
  assert.throws(() => assertSigningOrder("witness", ["employee", "manager", "witness"], ["employee"]), /franchisee must sign/);
});
