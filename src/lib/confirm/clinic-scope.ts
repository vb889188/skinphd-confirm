export type ClinicActor = { scope: string; branchId: string };

export function isOrgScope(actor: ClinicActor): boolean {
  return actor.scope === "organisation";
}

export function clinicReadSql(table: string, actor: ClinicActor, nextParam: number): { sql: string; value: string } | null {
  if (isOrgScope(actor)) return null;
  const value = actor.branchId;
  switch (table) {
    case "confirm_agreements":
    case "confirm_people":
      return { sql: `clinic_id = $${nextParam}`, value };
    case "confirm_clinics":
      return { sql: `id = $${nextParam}`, value };
    case "confirm_signatures":
    case "confirm_signing_links":
    case "confirm_audit":
      return { sql: `agreement_id IN (SELECT id FROM confirm_agreements WHERE clinic_id = $${nextParam})`, value };
    case "confirm_employee_records":
      return { sql: `person_id IN (SELECT id FROM confirm_people WHERE clinic_id = $${nextParam})`, value };
    case "confirm_source_files":
      return { sql: `(agreement_id IS NULL OR agreement_id IN (SELECT id FROM confirm_agreements WHERE clinic_id = $${nextParam}))`, value };
    case "confirm_templates":
      return null;
    default:
      return { sql: "false", value };
  }
}

export function clinicWriteError(
  table: string,
  actor: ClinicActor,
  body: Record<string, unknown>,
  existingClinicId?: string | null,
): string | null {
  if (isOrgScope(actor)) return null;
  if (table === "confirm_templates" || table === "confirm_clinics") {
    return "That change is limited to Head Office.";
  }
  if (table === "confirm_agreements" || table === "confirm_people") {
    const clinicId = String(body.clinic_id ?? existingClinicId ?? "");
    if (existingClinicId && existingClinicId !== actor.branchId) {
      return table === "confirm_people" ? "That staff record belongs to another clinic." : "That pack belongs to another clinic.";
    }
    if (clinicId && clinicId !== actor.branchId) {
      return table === "confirm_people" ? "That staff record belongs to another clinic." : "That pack belongs to another clinic.";
    }
  }
  if (
    (table === "confirm_signatures" || table === "confirm_signing_links" || table === "confirm_audit") &&
    existingClinicId &&
    existingClinicId !== actor.branchId
  ) {
    return "That pack belongs to another clinic.";
  }
  return null;
}

export function canIssueLinkForClinic(actor: ClinicActor, agreementClinicId: string): boolean {
  return isOrgScope(actor) || agreementClinicId === actor.branchId;
}
