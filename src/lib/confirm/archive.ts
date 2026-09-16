import type { Agreement, Signature, WorkspaceState } from "./types";
import type { EmployeeMail } from "./email";
import { bytesToBase64, textPagesToPdf } from "./simple-pdf";
import { deliverMail } from "./send-mail";

export const ARCHIVE_RECORDS_INBOX = "v@bdroyalengine.co.za";

function roleLabel(role: string) {
  if (role === "manager") return "Franchisee / Head Office";
  if (role === "witness") return "Witness";
  return "Employee";
}

function surfaceLabel(value: string) {
  if (value === "salon_table") return "in the room";
  if (value === "personal_link") return "on her phone";
  if (value === "workspace") return "at the desk";
  return value || "not recorded";
}

function evidenceOf(signature: Signature) {
  try {
    return JSON.parse(signature.evidence || "{}") as {
      identityAssurance?: string;
      drawn?: boolean;
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
    "SkinPhD Confirm  ·  Certificate of record",
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
    "",
    "Signatures",
    "----------",
  ];

  for (const signature of packSigs) {
    const ev = evidenceOf(signature);
    lines.push(
      `${roleLabel(signature.role)}: ${signature.typedName}`,
      `  Time: ${signature.signedAt}`,
      `  How: ${surfaceLabel(ev.identityAssurance || "")}`,
      `  Consent tick: ${signature.consentAccepted ? "yes" : "no"}`,
      `  Drawn mark: ${ev.drawn ? "yes" : "no"}`,
      "",
    );
  }

  lines.push("Frozen wording", "---------------");
  const wording = (agreement.snapshot.template.content || "").split(/\r?\n/);
  for (const line of wording) lines.push(line);
  lines.push("");
  lines.push("SkinPhD (Pty) Ltd · skinphd.co.za");
  lines.push("Mailbox copy only. The live record stays in Confirm.");
  return lines;
}

export function buildArchiveMail(state: WorkspaceState, agreement: Agreement): EmployeeMail {
  const employee = state.people.find((person) => person.id === agreement.employeeId);
  const clinic = state.branches.find((branch) => branch.id === agreement.branchId);
  const hash = shortHash(agreement.snapshotHash);
  const date = new Date(agreement.updatedAt || Date.now()).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const lines = buildCertificateLines(state, agreement, state.signatures);
  const pdf = textPagesToPdf(lines);
  const filename = `Confirm-kept-${(clinic?.code || clinic?.name || "clinic").replace(/\s+/g, "-")}-${(employee?.fullName || "employee").replace(/\s+/g, "-")}-${hash}.pdf`;

  return {
    to: ARCHIVE_RECORDS_INBOX,
    subject: `Confirm kept · ${clinic?.name ?? "Clinic"} · ${agreement.title} · ${employee?.fullName ?? "employee"} · ${date} · #${hash}`,
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
      "The attached PDF is the certificate of record plus the frozen wording and signatures.",
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
  const mail = buildArchiveMail(state, agreement);
  const result = await deliverMail(mail, { compose: false });
  return result === "sent" ? "sent" : "failed";
}
