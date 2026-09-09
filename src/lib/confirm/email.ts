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
      `PIN: ${input.pin}`,
      "",
      "Sign in here:",
      input.siteUrl,
      "",
      "This PIN does not expire. Head Office can issue a new one if it is lost.",
      "",
      "SkinPhD Confirm",
    ].join("\n"),
  };
}

export function buildSignCodeMail(input: { fullName: string; email: string; title: string; code: string; siteUrl: string }): EmployeeMail {
  return {
    to: input.email,
    subject: `SkinPhD Confirm — your pack`,
    body: [
      `Hello ${input.fullName},`,
      "",
      "This is your personal link for one frozen SkinPhD Confirm pack. It is not a PIN and not a 6-digit code.",
      "",
      `Pack: ${input.title}`,
      "",
      "Open it on your phone. If you have not signed yet, type your legal name as it appears on the staff list, tick the box, and record your signature — from home or before you come in.",
      "If you have already signed, the same link opens your copy of the frozen pack.",
      "",
      `${input.siteUrl}?sign=${input.code}`,
      "",
      "If you are in the salon, you can still sign on the tablet at the table instead.",
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
      "The employee should sign first. They can do that at the salon table, or from home on the personal link Head Office emailed. You sign after that name is recorded. Nobody collects a 6-digit code.",
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
      "Sign at the salon table, or open the personal link Head Office emailed. There is no PIN and no 6-digit code.",
      input.siteUrl,
      "",
      "SkinPhD Confirm",
    ].join("\n"),
  };
}

export function buildEmployeeMail(state: WorkspaceState, agreement: Agreement, siteUrl: string, pin?: string): EmployeeMail {
  const employee = state.people.find((person) => person.id === agreement.employeeId);
  const manager = state.people.find((person) => person.id === agreement.managerId);
  const clinic = state.branches.find((branch) => branch.id === agreement.branchId);
  const complete = agreement.status === "completed";
  return {
    to: employee?.email ?? "",
    subject: complete ? `Stored pack: ${agreement.title}` : `SkinPhD Confirm: ${agreement.title}`,
    body: [
      `Hello ${employee?.fullName ?? "colleague"},`,
      "",
      complete ? "SkinPhD Confirm has stored this signed pack." : "A pack is ready for your typed signature.",
      `- Title: ${agreement.title}`,
      `- Status: ${agreement.status.replaceAll("_", " ")}`,
      `- Franchisee: ${manager?.fullName ?? "Not set"}`,
      `- SkinPhD branch: ${clinic ? `${clinic.name} (${clinic.code})` : "Not set"}`,
      `- Snapshot: ${agreement.snapshotHash}`,
      "",
      "Sign in",
      siteUrl,
      `Email: ${employee?.email ?? ""}`,
      pin ? `PIN: ${pin}` : "Therapists do not collect a PIN. Use the personal link Head Office emailed to sign or to open your copy.",
      pin ? "This PIN does not expire. Head Office can issue a new one if it is lost." : "",
      "",
      "SkinPhD Confirm",
    ].filter((line) => line !== "").join("\n"),
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

export function buildSignedRecordMail(state: WorkspaceState, agreement: Agreement, siteUrl: string, recordUrl?: string): EmployeeMail {
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
      "",
      recordUrl
        ? "The employee can open their copy on this personal link (not a PIN):"
        : "Ask Head Office to email the employee their copy link if they need to open the pack from home.",
      recordUrl ?? siteUrl,
      "",
      "SkinPhD Confirm",
    ].join("\n"),
  };
}
