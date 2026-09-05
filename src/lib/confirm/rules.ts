import type { AgreementStatus, Role } from "./types";

export const SIGNABLE: AgreementStatus[] = ["awaiting_signatures", "partially_signed"];

export function requiredFieldErrors(input: Record<string, unknown>): string[] {
  return ["title", "activity", "branchId", "employeeId", "managerId", "templateId"]
    .filter((field) => !String(input[field] ?? "").trim())
    .map((field) => `${field} is required`);
}

export function requiredSignatureCount(hasWitness: boolean): number {
  return hasWitness ? 3 : 2;
}

export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function namesMatch(typedName: string, officialName: string): boolean {
  const typed = normalizeName(typedName);
  return typed.length > 0 && typed === normalizeName(officialName);
}

export function canSign(status: AgreementStatus): boolean {
  return SIGNABLE.includes(status);
}

export function nextStatus(signedCount: number, required: number): AgreementStatus {
  if (signedCount >= required) return "completed";
  if (signedCount > 0) return "partially_signed";
  return "awaiting_signatures";
}

export function consentCopy(): string {
  return "I have reviewed the frozen agreement snapshot and I intend this typed name to be recorded as my signature for this employee agreement. This action does not decide competence, treatment authorization, payroll deductions, or legal enforceability.";
}

export function assertAssigned(
  role: Role,
  signerId: string,
  ids: { employeeId: string; managerId: string; witnessId: string | null },
): void {
  const expected = role === "employee" ? ids.employeeId : role === "manager" ? ids.managerId : ids.witnessId;
  if (!expected || expected !== signerId) {
    throw new Error("The selected signer is not assigned to this agreement role");
  }
}

export const STATUS_LABEL: Record<AgreementStatus, string> = {
  draft: "Draft",
  awaiting_signatures: "Awaiting signatures",
  partially_signed: "Partially signed",
  completed: "Completed",
  declined: "Declined",
  superseded: "Superseded",
};

export const STATUS_TONE: Record<AgreementStatus, string> = {
  draft: "amber",
  awaiting_signatures: "blue",
  partially_signed: "violet",
  completed: "green",
  declined: "red",
  superseded: "slate",
};
