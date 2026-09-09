import { createServerFn } from "@tanstack/react-start";
import type { EmployeeMail } from "./email";
import { brandedHtml, employeeMailHref } from "./email";

export const sendMailFn = createServerFn({ method: "POST" })
  .inputValidator((data: EmployeeMail) => data)
  .handler(async ({ data }) => {
    const host = process.env.SMTP_HOST || process.env.MAIL_HOST;
    const user = process.env.SMTP_USER || process.env.MAIL_USERNAME;
    const pass = process.env.SMTP_PASS || process.env.MAIL_PASSWORD;
    const port = Number(process.env.SMTP_PORT || process.env.MAIL_PORT || 587);
    if (!host || !user || !pass) {
      return { ok: false as const, reason: "not_configured" };
    }
    const nodemailer = await import("nodemailer");
    const secure = process.env.SMTP_SECURE === "true" || port === 465;
    const transport = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
    const publicUrl = process.env.CONFIRM_PUBLIC_URL || process.env.MAIL_LOGO_URL || "https://confirm.relpdev.uk";
    const logoUrl = `${publicUrl.replace(/\/$/, "")}/skinphd-logo.png`;
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.MAIL_FROM || `SkinPhD Confirm <${user}>`,
      to: data.to,
      subject: data.subject,
      text: data.body,
      html: brandedHtml(data.subject, data.body, logoUrl),
    });
    return { ok: true as const };
  });

export async function deliverMail(mail: EmployeeMail): Promise<"sent" | "compose"> {
  if (!mail.to) return "compose";
  try {
    const result = await sendMailFn({ data: mail });
    if (result.ok) return "sent";
  } catch {
    // Fall back to the mail app so Head Office can still send.
  }
  window.location.href = employeeMailHref(mail);
  return "compose";
}
