import type { AccessScope, Agreement, Person, Role } from "./types";

export type Capability =
  | "issue"
  | "templates"
  | "staff"
  | "clinics"
  | "audit"
  | "remind"
  | "email"
  | "export"
  | "directory_write"
  | "view_id_number"
  | "sign_assigned";

const ORG_ONLY: Capability[] = ["templates", "clinics", "export"];
const CLINIC_OR_ORG: Capability[] = ["issue", "staff", "audit", "remind", "email", "directory_write", "view_id_number"];

export function scopeOf(person: Person | undefined): AccessScope | undefined {
  if (!person) return undefined;
  if (person.scope) return person.scope;
  if (person.role === "manager" && (person.id === "person-amelia" || /head office/i.test(person.fullName))) return "organisation";
  if (person.role === "manager") return "clinic";
  return "self";
}

export function can(person: Person | Role | undefined, capability: Capability, clinicId?: string): boolean {
  const resolved =
    person && typeof person === "object"
      ? person
      : undefined;
  const role = resolved?.role ?? (typeof person === "string" ? person : undefined);
  if (!role) return false;
  if (capability === "sign_assigned") return true;
  const scope = resolved ? scopeOf(resolved) : role === "manager" ? "clinic" : "self";
  if (ORG_ONLY.includes(capability)) return scope === "organisation";
  if (CLINIC_OR_ORG.includes(capability)) {
    if (scope === "organisation") return true;
    if (scope === "clinic") return !clinicId || clinicId === resolved?.branchId;
    return false;
  }
  return true;
}

export function canViewAgreement(person: Person | Role, personId: string, agreement: Agreement): boolean {
  if (typeof person === "string") {
    if (person === "manager") return true;
    return agreement.employeeId === personId || agreement.managerId === personId || agreement.witnessId === personId;
  }
  const scope = scopeOf(person);
  if (scope === "organisation") return true;
  if (scope === "clinic") return agreement.branchId === person.branchId;
  return agreement.employeeId === person.id || agreement.managerId === person.id || agreement.witnessId === person.id;
}

export function requireManager(role: Role | undefined, action: string): void {
  if (role !== "manager") throw new Error(`${action} is limited to Head Office / franchisee`);
}

export function requireCapability(person: Person | undefined, capability: Capability, action: string, clinicId?: string): void {
  if (!can(person, capability, clinicId)) {
    throw new Error(`${action} is outside this identity’s permission`);
  }
}
