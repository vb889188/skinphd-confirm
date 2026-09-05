import assert from "node:assert/strict";
import test from "node:test";
import { can, canViewAgreement, requireManager } from "./access.ts";
import type { Agreement } from "./types.ts";

test("only franchisee can issue and edit the directory", () => {
  assert.equal(can("manager", "issue"), true);
  assert.equal(can("employee", "issue"), false);
  assert.equal(can("witness", "staff"), false);
  assert.equal(can("employee", "templates"), false);
});

test("employees only see assigned packs", () => {
  const agreement = { employeeId: "e1", managerId: "m1", witnessId: "w1" } as Agreement;
  assert.equal(canViewAgreement("manager", "x", agreement), true);
  assert.equal(canViewAgreement("employee", "e1", agreement), true);
  assert.equal(canViewAgreement("employee", "other", agreement), false);
  assert.equal(canViewAgreement("witness", "w1", agreement), true);
});

test("requireManager blocks employee writes", () => {
  assert.doesNotThrow(() => requireManager("manager", "Issue"));
  assert.throws(() => requireManager("employee", "Issue"));
});
