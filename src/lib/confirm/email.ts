import type { Agreement, WorkspaceState } from "./types";

export type EmployeeMail = {
  to: string;
  subject: string;
  body: string;
  heading?: string;
  cta?: { label: string; url: string };
};

export function employeeMailHref(mail: EmployeeMail) {
  return `mailto:${encodeURIComponent(mail.to)}?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.body)}`;
}

export function confirmSiteUrl() {
  const configured = (import.meta.env?.VITE_CONFIRM_PUBLIC_URL as string | undefined)?.trim();
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

export function firstName(fullName: string) {
  return fullName.trim().split(/\s+/).find(Boolean) || "there";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;");
}

function isHttpUrl(line: string) {
  return /^https?:\/\/\S+$/i.test(line.trim());
}

function detailsPanel(rows: { label: string; value: string }[]) {
  const body = rows
    .map(
      (row) => `<tr>
      <td style="padding:7px 0;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;color:#5d6d67;width:36%;vertical-align:top;">${escapeHtml(row.label)}</td>
      <td style="padding:7px 0 7px 10px;font-size:15px;line-height:1.4;color:#0f3329;word-break:break-word;overflow-wrap:anywhere;vertical-align:top;">${escapeHtml(row.value)}</td>
    </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 18px;background:#eef5f1;border:1px solid #d4e3db;border-radius:12px;">
  <tr><td style="padding:14px 16px;border-left:4px solid #176b50;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${body}</table>
  </td></tr>
</table>`;
}

function linkCard(label: string, url: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;background:#eef5f1;border:1px solid #d4e3db;border-radius:12px;">
  <tr><td style="padding:14px 16px;border-left:4px solid #b8863a;">
    <p style="margin:0 0 6px;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#0f3329;">${escapeHtml(label.replace(/:$/, ""))}</p>
    <a href="${escapeHtml(url)}" style="color:#176b50;font-size:14px;line-height:1.5;font-weight:700;text-decoration:underline;word-break:break-word;overflow-wrap:anywhere;">${escapeHtml(url)}</a>
  </td></tr>
</table>`;
}

function bulletList(items: string[]) {
  const rows = items
    .map((item) => `<tr>
      <td style="width:18px;vertical-align:top;padding:3px 0;color:#b8863a;font-size:15px;">•</td>
      <td style="padding:3px 0;font-size:15px;line-height:1.5;color:#1a2421;">${escapeHtml(item)}</td>
    </tr>`)
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">${rows}</table>`;
}

function ctaButton(cta: { label: string; url: string }) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:10px 0 8px;">
  <tr>
    <td>
      <a href="${escapeHtml(cta.url)}" style="display:block;width:100%;box-sizing:border-box;background:#176b50;color:#ffffff;text-align:center;text-decoration:none;font-family:'Segoe UI',Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.2;padding:14px 20px;border-radius:10px;">${escapeHtml(cta.label)}</a>
    </td>
  </tr>
</table>`;
}

function paragraph(text: string) {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#1a2421;">${escapeHtml(text).replace(/\n/g, "<br/>")}</p>`;
}

function richBodyHtml(body: string, cta?: { label: string; url: string }) {
  const lines = body.replace(/\r/g, "").split("\n");
  let html = "";
  let i = 0;
  let buttonDone = !cta;
  const detail = /^([^:\n]{1,48}):\s+(.+)$/;

  const insertButton = () => {
    if (cta && !buttonDone) {
      html += ctaButton(cta);
      buttonDone = true;
    }
  };

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line) {
      i += 1;
      continue;
    }
    if (line === "If the button does not work, open this link:") {
      insertButton();
      const url = (lines[i + 1] || "").trim();
      if (isHttpUrl(url)) {
        html += linkCard("If the button does not work, open this link", url);
        i += 2;
        continue;
      }
    }
    if (detail.test(line) && !isHttpUrl(line)) {
      const rows: { label: string; value: string }[] = [];
      while (i < lines.length) {
        const next = lines[i].trim();
        const match = next.match(detail);
        if (!next || !match || isHttpUrl(next) || isHttpUrl(match[2])) break;
        rows.push({ label: match[1], value: match[2] });
        i += 1;
      }
      if (rows.length) {
        html += detailsPanel(rows);
        continue;
      }
    }
    if (!isHttpUrl(line) && i + 1 < lines.length && isHttpUrl(lines[i + 1].trim())) {
      insertButton();
      html += linkCard(line, lines[i + 1].trim());
      i += 2;
      continue;
    }
    if (isHttpUrl(line)) {
      insertButton();
      html += linkCard("Open this link", line);
      i += 1;
      continue;
    }
    if (line.startsWith("• ") || line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length) {
        const next = lines[i].trim();
        if (!next.startsWith("• ") && !next.startsWith("- ")) break;
        items.push(next.replace(/^[•-]\s+/, ""));
        i += 1;
      }
      html += bulletList(items);
      continue;
    }
    const para: string[] = [line];
    i += 1;
    while (i < lines.length) {
      const next = lines[i].trim();
      if (!next) break;
      if (isHttpUrl(next) || next.startsWith("• ") || next.startsWith("- ") || (detail.test(next) && !isHttpUrl(next))) break;
      if (i + 1 < lines.length && isHttpUrl(lines[i + 1].trim())) break;
      if (next === "If the button does not work, open this link:") break;
      para.push(next);
      i += 1;
    }
    html += paragraph(para.join("\n"));
  }
  insertButton();
  return html;
}

export function brandedHtml(
  subject: string,
  body: string,
  logoUrl?: string,
  _heartbeatUrl?: string,
  extras?: { heading?: string; cta?: { label: string; url: string } },
) {
  const logo = logoUrl || "https://confirm.relpdev.uk/skinphd-logo.png";
  const heading = extras?.heading || subject;
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f3eee4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3eee4;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e4d9c6;border-radius:18px;overflow:hidden;">
          <tr>
            <td style="height:8px;background:#0f3329;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:22px 28px 16px;border-bottom:3px solid #b8863a;">
              <img src="${escapeHtml(logo)}" alt="SkinPhD" width="190" style="display:block;height:auto;max-width:190px;border:0;">
              <p style="margin:12px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#176b50;">Confirm</p>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 24px 8px;font-family:'Segoe UI',Arial,sans-serif;color:#1a2421;">
              <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:20px;line-height:1.35;font-weight:500;color:#0f3329;">${escapeHtml(heading)}</h1>
              ${richBodyHtml(body, extras?.cta)}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px 22px;border-top:1px solid #e4d9c6;font-family:'Segoe UI',Arial,sans-serif;font-size:12px;line-height:1.5;color:#5d6d67;">
              SkinPhD (Pty) Ltd · <a href="https://skinphd.co.za" style="color:#176b50;">skinphd.co.za</a><br/>
              This email relates to staff documents. It is not a salon booking and not a client treatment consent.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

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
