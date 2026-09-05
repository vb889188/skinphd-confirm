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
      "Change the PIN under Settings after the first sign-in.",
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
      "SkinPhD Confirm",
    ].join("\n"),
  };
}

export function buildFranchiseeIssuedMail(input: {
  toName: string;
  toEmail: string;
  title: string;
  employeeName: string;
  siteUrl: string;
}): EmployeeMail {
  return {
    to: input.toEmail,
    subject: `Pack issued — ${input.title}`,
    body: [
      `Hello ${input.toName},`,
      "",
      "A SkinPhD Confirm pack was issued for your branch.",
      `Employee: ${input.employeeName}`,
      `Agreement: ${input.title}`,
      "",
      "The employee should sign first. You sign after that name is recorded.",
      input.siteUrl,
      "",
      "SkinPhD Confirm",
    ].join("\n"),
  };
}

export function buildNextSignerMail(input: {
  toName: string;
  toEmail: string;
  title: string;
  role: string;
  previousSigner: string;
  siteUrl: string;
}): EmployeeMail {
  return {
    to: input.toEmail,
    subject: `Your turn to sign — ${input.title}`,
    body: [
      `Hello ${input.toName},`,
      "",
      `${input.previousSigner} has recorded a typed signature.`,
      `SkinPhD Confirm is waiting for you as ${input.role}.`,
      "",
      input.siteUrl,
      "",
      "Open the pack, request a sign code if needed, then type your name.",
      "",
      "SkinPhD Confirm",
    ].join("\n"),
  };
}

export function buildEmployeeMail(state: WorkspaceState, agreement: Agreement, siteUrl: string): EmployeeMail {
  const employee = state.people.find((person) => person.id === agreement.employeeId);
  const manager = state.people.find((person) => person.id === agreement.managerId);
  const clinic = state.branches.find((branch) => branch.id === agreement.branchId);
  return {
    to: employee?.email ?? "",
    subject: `SkinPhD Confirm: ${agreement.title}`,
    body: [
      `Hello ${employee?.fullName ?? "colleague"},`,
      "",
      "A pack is ready for your typed signature.",
      `- Title: ${agreement.title}`,
      `- Franchisee: ${manager?.fullName ?? "Not set"}`,
      `- SkinPhD branch: ${clinic ? `${clinic.name} (${clinic.code})` : "Not set"}`,
      `- Snapshot: ${agreement.snapshotHash}`,
      "",
      siteUrl,
      "",
      "SkinPhD Confirm",
    ].join("\n"),
  };
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
      `Outstanding: ${outstanding.map((item) => item.role).join(", ") || "none"}`,
      siteUrl,
      "",
      "SkinPhD Confirm",
    ].join("\n"),
  };
}

export function buildSignedRecordMail(state: WorkspaceState, agreement: Agreement, siteUrl: string): EmployeeMail {
  const employee = state.people.find((person) => person.id === agreement.employeeId);
  const manager = state.people.find((person) => person.id === agreement.managerId);
  return {
    to: [employee?.email, manager?.email].filter((email): email is string => Boolean(email)).join(","),
    subject: `Signed record stored: ${agreement.title}`,
    body: [
      "The agreement is complete. SkinPhD Confirm has stored the signed record.",
      `Employee: ${employee?.fullName ?? "Not set"}`,
      `Franchisee: ${manager?.fullName ?? "Not set"}`,
      `Snapshot: ${agreement.snapshotHash}`,
      siteUrl,
      "",
      "SkinPhD Confirm",
    ].join("\n"),
  };
}
