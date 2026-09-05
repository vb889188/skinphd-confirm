import assert from "node:assert/strict";
import test from "node:test";
import { canSign, namesMatch, nextStatus, requiredFieldErrors, requiredSignatureCount } from "./rules.ts";

test("create validation requires operational fields", () => {
  assert.equal(requiredFieldErrors({}).length, 6);
  assert.deepEqual(
    requiredFieldErrors({
      title: "Hydroderm training agreement",
      activity: "Hydroderm course",
      branchId: "branch-brooklyn",
      employeeId: "person-lerato",
      managerId: "person-amelia",
      templateId: "tpl-tr-hydroderm",
    }),
    [],
  );
});

test("witness increases required signatures and status follows counts", () => {
  assert.equal(requiredSignatureCount(false), 2);
  assert.equal(requiredSignatureCount(true), 3);
  assert.equal(nextStatus(0, 2), "awaiting_signatures");
  assert.equal(nextStatus(1, 2), "partially_signed");
  assert.equal(nextStatus(2, 2), "completed");
  assert.equal(canSign("completed"), false);
  assert.equal(canSign("awaiting_signatures"), true);
});

test("typed names must match official seeded names", () => {
  assert.equal(namesMatch("  Lerato   Mokoena ", "Lerato Mokoena"), true);
  assert.equal(namesMatch("Amelia Naidoo", "Lerato Mokoena"), false);
});
