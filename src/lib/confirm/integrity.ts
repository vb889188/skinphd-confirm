import type { AgreementStatus } from "./types";

export function canVoidOriginalAfterReissue(status: AgreementStatus, replacementId: string | null | undefined): boolean {
  if (!replacementId) return false;
  return status !== "completed" && status !== "superseded" && status !== "declined";
}

export function statusFromDurableSignatures(signedCount: number, required: number): AgreementStatus {
  if (signedCount >= required) return "completed";
  if (signedCount > 0) return "partially_signed";
  return "awaiting_signatures";
}
