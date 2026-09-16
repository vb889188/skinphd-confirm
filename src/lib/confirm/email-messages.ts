import type { Agreement, WorkspaceState } from "./types.ts";
import { type EmployeeMail, firstName, packSignUrl } from "./email-html.ts";

function signOff() {
  return ["Kind regards,", "SkinPhD Head Office"];
}

function whereYouCanSign(link?: string) {
  return [
    "You can review and sign on the salon tablet, or on your phone or computer.",
    "",
    "Read the documents on the screen first. Then enter your full legal name as it appears on the staff list.",
    "",
    "Keep this email. After you sign, the same link opens your copy.",
    "",
    link ? "Your personal link:" : "If you do not have a personal link yet, ask Head Office to email one, or sign on the salon tablet.",
    ...(link ? [link] : []),
  ];
}

function reviewAndSignMail(input: {
  to: string;
  fullName: string;
  packName: string;
  branchName: string;
  personalLink?: string;
}): EmployeeMail {
  const link = input.personalLink;
  return {
    to: input.to,
    subject: "Your SkinPhD documents are ready to review and sign",
    heading: "Your documents are ready",
    cta: link ? { label: "Review and sign", url: link } : undefined,
    body: [
      `Hi ${firstName(input.fullName)},`,
      "",
      "SkinPhD Head Office has prepared the following documents for you to review and sign:",
      "",
      `Document pack: ${input.packName}`,
      `Branch: ${input.branchName}`,
      "",
      "You can complete this on your phone, tablet or computer, or ask your salon team for the salon tablet.",
      "",
      "Please read the documents carefully, enter your full legal name as recorded on the staff list, and follow the on-screen instructions.",
      "",
      ...(link
        ? ["If the button does not work, open this link:", link, ""]
        : ["If you do not have a personal link yet, ask Head Office to email one, or sign on the salon tablet.", ""]),
      "After signing, you can use the same link to view your completed documents. Keep this email for your records.",
      "",
      "This link is personal to you and applies only to this document pack. Please do not share it.",
      "",
      "If you have any questions before signing, please contact your salon manager or SkinPhD Head Office.",
      "",
      ...signOff(),
    ].join("\n"),
  };
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
    input.role === "manager" ? "franchisee / Head Office" : input.role === "witness" ? "witness" : "employee";
  const desk = input.role === "manager";
  return {
    to: input.email,
    subject: desk ? "Your SkinPhD Confirm desk login" : "You are on the SkinPhD Confirm staff list",
    heading: desk ? "Your Confirm login" : "Welcome to SkinPhD Confirm",
    body: desk
      ? [
          `Hi ${input.fullName},`,
          "",
          "Here is your login for the SkinPhD Confirm workspace. Use this PIN to open the Head Office / franchisee desk. It is not used to sign a document.",
          "",
          `Name: ${input.fullName}`,
          `Email: ${input.email}`,
          `Role: ${role}`,
          `Branch: ${input.clinic}`,
          `Workspace PIN: ${input.pin}`,
          "",
          "Open your Confirm workspace:",
          input.siteUrl,
          "",
          "Please change this PIN under Settings after you first sign in, and keep it private. If you lose it, Head Office can email a new one.",
          "",
          ...signOff(),
        ].join("\n")
      : [
          `Hi ${input.fullName},`,
          "",
          "You have been added to the SkinPhD Confirm staff list.",
          "",
          "There is nothing to sign yet. When a document pack is ready, Head Office will email your personal link. You can open it at the salon, from home, or later to view your copy.",
          "",
          "You do not need a workspace PIN.",
          "",
          "Open SkinPhD Confirm here:",
          input.siteUrl,
          "",
          "If you are expecting a document and have not received it, please contact your salon manager or Head Office.",
          "",
          ...signOff(),
        ].join("\n"),
  };
}

export function buildSignCodeMail(input: {
  fullName: string;
  email: string;
  title: string;
  code: string;
  siteUrl: string;
  branchName?: string;
}): EmployeeMail {
  void input.siteUrl;
  return reviewAndSignMail({
    to: input.email,
    fullName: input.fullName,
    packName: input.title,
    branchName: input.branchName || "SkinPhD",
    personalLink: packSignUrl(input.code),
  });
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
    subject: `Pack issued for ${input.employeeName}`,
    heading: "A document pack was issued",
    body: [
      `Hi ${input.toName},`,
      "",
      "Head Office has issued a SkinPhD Confirm pack for your branch.",
      "",
      `Employee: ${input.employeeName}`,
      `Document pack: ${input.title}`,
      "",
      `${input.employeeName} signs first, on the salon tablet or from the personal link emailed to them. You sign after their name is on the pack.`,
      "",
      "Open your Confirm workspace:",
      input.siteUrl,
      "",
      ...signOff(),
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
  packUrl?: string;
}): EmployeeMail {
  const employeeFacing = input.role !== "franchisee" && input.role !== "manager";
  return {
    to: input.toEmail,
    subject: employeeFacing
      ? `Your turn to sign — at the salon or from home`
      : `Your turn to sign — ${input.title}`,
    heading: "It is your turn to sign",
    body: employeeFacing
      ? [
          `Hi ${input.toName},`,
          "",
          `${input.previousSigner} has already signed this SkinPhD pack.`,
          "",
          `Document pack: ${input.title}`,
          "",
          ...whereYouCanSign(input.packUrl),
          "",
          ...signOff(),
        ].join("\n")
      : [
          `Hi ${input.toName},`,
          "",
          `${input.previousSigner} has signed this pack. It is now your turn.`,
          "",
          `Document pack: ${input.title}`,
          "",
          "Please open Confirm, read the documents, and complete your signature. The employee signs first.",
          "",
          "Open your Confirm workspace:",
          input.siteUrl,
          "",
          ...signOff(),
        ].join("\n"),
  };
}

