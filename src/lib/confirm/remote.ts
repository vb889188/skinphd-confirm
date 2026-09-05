import type { Agreement, AuditEvent, Branch, Person, Signature, SigningLink, WorkspaceState } from "./types";
import { SOURCE_TEMPLATES } from "./templates";

export const CONFIRM_TENANT_ID = "49937a9c-4c8c-420f-bac7-f2ff3f22f43e";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const workspaceKey = import.meta.env.VITE_CONFIRM_WORKSPACE_KEY as string | undefined;

export function remoteEnabled() {
  return Boolean(url && key && workspaceKey);
}

export function isProductionMode() {
  return import.meta.env.VITE_CONFIRM_MODE === "production";
}

async function rest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!url || !key || !workspaceKey) throw new Error("Supabase is not configured");
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
      "x-confirm-workspace": workspaceKey,
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Supabase request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  const body = await response.text();
  return (body ? JSON.parse(body) : undefined) as T;
}

type ClinicRow = { id: string; name: string; code: string; created_at: string };
type PersonRow = { id: string; clinic_id: string; full_name: string; email: string; role: Person["role"]; status: Person["status"]; pin_hash: string | null; created_at: string };
type AgreementRow = {
  id: string;
  clinic_id: string;
  employee_id: string;
  manager_id: string;
  witness_id: string | null;
  template_id: string;
  title: string;
  activity: string;
  status: Agreement["status"];
  cost_cents: number;
  starts_on: string | null;
  ends_on: string | null;
  required_signatures: number;
  snapshot: Agreement["snapshot"];
  snapshot_json: string;
  snapshot_hash: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};
type PayloadRow = { id: string; agreement_id?: string | null; payload?: Signature | SigningLink; actor?: string; action?: string; detail?: string; created_at: string };

export async function loadRemoteWorkspace(): Promise<Pick<WorkspaceState, "branches" | "people" | "templates" | "agreements" | "signatures" | "links" | "audit">> {
  const [clinics, people, agreements, signatures, links, audit] = await Promise.all([
    rest<ClinicRow[]>("confirm_clinics?select=*&order=name.asc"),
    rest<PersonRow[]>("confirm_people?select=*&order=full_name.asc"),
    rest<AgreementRow[]>("confirm_agreements?select=*&order=created_at.desc"),
    rest<PayloadRow[]>("confirm_signatures?select=*"),
    rest<PayloadRow[]>("confirm_signing_links?select=*"),
    rest<PayloadRow[]>("confirm_audit?select=*&order=created_at.desc"),
  ]);

  return {
    branches: clinics.map((row) => ({ id: row.id, name: row.name, code: row.code, createdAt: row.created_at })),
    people: people.map((row) => ({
      id: row.id,
      branchId: row.clinic_id,
      fullName: row.full_name,
      email: row.email,
      role: row.role,
      status: row.status,
      pinHash: row.pin_hash,
      createdAt: row.created_at,
    })),
    templates: SOURCE_TEMPLATES,
    agreements: agreements.map((row) => ({
      id: row.id,
      title: row.title,
      branchId: row.clinic_id,
      employeeId: row.employee_id,
      managerId: row.manager_id,
      witnessId: row.witness_id,
      templateId: row.template_id,
      status: row.status,
      activity: row.activity,
      costCents: row.cost_cents,
      startsOn: row.starts_on,
      endsOn: row.ends_on,
      requiredSignatures: row.required_signatures,
      snapshot: row.snapshot,
      snapshotJson: row.snapshot_json,
      snapshotHash: row.snapshot_hash,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    signatures: signatures.map((row) => row.payload as Signature),
    links: links.map((row) => row.payload as SigningLink),
    audit: audit.map((row) => ({
      id: row.id,
      agreementId: row.agreement_id ?? null,
      actor: row.actor ?? "System",
      action: row.action ?? "Recorded",
      detail: row.detail ?? "",
      createdAt: row.created_at,
    })),
  };
}

export async function upsertClinic(branch: Branch) {
  await rest("confirm_clinics?on_conflict=id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      id: branch.id,
      tenant_id: CONFIRM_TENANT_ID,
      name: branch.name,
      code: branch.code,
      created_at: branch.createdAt,
    }),
  });
}

export async function upsertPerson(person: Person) {
  await rest("confirm_people?on_conflict=id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      id: person.id,
      tenant_id: CONFIRM_TENANT_ID,
      clinic_id: person.branchId,
      full_name: person.fullName,
      email: person.email,
      role: person.role,
      status: person.status,
      pin_hash: person.pinHash,
      created_at: person.createdAt,
    }),
  });
}

export async function upsertAgreement(agreement: Agreement) {
  await rest("confirm_agreements?on_conflict=id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      id: agreement.id,
      tenant_id: CONFIRM_TENANT_ID,
      clinic_id: agreement.branchId,
      employee_id: agreement.employeeId,
      manager_id: agreement.managerId,
      witness_id: agreement.witnessId,
      template_id: agreement.templateId,
      title: agreement.title,
      activity: agreement.activity,
      status: agreement.status,
      cost_cents: agreement.costCents,
      starts_on: agreement.startsOn,
      ends_on: agreement.endsOn,
      required_signatures: agreement.requiredSignatures,
      snapshot: agreement.snapshot,
      snapshot_json: agreement.snapshotJson,
      snapshot_hash: agreement.snapshotHash,
      created_by: agreement.createdBy,
      created_at: agreement.createdAt,
      updated_at: agreement.updatedAt,
    }),
  });
}

export async function upsertSignature(signature: Signature) {
  await rest("confirm_signatures?on_conflict=id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      id: signature.id,
      tenant_id: CONFIRM_TENANT_ID,
      agreement_id: signature.agreementId,
      payload: signature,
      created_at: signature.signedAt,
    }),
  });
}

export async function upsertLink(link: SigningLink) {
  await rest("confirm_signing_links?on_conflict=id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      id: link.id,
      tenant_id: CONFIRM_TENANT_ID,
      agreement_id: link.agreementId,
      payload: link,
      created_at: link.createdAt,
    }),
  });
}

export async function upsertAudit(event: AuditEvent) {
  await rest("confirm_audit?on_conflict=id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      id: event.id,
      tenant_id: CONFIRM_TENANT_ID,
      agreement_id: event.agreementId,
      actor: event.actor,
      action: event.action,
      detail: event.detail,
      created_at: event.createdAt,
    }),
  });
}

export async function persistWorkspace(state: WorkspaceState) {
  if (!remoteEnabled()) return;
  await Promise.all([
    ...state.branches.map(upsertClinic),
    ...state.people.map(upsertPerson),
    ...state.agreements.map(upsertAgreement),
    ...state.signatures.map(upsertSignature),
    ...state.links.map(upsertLink),
    ...state.audit.slice(0, 40).map(upsertAudit),
  ]);
}
