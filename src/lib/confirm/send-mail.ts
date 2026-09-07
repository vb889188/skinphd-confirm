import { createServerFn } from "@tanstack/react-start";
import type { EmployeeMail } from "./email";
import { employeeMailHref } from "./email";

export const sendMailFn = createServerFn({ method: "POST" })
  .inputValidator((data: EmployeeMail) => data)
  .handler(async ({ data }) => {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !user || !pass) {
      return { ok: false as const, reason: "not_configured" };
    }
    const nodemailer = await import("nodemailer");
    const transport = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user, pass },
    });
    await transport.sendMail({
      from: process.env.SMTP_FROM || `SkinPhD Confirm <${user}>`,
      to: data.to,
      subject: data.subject,
      text: data.body,
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
