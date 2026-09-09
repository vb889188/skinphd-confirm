import type { Agreement, WorkspaceState } from "./types";

export type EmployeeMail = {
  to: string;
  subject: string;
  body: string;
};

export function employeeMailHref(mail: EmployeeMail) {
  return `mailto:${encodeURIComponent(mail.to)}?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.body)}`;
}

export function confirmSiteUrl() {
  const configured = (import.meta.env.VITE_CONFIRM_PUBLIC_URL as string | undefined)?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (typeof window === "undefined") return "https://confirm.relpdev.uk";
  const host = window.location.hostname;
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "confirm.relpdev.uk" ||
    host.endsWith(".skinphd.co.za") ||
    host.endsWith("grok-sandbox.com")
  ) {
    return window.location.origin;
  }
  return "https://confirm.relpdev.uk";
}

export function packSignUrl(token: string) {
  return `${confirmSiteUrl()}?sign=${encodeURIComponent(token)}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;");
}

function bodyToHtml(body: string) {
  const escaped = escapeHtml(body).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#176b50;word-break:break-all;">$1</a>');
  return escaped
    .split(/\n{2,}/)
    .map((block) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#17231f;">${block.trim().replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

export function brandedHtml(subject: string, body: string, logoUrl?: string) {
  const logo = logoUrl || "https://confirm.relpdev.uk/skinphd-logo.png";
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#edf3ef;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#edf3ef;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fbfcfa;border:1px solid #d9e3de;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:#fbfcfa;padding:22px 28px 16px;border-bottom:4px solid #b8863a;">
              <img src="${escapeHtml(logo)}" alt="SkinPhD" width="160" style="display:block;height:auto;max-width:160px;">
              <p style="margin:10px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#0f3329;">Confirm</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;font-family:'Segoe UI',Arial,sans-serif;color:#17231f;">
              <h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.3;font-weight:500;color:#0f3329;">${escapeHtml(subject)}</h1>
              ${bodyToHtml(body)}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 24px;border-top:1px solid #d9e3de;font-family:'Segoe UI',Arial,sans-serif;font-size:12px;line-height:1.5;color:#61716a;">
              SkinPhD (Pty) Ltd · <a href="https://skinphd.co.za" style="color:#176b50;">skinphd.co.za</a><br/>
              This is a Confirm record for an employee pack. It is not a salon booking and not a client treatment consent.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function whereYouCanSign(link?: string) {
  return [
    "You can do this wherever you are today:",
    "",
    "• At the salon / shop — ask them to pass you the tablet. Read the pack on the screen first, then type your legal name as it appears on the staff list, tick the box, and you are done.",
    "• Not at the shop — open the personal link on your phone. Read the pack first. You can do this from home, in the car, or before you come in.",
    "• After you have signed — keep this email. The same link opens your copy of the pack.",
    "",
    "This link is only for this one pack.",
    "",
    link ? "Your personal link:" : "If you do not have a personal link yet, ask Head Office to email one, or sign on the tablet when you are in the salon.",
    ...(link ? [link] : []),
  ];
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
    body: desk
      ? [
          `Hello ${input.fullName},`,
          "",
          "Head Office set up your Confirm desk login. This PIN is only to open the Head Office / franchisee workspace. It is not used to sign a pack.",
          "",
          `Name: ${input.fullName}`,
          `Email: ${input.email}`,
          `Role: ${role}`,
          `SkinPhD branch: ${input.clinic}`,
          `Workspace PIN: ${input.pin}`,
          "",
          "Open the desk here:",
          input.siteUrl,
          "",
          "Change this PIN under Settings after you first sign in. If you lose it, Head Office can email a new one.",
          "",
          "SkinPhD Confirm",
        ].join("\n")
      : [
          `Hello ${input.fullName},`,
          "",
          "You are on the SkinPhD Confirm staff list.",
          "",
          "When Head Office issues a pack for you, they will email a personal link. Open that link to read the pack and put your name on it — at the salon, from home, or later for your copy.",
          "",
          ...whereYouCanSign(input.siteUrl.includes("?sign=") ? input.siteUrl : undefined),
          "",
          "SkinPhD Confirm",
        ].join("\n"),
  };
}

export function buildSignCodeMail(input: { fullName: string; email: string; title: string; code: string; siteUrl: string }): EmployeeMail {
  const link = `${input.siteUrl}?sign=${input.code}`;
  return {
    to: input.email,
    subject: `Please sign your SkinPhD pack — at the salon or from home`,
    body: [
      `Hello ${input.fullName},`,
      "",
      "Head Office has a SkinPhD pack waiting for your name.",
      `Pack: ${input.title}`,
      "",
      ...whereYouCanSign(link),
      "",
      "When the page opens, read the full pack first so you know what you are putting your name on. Then type your legal name exactly as it appears on the staff list, tick the box, and record your signature. You may also draw a mark with your finger.",
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
    subject: `Pack issued for ${input.employeeName}`,
    body: [
      `Hello ${input.toName},`,
      "",
      "A SkinPhD Confirm pack was issued for your branch.",
      `Employee: ${input.employeeName}`,
      `Pack: ${input.title}`,
      "",
      `${input.employeeName} signs first. They can do that at the salon on the tablet, or from home on the personal link Head Office emails them. The pack is on the screen before they type their name.`,
      "",
      "You sign after their name is on the pack.",
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
  packUrl?: string;
}): EmployeeMail {
  const employeeFacing = input.role !== "franchisee" && input.role !== "manager";
  return {
    to: input.toEmail,
    subject: employeeFacing
      ? `Your turn to sign — at the salon or from home`
      : `Your turn to sign — ${input.title}`,
    body: employeeFacing
      ? [
          `Hello ${input.toName},`,
          "",
          `${input.previousSigner} has already put their name on this SkinPhD pack.`,
          `Pack: ${input.title}`,
          "",
          "It is your turn.",
          "",
          ...whereYouCanSign(input.packUrl),
          "",
          "SkinPhD Confirm",
        ].join("\n")
      : [
          `Hello ${input.toName},`,
          "",
          `${input.previousSigner} has recorded their name on this pack.`,
          `Pack: ${input.title}`,
          "",
          "Please sign at the Confirm desk when you can. The employee signs first, on the tablet or from their personal link.",
          input.siteUrl,
          "",
          "SkinPhD Confirm",
        ].join("\n"),
  };
}

export function buildEmployeeMail(state: WorkspaceState, agreement: Agreement, siteUrl: string, pin?: string, packUrl?: string): EmployeeMail {
  const employee = state.people.find((person) => person.id === agreement.employeeId);
  const manager = state.people.find((person) => person.id === agreement.managerId);
  const clinic = state.branches.find((branch) => branch.id === agreement.branchId);
  const complete = agreement.status === "completed";
  const name = employee?.fullName ?? "colleague";
  return {
    to: employee?.email ?? "",
    subject: complete
      ? `Your signed SkinPhD pack is stored`
      : `Your SkinPhD pack — sign at the salon or from home`,
    body: complete
      ? [
          `Hello ${name},`,
          "",
          "Your pack is complete. SkinPhD Head Office has stored the signed copy.",
          `Pack: ${agreement.title}`,
          `Branch: ${clinic ? clinic.name : "Not set"}`,
          `Franchisee: ${manager?.fullName ?? "Not set"}`,
          "",
          packUrl
            ? "Open your copy on this personal link. Keep this email."
            : "Ask Head Office to email your personal copy link if you want to open this pack from home.",
          packUrl ?? "",
          "",
          "SkinPhD Confirm",
        ].filter((line) => line !== "").join("\n")
      : [
          `Hello ${name},`,
          "",
          "Head Office has a SkinPhD pack waiting for your name. Read the pack on the page before you sign.",
          `Pack: ${agreement.title}`,
          `Branch: ${clinic ? clinic.name : "Not set"}`,
          "",
          ...whereYouCanSign(packUrl),
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
    body: [
      "A SkinPhD Confirm pack is still waiting for a signature.",
      `Pack: ${agreement.title}`,
      `Still needed: ${names || "none"}`,
      "",
      "If you are the employee: you can sign at the salon on the tablet, or from home on the personal link Head Office emailed you. Read the pack on the page before you put your name on it. If you cannot find that email, ask Head Office to send the link again.",
      "",
      "If you are the franchisee: open Confirm and sign after the employee.",
      "",
      siteUrl,
      "",
      "SkinPhD Confirm",
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
    body: [
      `Hello ${employee?.fullName ?? "colleague"},`,
      "",
      "This pack is finished. Your name is on it, and SkinPhD Head Office has stored the signed copy.",
      `Pack: ${agreement.title}`,
      `Branch: ${clinic ? clinic.name : "Not set"}`,
      `Franchisee: ${manager?.fullName ?? "Not set"}`,
      "",
      recordUrl
        ? "Open your copy any time — from home or anywhere — on this personal link:"
        : "If you want a phone copy, ask Head Office to email your personal link.",
      recordUrl ?? siteUrl,
      "",
      "Keep this email. If you are at the salon, they can also print the certificate of record for you.",
      "",
      "SkinPhD Confirm",
    ].join("\n"),
  };
}
