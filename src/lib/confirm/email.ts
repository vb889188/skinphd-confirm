import type { Agreement, Role, WorkspaceState } from "./types";

export type MailDetail = { label: string; value: string };
export type MailLink = { label: string; url: string };

export type EmployeeMail = {
  to: string;
  subject: string;
  body: string;
  heading?: string;
  intro?: string[];
  details?: MailDetail[];
  afterDetails?: string[];
  cta?: { label: string; url: string };
  labeledLink?: MailLink;
  outro?: string[];
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

function paragraphs(blocks: string[]) {
  return blocks
    .map((block) => block.trim())
    .filter(Boolean)
    .map(
      (block) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#1a2421;">${escapeHtml(block).replace(/\n/g, "<br/>")}</p>`,
    )
    .join("");
}

function detailsPanel(details: MailDetail[]) {
  if (!details.length) return "";
  const rows = details
    .map(
      (item) => `<tr>
      <td style="padding:6px 0;font-size:12px;line-height:1.4;color:#5d6d67;width:38%;vertical-align:top;">${escapeHtml(item.label)}</td>
      <td style="padding:6px 0;font-size:15px;line-height:1.45;color:#1a2421;word-break:break-word;overflow-wrap:anywhere;vertical-align:top;">${escapeHtml(item.value)}</td>
    </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 18px;background:#eef5f1;border:1px solid #d4e3db;border-radius:12px;">
  <tr>
    <td style="padding:14px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
    </td>
  </tr>
</table>`;
}

function labeledLinkHtml(link: MailLink) {
  return `<p style="margin:16px 0 6px;font-size:14px;line-height:1.4;font-weight:700;color:#0f3329;">${escapeHtml(link.label)}</p>
<p style="margin:0 0 18px;font-size:14px;line-height:1.5;">
  <a href="${escapeHtml(link.url)}" style="color:#176b50;text-decoration:underline;word-break:break-word;overflow-wrap:anywhere;">${escapeHtml(link.url)}</a>
</p>`;
}

function ctaButton(cta: { label: string; url: string }) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 16px;">
  <tr>
    <td>
      <a href="${escapeHtml(cta.url)}" style="display:block;width:100%;box-sizing:border-box;background:#176b50;color:#ffffff;text-align:center;text-decoration:none;font-family:'Segoe UI',Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.2;padding:14px 20px;border-radius:10px;">${escapeHtml(cta.label)}</a>
    </td>
  </tr>
</table>`;
}

function compose(input: {
  to: string;
  subject: string;
  heading: string;
  greeting: string;
  intro: string[];
  details?: MailDetail[];
  afterDetails?: string[];
  cta?: { label: string; url: string };
  labeledLink?: MailLink;
  outro: string[];
}): EmployeeMail {
  const details = input.details ?? [];
  const text = [
    input.greeting,
    "",
    ...input.intro,
    ...(details.length ? ["", ...details.map((item) => `${item.label}: ${item.value}`)] : []),
    ...(input.afterDetails?.length ? ["", ...input.afterDetails] : []),
    ...(input.cta ? ["", "If the button does not work, open this link:", input.cta.url] : []),
    ...(input.labeledLink ? ["", input.labeledLink.label, input.labeledLink.url] : []),
    ...(input.outro.length ? ["", ...input.outro] : []),
    "",
    "Kind regards,",
    "SkinPhD Head Office",
  ]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
  return {
    to: input.to,
    subject: input.subject,
    heading: input.heading,
    intro: [input.greeting, ...input.intro],
    details,
    afterDetails: input.afterDetails ?? [],
    cta: input.cta,
    labeledLink: input.labeledLink,
    outro: [...input.outro, "Kind regards,\nSkinPhD Head Office"],
    body: text,
  };
}

export function brandedHtml(mail: EmployeeMail, logoUrl?: string, heartbeatUrl?: string) {
  const logo = logoUrl || "https://confirm.relpdev.uk/skinphd-logo.png";
  const heartbeat = heartbeatUrl || "https://confirm.relpdev.uk/skinphd-heartbeat.png";
  const heading = mail.heading || mail.subject;
  const inner = [
    paragraphs(mail.intro ?? []),
    detailsPanel(mail.details ?? []),
    paragraphs(mail.afterDetails ?? []),
    mail.cta ? ctaButton(mail.cta) : "",
    mail.cta
      ? `<p style="margin:0 0 6px;font-size:14px;line-height:1.5;color:#5d6d67;">If the button does not work, open this link:</p>
<p style="margin:0 0 16px;font-size:14px;line-height:1.5;"><a href="${escapeHtml(mail.cta.url)}" style="color:#176b50;word-break:break-word;overflow-wrap:anywhere;">${escapeHtml(mail.cta.url)}</a></p>`
      : "",
    mail.labeledLink ? labeledLinkHtml(mail.labeledLink) : "",
    paragraphs(mail.outro ?? ["Kind regards,", "SkinPhD Head Office"]),
  ].join("");
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#ffffff;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:20px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #d4e3db;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:22px 24px 14px;border-bottom:3px solid #176b50;">
              <img src="${escapeHtml(logo)}" alt="SkinPhD" width="180" style="display:block;height:auto;max-width:180px;border:0;">
              <img src="${escapeHtml(heartbeat)}" alt="Heartbeat of skincare" width="160" style="display:block;height:auto;max-width:160px;margin-top:8px;border:0;">
              <p style="margin:10px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#176b50;">Confirm</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;font-family:'Segoe UI',Arial,sans-serif;color:#1a2421;">
              <h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:20px;line-height:1.35;font-weight:500;color:#0f3329;">${escapeHtml(heading)}</h1>
              ${inner}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px 22px;border-top:1px solid #d4e3db;font-family:'Segoe UI',Arial,sans-serif;font-size:12px;line-height:1.5;color:#5d6d67;">
              SkinPhD (Pty) Ltd · <a href="https://skinphd.co.za" style="color:#176b50;">skinphd.co.za</a><br/>
              This email relates to staff documents and agreements. It is not a salon booking confirmation or a client consent form.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function packDetails(packName: string, extra: MailDetail[] = []): MailDetail[] {
  return [{ label: "Document pack", value: packName }, ...extra];
}

function personById(state: Pick<WorkspaceState, "people">, id: string | null | undefined) {
  return state.people.find((person) => person.id === id) ?? null;
}

function branchName(state: Pick<WorkspaceState, "branches">, id: string) {
  return state.branches.find((branch) => branch.id === id)?.name || "Not set";
}

export function buildWelcomeMail(input: {
  fullName: string;
  email: string;
  role: string;
  clinic: string;
  pin: string;
  siteUrl: string;
}): EmployeeMail {
  const desk = input.role === "manager";
  if (desk) {
    return compose({
      to: input.email,
      subject: "Your SkinPhD Confirm login details",
      heading: "Access your Confirm workspace",
      greeting: `Hi ${input.fullName},`,
      intro: ["Here are your login details for SkinPhD Confirm, where you can review and manage staff documents and agreements."],
      details: [
        { label: "Name", value: input.fullName },
        { label: "Email", value: input.email },
        { label: "Branch", value: input.clinic },
        { label: "Workspace PIN", value: input.pin },
      ],
      labeledLink: { label: "Open your Confirm workspace:", url: input.siteUrl },
      outro: [
        "Use this PIN to access the workspace. It is not a document signing code.",
        "Please change your PIN under Settings after signing in, and keep it private. If you need a replacement PIN, contact Head Office.",
      ],
    });
  }
  return compose({
    to: input.email,
    subject: "Welcome to SkinPhD Confirm",
    heading: "Staff documents, made simpler",
    greeting: `Hi ${input.fullName},`,
    intro: [
      "You have been added to SkinPhD Confirm, our system for reviewing and signing staff documents and agreements.",
      "There is nothing you need to sign at this stage.",
      "When a document is ready for you, you will receive a separate email with your personal link and instructions. You can review and sign on your phone, tablet or computer, or use the salon tablet.",
      "You do not need a workspace PIN.",
    ],
    outro: ["If you are expecting a document and have not received it, please contact your salon manager or Head Office."],
  });
}

function reviewAndSignMail(input: {
  to: string;
  fullName: string;
  packName: string;
  branchName: string;
  personalLink?: string;
}): EmployeeMail {
  return compose({
    to: input.to,
    subject: "Your SkinPhD documents are ready to review and sign",
    heading: "Your documents are ready",
    greeting: `Hi ${firstName(input.fullName)},`,
    intro: ["SkinPhD Head Office has prepared the following documents for you:"],
    details: packDetails(input.packName, [{ label: "Branch", value: input.branchName }]),
    afterDetails: [
      "Please review and sign using your personal link below. You can use your phone, tablet or computer, or ask your salon team for the salon tablet.",
      "Before signing, read the documents carefully. Then enter your full legal name as recorded on the staff list and follow the on-screen instructions.",
    ],
    cta: input.personalLink ? { label: "Review and sign", url: input.personalLink } : undefined,
    outro: [
      ...(input.personalLink
        ? ["Keep this email so you can return to your documents after signing. Your link is personal to you, so please do not share it."]
        : []),
      "If anything is unclear, please speak to your salon manager or Head Office before signing.",
    ],
  });
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
  return compose({
    to: input.toEmail,
    subject: `Documents prepared for ${input.employeeName}`,
    heading: "Staff documents ready for review",
    greeting: `Hi ${input.toName},`,
    intro: ["Head Office has prepared the following document pack for an employee at your branch:"],
    details: [
      { label: "Employee", value: input.employeeName },
      { label: "Document pack", value: input.title },
    ],
    afterDetails: [
      "The employee needs to review and sign first. They can use their personal email link or the salon tablet.",
      "No signature is needed from you yet. We will email you when it is your turn to sign.",
    ],
    labeledLink: { label: "You can view the document status in your Confirm workspace:", url: input.siteUrl },
    outro: [],
  });
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
  if (employeeFacing) {
    return compose({
      to: input.toEmail,
      subject: `Your signature is needed — ${input.title}`,
      heading: "It is your turn to sign",
      greeting: `Hi ${input.toName},`,
      intro: [`${input.previousSigner} has signed the following document pack. It is now ready for your review and signature.`],
      details: packDetails(input.title),
      afterDetails: [
        "Please open your personal link, read the documents carefully and follow the on-screen signing instructions.",
        input.role === "witness" ? "If you are signing as a witness, please read the witness declaration carefully before completing your section." : "",
      ].filter(Boolean),
      labeledLink: input.packUrl
        ? { label: "Review and sign using your personal link:", url: input.packUrl }
        : undefined,
      outro: [
        "You can complete this on your phone, tablet or computer, or use the salon tablet.",
        "Keep this email for access to your documents. This link is personal to you and should not be shared.",
        "If you have any questions, please contact your salon manager or Head Office before signing.",
      ],
    });
  }
  return compose({
    to: input.toEmail,
    subject: `Your signature is needed — ${input.title}`,
    heading: "Ready for your signature",
    greeting: `Hi ${input.toName},`,
    intro: [`${input.previousSigner} has signed the following document pack. It is now your turn to review and sign.`],
    details: packDetails(input.title),
    afterDetails: ["Please open your Confirm workspace, review the documents and complete your signature."],
    labeledLink: { label: "Open your Confirm workspace:", url: input.siteUrl },
    outro: ["If you have any questions about the documents, please contact Head Office before signing."],
  });
}

export function buildEmployeeMail(state: WorkspaceState, agreement: Agreement, siteUrl: string, packUrl?: string): EmployeeMail {
  void siteUrl;
  const employee = personById(state, agreement.employeeId);
  const name = employee?.fullName ?? "colleague";
  if (agreement.status !== "completed") {
    return reviewAndSignMail({
      to: employee?.email ?? "",
      fullName: name,
      packName: agreement.title,
      branchName: branchName(state, agreement.branchId),
      personalLink: packUrl,
    });
  }
  return buildCompletedMail(state, agreement, siteUrl, {
    audience: "employee",
    personalLink: packUrl,
    resend: true,
  });
}

function outstandingSigners(state: WorkspaceState, agreement: Agreement) {
  return agreement.snapshot.signers.filter(
    (signer) =>
      !state.signatures.some((item) => item.agreementId === agreement.id && item.role === signer.role && item.outcome === "signed"),
  );
}

function outstandingNames(state: WorkspaceState, agreement: Agreement) {
  return outstandingSigners(state, agreement)
    .map((item) => {
      const person = personById(state, item.id);
      const who = item.role === "manager" ? "franchisee" : item.role === "witness" ? "witness" : "employee";
      return person ? `${person.fullName} (${who})` : who;
    })
    .join(", ");
}

export function buildReminderMails(
  state: WorkspaceState,
  agreement: Agreement,
  siteUrl: string,
  packUrls: Partial<Record<"employee" | "witness", string>> = {},
): EmployeeMail[] {
  const names = outstandingNames(state, agreement) || "none";
  return outstandingSigners(state, agreement).flatMap((signer) => {
    const person = personById(state, signer.id);
    if (!person?.email) return [];
    const franchisee = signer.role === "manager";
    const link = signer.role === "witness" ? packUrls.witness : packUrls.employee;
    if (franchisee) {
      return [
        compose({
          to: person.email,
          subject: `Reminder: signature required — ${agreement.title}`,
          heading: "A reminder to review and sign",
          greeting: "Hello,",
          intro: ["This is a friendly reminder that the following document pack still requires a signature."],
          details: packDetails(agreement.title, [{ label: "Awaiting signatures from", value: names }]),
          afterDetails: ["Please open your Confirm workspace to check the document status. You can complete your signature once the employee has signed."],
          labeledLink: { label: "Open your Confirm workspace:", url: siteUrl },
          outro: [
            "If you have already completed your signature, thank you. No further action is needed from you.",
            "For assistance, please contact Head Office.",
          ],
        }),
      ];
    }
    const withLink = Boolean(link);
    return [
      compose({
        to: person.email,
        subject: `Reminder: signature required — ${agreement.title}`,
        heading: "A reminder to review and sign",
        greeting: "Hello,",
        intro: ["This is a friendly reminder that the following document pack still requires a signature."],
        details: packDetails(agreement.title, [{ label: "Awaiting signatures from", value: names }]),
        afterDetails: withLink
          ? ["If it is your turn to sign, please read the documents carefully and complete your section using your personal link."]
          : ["If it is your turn to sign, please use the personal link previously emailed to you or ask to use the salon tablet. Contact Head Office if you need your link resent."],
        labeledLink: withLink ? { label: "Open your documents:", url: link as string } : undefined,
        outro: [
          ...(withLink ? ["You can also use the salon tablet."] : []),
          "If you have already completed your signature, thank you. No further action is needed from you.",
          "For assistance, please contact Head Office.",
        ],
      }),
    ];
  });
}

export function buildReminderMail(
  state: WorkspaceState,
  agreement: Agreement,
  siteUrl: string,
  packUrl?: string,
): EmployeeMail {
  return (
    buildReminderMails(state, agreement, siteUrl, packUrl ? { employee: packUrl } : {})[0] ??
    compose({
      to: "",
      subject: `Reminder: signature required — ${agreement.title}`,
      heading: "A reminder to review and sign",
      greeting: "Hello,",
      intro: ["This is a friendly reminder that the following document pack still requires a signature."],
      details: packDetails(agreement.title),
      outro: ["For assistance, please contact Head Office."],
    })
  );
}

function buildCompletedMail(
  state: WorkspaceState,
  agreement: Agreement,
  siteUrl: string,
  input: { audience: "employee" | "franchisee"; personalLink?: string; resend?: boolean },
): EmployeeMail {
  const employee = personById(state, agreement.employeeId);
  const manager = personById(state, agreement.managerId);
  const employeeName = employee?.fullName ?? "employee";
  const franchiseeName = manager?.fullName ?? "franchisee";
  const forEmployee = input.audience === "employee";
  const to = (forEmployee ? employee?.email : manager?.email) ?? "";
  const greetingName = forEmployee ? employeeName : franchiseeName;
  return compose({
    to,
    subject: input.resend && forEmployee
      ? `Your signed SkinPhD documents — ${agreement.title}`
      : `Signing complete — ${employeeName} — ${agreement.title}`,
    heading: "Your signed documents are available",
    greeting: `Hi ${greetingName},`,
    intro: ["All required signatures have been completed, and Head Office has saved the signed document pack."],
    details: [
      { label: "Employee", value: employeeName },
      { label: "Document pack", value: agreement.title },
      { label: "Branch", value: branchName(state, agreement.branchId) },
      { label: "Franchisee", value: franchiseeName },
    ],
    labeledLink: forEmployee
      ? input.personalLink
        ? { label: "View your signed documents:", url: input.personalLink }
        : undefined
      : { label: "View the completed document pack in your Confirm workspace:", url: siteUrl },
    outro: forEmployee
      ? [
          "Keep this email for your records. If you need a printed certificate of record, please ask your salon team.",
          "No further signing action is required.",
        ]
      : ["No further signing action is required."],
  });
}

export function buildSignedRecordMails(
  state: WorkspaceState,
  agreement: Agreement,
  siteUrl: string,
  recordUrl?: string,
): EmployeeMail[] {
  if (agreement.status !== "completed") return [];
  return [
    buildCompletedMail(state, agreement, siteUrl, { audience: "employee", personalLink: recordUrl }),
    buildCompletedMail(state, agreement, siteUrl, { audience: "franchisee" }),
  ].filter((mail) => mail.to);
}

export function buildSignedRecordMail(
  state: WorkspaceState,
  agreement: Agreement,
  siteUrl: string,
  recordUrl?: string,
  audience: "employee" | "franchisee" = "employee",
): EmployeeMail {
  return buildCompletedMail(state, agreement, siteUrl, {
    audience,
    personalLink: audience === "employee" ? recordUrl : undefined,
    resend: audience === "employee",
  });
}

export type ReminderLinkRole = Extract<Role, "employee" | "witness">;
