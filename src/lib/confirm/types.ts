export type Role = "employee" | "manager" | "witness";
export type PersonStatus = "active" | "inactive";
export type TemplateCategory = "training" | "equipment" | "internal_waiver";
export type TemplateStatus = "draft" | "approved" | "superseded";
export type AgreementStatus =
  | "draft"
  | "awaiting_signatures"
  | "partially_signed"
  | "completed"
  | "declined"
  | "superseded";
export type SigningLinkStatus = "pending" | "consumed" | "declined" | "expired" | "revoked";
export type SignatureOutcome = "signed" | "declined";

export type Branch = { id: string; name: string; code: string; createdAt: string };
export type AccessScope = "organisation" | "clinic" | "self";
export type Person = {
  id: string;
  branchId: string;
  fullName: string;
  email: string;
  role: Role;
  status: PersonStatus;
  pinHash: string | null;
  scope?: AccessScope;
  createdAt: string;
};
export type Template = {
  id: string;
  name: string;
  category: TemplateCategory;
  version: string;
  status: TemplateStatus;
  module: string;
  sourceFile: string;
  sourceFileId: string | null;
  dailyRateRands: number | null;
  defaultDays: number | null;
  passPercent: number | null;
  mandatoryMonths: number | null;
  requiresWitness: boolean;
  hasWaiver: boolean;
  equipmentLabel: string | null;
  content: string;
  approvedAt: string | null;
  createdAt: string;
};
export type SnapshotFields = {
  costRands: number;
  startsOn: string | null;
  endsOn: string | null;
  days: number | null;
  dailyRateRands: number | null;
  passPercent: number | null;
  mandatoryMonths: number | null;
  contractEndOn: string | null;
  employeeIdNumber: string | null;
  employeePhone: string | null;
  employeeTitle: string | null;
  equipmentMake: string | null;
  equipmentModel: string | null;
  equipmentSerial: string | null;
  additionalDescription: string | null;
};
export type Snapshot = {
  agreementId: string;
  title: string;
  activity: string;
  branchId: string;
  template: Pick<Template, "id" | "name" | "version" | "category" | "module" | "content" | "hasWaiver">;
  signers: Array<{ id: string; role: Role; name: string }>;
  fields: SnapshotFields;
  issuedAt: string;
};
export type Agreement = {
  id: string;
  title: string;
  branchId: string;
  employeeId: string;
  managerId: string;
  witnessId: string | null;
  templateId: string;
  status: AgreementStatus;
  activity: string;
  costCents: number;
  startsOn: string | null;
  endsOn: string | null;
  requiredSignatures: number;
  snapshot: Snapshot;
  snapshotJson: string;
  snapshotHash: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastRemindedAt: string | null;
};
export type Signature = {
  id: string;
  agreementId: string;
  signerId: string;
  role: Role;
  typedName: string;
  method: "typed_name";
  signedAt: string;
  consentAccepted: boolean;
  evidence: string;
  outcome: SignatureOutcome;
  linkId: string | null;
};
export type SigningLink = {
  id: string;
  agreementId: string;
  signerId: string;
  role: Role;
  tokenHash: string;
  status: SigningLinkStatus;
  expiresAt: string;
  consumedAt: string | null;
  createdBy: string;
  createdAt: string;
};
export type AuditEvent = {
  id: string;
  agreementId: string | null;
  actor: string;
  action: string;
  detail: string;
  createdAt: string;
};
export type EmployeeRecord = {
  id: string;
  personId: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  sha256: string;
  note: string;
  createdAt: string;
};
export type WorkspaceState = {
  currentPersonId: string | null;
  sessionStartedAt: string | null;
  branches: Branch[];
  people: Person[];
  templates: Template[];
  agreements: Agreement[];
  signatures: Signature[];
  links: SigningLink[];
  audit: AuditEvent[];
  records: EmployeeRecord[];
};
