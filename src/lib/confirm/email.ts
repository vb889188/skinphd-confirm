import type { Agreement, WorkspaceState } from "./types";

export type EmployeeMail = {
  to: string;
  subject: string;
  body: string;
};

export function employeeMailHref(mail: EmployeeMail) {
  return `mailto:${encodeURIComponent(mail.to)}?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.body)}`;
}

export function buildWelcomeMail(input: {
  fullName: string;
  email: string;
  role: string;
  clinic: string;
  pin: string;
  siteUrl: string;
}): EmployeeMail {
  const role =
    input.role === "manager" ? "franchisee" : input.role === "witness" ? "witness" : "employee";
  return {
    to: input.email,
    subject: "SkinPhD Confirm sign-in details",
    body: [
      `Hello ${input.fullName},`,
      "",
      "A SkinPhD Confirm workspace identity was created for you.",
      "",
      `Name: ${input.fullName}`,
      `Email: ${input.email}`,
      `Role: ${role}`,
      `SkinPhD branch: ${input.clinic}`,
      `Temporary PIN: ${input.pin}`,
      "",
      "Sign in here:",
      input.siteUrl,
      "",
      "Change the PIN under Settings after the first sign-in. Do not forward this email.",
      "This mailbox message does not mean an agreement is signed.",
      "",
      "SkinPhD Confirm",
    ].join("\n"),
  };
}

export function buildSignCodeMail(input: { fullName: string; email: string; title: string; code: string; siteUrl: string }): EmployeeMail {
  return {
    to: input.email,
    subject: `SkinPhD Confirm sign code — ${input.title}`,
    body: [
      `Hello ${input.fullName},`,
      "",
      "Use this 6-digit code to record your typed signature.",
      "",
      `Code: ${input.code}`,
      "This code expires in 15 minutes.",
      "",
      input.siteUrl,
      "",
      "If you did not expect this pack, tell SkinPhD Head Office. The code is not a completed signature.",
      "",
      "SkinPhD Confirm",
    ].join("\n"),
  };
}

export function buildEmployeeMail(state: WorkspaceState, agreement: Agreement, siteUrl: string): EmployeeMail {
  const employee = state.people.find((person) => person.id === agreement.employeeId);
  const manager = state.people.find((person) => person.id === agreement.managerId);
  const witness = agreement.witnessId ? state.people.find((person) => person.id === agreement.witnessId) : null;
  const clinic = state.branches.find((branch) => branch.id === agreement.branchId);
  const to = employee?.email ?? "";
  const subject = `SkinPhD Confirm: ${agreement.title}`;
  const body = [
    `Hello ${employee?.fullName ?? "colleague"},`,
    "",
    "SkinPhD Confirm has issued an employee agreement pack for your review and signature.",
    "",
    "Agreement",
    `- Title: ${agreement.title}`,
    `- Status: ${agreement.status.replaceAll("_", " ")}`,
    `- Template: ${agreement.snapshot.template.name} v${agreement.snapshot.template.version}`,
    `- Module: ${agreement.snapshot.template.module}`,
    `- SkinPhD branch: ${clinic ? `${clinic.name} (${clinic.code})` : "Not set"}`,
    `- Employee: ${employee?.fullName ?? "Not set"}`,
    `- Franchisee: ${manager?.fullName ?? "Not set"}`,
    `- Witness: ${witness?.fullName ?? "Not assigned"}`,
    `- Deemed cost: R${(agreement.costCents / 100).toLocaleString("en-ZA")}`,
    `- Snapshot: ${agreement.snapshotHash}`,
    "",
    "Open the workspace to sign with your typed name:",
    siteUrl,
    "",
    "This email records issued fields only. It does not confirm competence, treatment authorisation, or a payroll deduction.",
    "",
    "SkinPhD Confirm",
  ].join("\n");
  return { to, subject, body };
}

export function buildReminderMail(state: WorkspaceState, agreement: Agreement, siteUrl: string): EmployeeMail {
  const outstanding = agreement.snapshot.signers.filter((signer) =>
    !state.signatures.some((item) => item.agreementId === agreement.id && item.role === signer.role && item.outcome === "signed"),
  );
  const recipients = outstanding
    .map((signer) => state.people.find((person) => person.id === signer.id)?.email)
    .filter((email): email is string => Boolean(email));
  return {
    to: recipients.join(","),
    subject: `Reminder: SkinPhD Confirm signature outstanding — ${agreement.title}`,
    body: [
      "A SkinPhD Confirm pack is waiting for signature.",
      "",
      `Agreement: ${agreement.title}`,
      `Outstanding: ${outstanding.map((item) => item.role).join(", ") || "none"}`,
      `Snapshot: ${agreement.snapshotHash}`,
      "",
      siteUrl,
      "",
      "SkinPhD Confirm",
    ].join("\n"),
  };
}

export function buildSignedRecordMail(state: WorkspaceState, agreement: Agreement, siteUrl: string): EmployeeMail {
  const employee = state.people.find((person) => person.id === agreement.employeeId);
  const manager = state.people.find((person) => person.id === agreement.managerId);
  const to = [employee?.email, manager?.email].filter((email): email is string => Boolean(email)).join(",");
  return {
    to,
    subject: `Signed record stored: ${agreement.title}`,
    body: [
      "The agreement is complete. SkinPhD Confirm has stored the signed record.",
      "",
      `Title: ${agreement.title}`,
      `Employee: ${employee?.fullName ?? "Not set"}`,
      `Franchisee: ${manager?.fullName ?? "Not set"}`,
      `Snapshot: ${agreement.snapshotHash}`,
      "",
      siteUrl,
      "",
      "SkinPhD Confirm",
    ].join("\n"),
  };
}