export function buildEmployeeMail(state: WorkspaceState, agreement: Agreement, siteUrl: string, packUrl?: string): EmployeeMail {
  void siteUrl;
  const employee = state.people.find((person) => person.id === agreement.employeeId);
  const manager = state.people.find((person) => person.id === agreement.managerId);
  const clinic = state.branches.find((branch) => branch.id === agreement.branchId);
  const complete = agreement.status === "completed";
  const name = employee?.fullName ?? "colleague";
  const branchName = clinic ? clinic.name : "Not set";
  if (!complete) {
    return reviewAndSignMail({
      to: employee?.email ?? "",
      fullName: name,
      packName: agreement.title,
      branchName,
      personalLink: packUrl,
    });
  }
  return {
    to: employee?.email ?? "",
    subject: "Your signed SkinPhD pack is stored",
    heading: "Your signed documents are stored",
    body: [
      `Hi ${name},`,
      "",
      "Your pack is complete. SkinPhD Head Office has stored the signed copy.",
      "",
      `Document pack: ${agreement.title}`,
      `Branch: ${branchName}`,
      `Franchisee: ${manager?.fullName ?? "Not set"}`,
      "",
      packUrl ? "Open your copy on this personal link:" : "Ask Head Office to email your personal copy link if you want to open this pack from home.",
      ...(packUrl ? [packUrl] : []),
      "",
      "Keep this email for your records.",
      "",
      ...signOff(),
    ].join("\n"),
  };
}

export function buildReminderMail(state: WorkspaceState, agreement: Agreement, siteUrl: string, packUrl?: string): EmployeeMail {
  const outstanding = agreement.snapshot.signers.filter((signer) =>
    !state.signatures.some((item) => item.agreementId === agreement.id && item.role === signer.role && item.outcome === "signed"),
  );
  const employeeDue = outstanding.some((item) => item.role === "employee");
  const recipients = outstanding
    .map((signer) => state.people.find((person) => person.id === signer.id)?.email)
    .filter((email): email is string => Boolean(email));
  const names = outstanding
    .map((item) => {
      const person = state.people.find((entry) => entry.id === item.id);
      const who = item.role === "manager" ? "franchisee" : item.role === "witness" ? "witness" : "employee";
      return person ? `${person.fullName} (${who})` : who;
    })
    .join(", ");
  return {
    to: recipients.join(","),
    subject: `Reminder: a SkinPhD pack still needs a name`,
    heading: "A signature is still needed",
    body: [
      "This is a reminder that a SkinPhD document pack is still waiting for a signature.",
      "",
      `Document pack: ${agreement.title}`,
      `Still needed: ${names || "none"}`,
      "",
      employeeDue
        ? "If you are the employee, read the pack first, then enter your legal name. You can use the salon tablet or the personal link below."
        : "If you are the employee, use the personal link Head Office already emailed, or sign on the salon tablet.",
      ...(employeeDue && packUrl ? ["", "Your personal link:", packUrl] : []),
      "",
      "If you are the franchisee, open Confirm and sign after the employee.",
      "",
      "Open your Confirm workspace:",
      siteUrl,
      "",
      ...signOff(),
    ].join("\n"),
  };
}

export function buildSignedRecordMail(state: WorkspaceState, agreement: Agreement, siteUrl: string, recordUrl?: string): EmployeeMail {
  const employee = state.people.find((person) => person.id === agreement.employeeId);
  const manager = state.people.find((person) => person.id === agreement.managerId);
  const clinic = state.branches.find((branch) => branch.id === agreement.branchId);
  return {
    to: [employee?.email, manager?.email].filter((email): email is string => Boolean(email)).join(","),
    subject: `Signed: ${employee?.fullName ?? "employee"} pack is stored`,
    heading: "The signed pack is stored",
    body: [
      `Hi ${employee?.fullName ?? "colleague"},`,
      "",
      "This pack is finished. The signed copy is stored with SkinPhD Head Office.",
      "",
      `Document pack: ${agreement.title}`,
      `Branch: ${clinic ? clinic.name : "Not set"}`,
      `Franchisee: ${manager?.fullName ?? "Not set"}`,
      "",
      recordUrl ? "Open your copy on this personal link:" : "If you want a phone copy, ask Head Office to email your personal link.",
      ...(recordUrl ? [recordUrl] : []),
      "",
      "Open the Confirm workspace:",
      siteUrl,
      "",
      "Keep this email. If you are at the salon, they can also print the certificate of record for you.",
      "",
      ...signOff(),
    ].join("\n"),
  };
}
