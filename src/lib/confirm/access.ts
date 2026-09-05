import type { Agreement, Role } from "./types";

export type Capability =
  | "issue"
  | "templates"
  | "staff"
  | "clinics"
  | "audit"
  | "remind"
  | "email"
  | "export"
  | "directory_write";

const MANAGER_ONLY: Capability[] = [
  "issue",
  "templates",
  "staff",
  "clinics",
  "audit",
  "remind",
  "email",
  "export",
  "directory_write",
];

export function can(role: Role | undefined, capability: Capability): boolean {
  if (!role) return false;
  if (MANAGER_ONLY.includes(capability)) return role === "manager";
  return true;
}

export function canViewAgreement(role: Role, personId: string, agreement: Agreement): boolean {
  if (role === "manager") return true;
  return agreement.employeeId === personId || agreement.managerId === personId || agreement.witnessId === personId;
}

export function requireManager(role: Role | undefined, action: string): void {
  if (role !== "manager") throw new Error(`${action} is limited to Head Office / franchisee`);
}
