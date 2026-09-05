import assert from "node:assert/strict";
import test from "node:test";
import { can, canViewAgreement, requireCapability, scopeOf } from "./access.ts";
import type { Agreement, Person } from "./types.ts";

const office = {
  id: "person-amelia",
  branchId: "branch-brooklyn",
  fullName: "SkinPhD Head Office",
  email: "amelia@pilot.local",
  role: "manager",
  status: "active",
  pinHash: null,
  createdAt: "",
} as Person;

const clinicManager = {
  ...office,
  id: "person-fran",
  fullName: "Brooklyn Franchisee",
  role: "manager",
  scope: "clinic",
} as Person;

const employee = {
  ...office,
  id: "e1",
  fullName: "Lerato Mokoena",
  role: "employee",
} as Person;

test("head office can upload forms; clinic franchisee cannot", () => {
  assert.equal(scopeOf(office), "organisation");
  assert.equal(can(office, "templates"), true);
  assert.equal(can(clinicManager, "templates"), false);
  assert.equal(can(clinicManager, "issue", "branch-brooklyn"), true);
  assert.equal(can(clinicManager, "issue", "branch-lynwood"), false);
  assert.equal(can(employee, "issue"), false);
});

test("clinic franchisee only sees packs for their clinic", () => {
  const local = { employeeId: "e1", managerId: "m1", witnessId: "w1", branchId: "branch-brooklyn" } as Agreement;
  const other = { ...local, branchId: "branch-lynwood" } as Agreement;
  assert.equal(canViewAgreement(office, office.id, other), true);
  assert.equal(canViewAgreement(clinicManager, clinicManager.id, local), true);
  assert.equal(canViewAgreement(clinicManager, clinicManager.id, other), false);
  assert.equal(canViewAgreement(employee, employee.id, local), true);
});

test("requireCapability blocks employee directory writes", () => {
  assert.doesNotThrow(() => requireCapability(office, "staff", "Edit staff"));
  assert.throws(() => requireCapability(employee, "staff", "Edit staff"));
});
