import type { Agreement, Signature, WorkspaceState } from "./types.ts";
import type { EmployeeMail } from "./email-html.ts";
import { bytesToBase64, pngDataUrlToRgb, signedRecordToPdf, textPagesToPdf } from "./simple-pdf.ts";
import { deliverMail } from "./send-mail.ts";

export const ARCHIVE_RECORDS_INBOX = "info@relpdev.uk";

function roleLabel(role: string) {
  if (role === "manager") return "Franchisee / Head Office";
  if (role === "witness") return "Witness";
  return "Employee";
}

function surfaceLabel(value: string) {
  if (value === "salon_table") return "in the room";
  if (value === "personal_link") return "on their phone";
  if (value === "workspace") return "at the desk";
  return value || "not recorded";
}

function evidenceOf(signature: Signature) {
  try {
    return JSON.parse(signature.evidence || "{}") as {
      identityAssurance?: string;
      drawn?: boolean;
      drawnPng?: string | null;
      snapshotHash?: string;
    };
  } catch {
    return {};
  }
}

export function shortHash(hash: string) {
  return (hash || "").replace(/^sha256:/i, "").slice(0, 8);
}

export function buildCertificateLines(state: WorkspaceState, agreement: Agreement, signatures: Signature[]) {
  const employee = state.people.find((person) => person.id === agreement.employeeId);
  const manager = state.people.find((person) => person.id === agreement.managerId);
  const witness = agreement.witnessId ? state.people.find((person) => person.id === agreement.witnessId) : undefined;
  const clinic = state.branches.find((branch) => branch.id === agreement.branchId);
  const packSigs = signatures
    .filter((item) => item.agreementId === agreement.id && item.outcome === "signed")
    .sort((a, b) => a.signedAt.localeCompare(b.signedAt));

  const lines = [
    "This is the kept copy. Confirm does not decide competence or pay.",
    "",
    `Pack: ${agreement.title}`,
    `Module: ${agreement.snapshot.template.module}`,
    `Form version: ${agreement.snapshot.template.version}`,
    `Clinic: ${clinic?.name ?? "Not set"}`,
    `Issued: ${agreement.snapshot.issuedAt}`,
    `Completed: ${agreement.updatedAt}`,
    `Snapshot hash: ${agreement.snapshotHash}`,
    `Short hash: #${shortHash(agreement.snapshotHash)}`,
    "",
    `Employee: ${employee?.fullName ?? "Not set"}`,
    `Franchisee: ${manager?.fullName ?? "Not set"}`,
    `Witness: ${witness?.fullName ?? (agreement.witnessId ? "Named" : "Not required")}`,
  ];

  void packSigs;
  return lines;
}

export async function buildArchiveMail(state: WorkspaceState, agreement: Agreement): Promise<EmployeeMail> {
  const employee = state.people.find((person) => person.id === agreement.employeeId);
  const clinic = state.branches.find((branch) => branch.id === agreement.branchId);
  const hash = shortHash(agreement.snapshotHash);
  const date = new Date(agreement.updatedAt || Date.now()).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const packSigs = state.signatures
    .filter((item) => item.agreementId === agreement.id && item.outcome === "signed")
    .sort((a, b) => a.signedAt.localeCompare(b.signedAt));
  const header = buildCertificateLines(state, agreement, packSigs);
  const marks = [];
  for (const signature of packSigs) {
    const ev = evidenceOf(signature);
    marks.push({
      role: roleLabel(signature.role),
      typedName: signature.typedName,
      signedAt: signature.signedAt,
      how: surfaceLabel(ev.identityAssurance || ""),
      consent: signature.consentAccepted,
      pngRgb: await pngDataUrlToRgb(ev.drawnPng),
    });
  }
  const wording = [
    "Frozen wording",
    "---------------",
    ...(agreement.snapshot.template.content || "").split(/\r?\n/),
    "",
    "SkinPhD (Pty) Ltd \u00b7 skinphd.co.za",
    "Mailbox copy only. The live record stays in Confirm.",
  ];
  let pdf: Uint8Array;
  try {
    pdf = signedRecordToPdf(header, marks, wording);
  } catch {
    pdf = textPagesToPdf([...header, "", ...wording]);
  }
  const filename = `Confirm-kept-${(clinic?.code || clinic?.name || "clinic").replace(/\s+/g, "-")}-${(employee?.fullName || "employee").replace(/\s+/g, "-")}-${hash}.pdf`;

  return {
    to: ARCHIVE_RECORDS_INBOX,
    subject: `Confirm kept \u00b7 ${clinic?.name ?? "Clinic"} \u00b7 ${agreement.title} \u00b7 ${employee?.fullName ?? "employee"} \u00b7 ${date} \u00b7 #${hash}`,
    heading: "A sealed pack was kept",
    body: [
      "A SkinPhD Confirm pack is complete. This mailbox holds the second copy.",
      "",
      `Document pack: ${agreement.title}`,
      `Clinic: ${clinic?.name ?? "Not set"}`,
      `Employee: ${employee?.fullName ?? "Not set"}`,
      `Completed: ${agreement.updatedAt}`,
      `Snapshot hash: ${agreement.snapshotHash}`,
      "",
      "The attached PDF shows the typed names and the drawn marks, plus the frozen wording.",
      "Confirm remains the live record. If this mail and Confirm ever disagree, Confirm wins.",
      "",
      "Kind regards,",
      "SkinPhD Confirm",
    ].join("\n"),
    attachments: [
      {
        filename,
        contentBase64: bytesToBase64(pdf),
        contentType: "application/pdf",
      },
    ],
  };
}

export async function sendArchiveMailIfDue(state: WorkspaceState, agreementId: string): Promise<"sent" | "skipped" | "failed"> {
  const agreement = state.agreements.find((item) => item.id === agreementId);
  if (!agreement) return "skipped";
  if (agreement.status !== "completed") return "skipped";
  if (agreement.archiveMailedAt) return "skipped";
  if (state.audit.some((item) => item.agreementId === agreement.id && item.action === "Archive mail sent")) {
    return "skipped";
  }
  const required = agreement.requiredSignatures;
  const signed = state.signatures.filter((item) => item.agreementId === agreement.id && item.outcome === "signed").length;
  if (signed < required) return "skipped";
  const mail = await buildArchiveMail(state, agreement);
  const result = await deliverMail(mail, { compose: false });
  return result === "sent" ? "sent" : "failed";
}
