import { createServerFn } from "@tanstack/react-start";
import type { EmployeeMail } from "./email";
import { brandedHtml, employeeMailHref } from "./email";

export const sendMailFn = createServerFn({ method: "POST" })
  .validator((data: EmployeeMail) => data)
  .handler(async ({ data }) => {
    const host = process.env.SMTP_HOST || process.env.MAIL_HOST;
    const user = process.env.SMTP_USER || process.env.MAIL_USERNAME;
    const rawPass = process.env.SMTP_PASS || process.env.MAIL_PASSWORD || "";
    const pass = rawPass.trim().replace(/^["']|["']$/g, "");
    const port = Number(process.env.SMTP_PORT || process.env.MAIL_PORT || 587);
    if (!host || !user || !pass) {
      return { ok: false as const, reason: "not_configured" };
    }
    try {
      const nodemailer = await import("nodemailer");
      const { existsSync, readFileSync } = await import("node:fs");
      const { join } = await import("node:path");
      const secure = process.env.SMTP_SECURE === "true" || port === 465;
      const transport = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        family: 4,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        tls: { servername: host, minVersion: "TLSv1.2" },
      } as Parameters<typeof nodemailer.createTransport>[0]);
      const publicUrl = (process.env.CONFIRM_PUBLIC_URL || process.env.MAIL_LOGO_URL || "https://confirm.relpdev.uk").replace(/\/$/, "");
      const hostedLogo = `${publicUrl}/skinphd-logo.png`;
      const publicRoots = [join(process.cwd(), ".output/public"), join(process.cwd(), "public"), "/app/.output/public"];
      const readPublic = (name: string) => {
        const path = publicRoots.map((root) => join(root, name)).find((item) => existsSync(item));
        return path ? readFileSync(path) : null;
      };
      const embedded = readPublic("skinphd-logo.png");
      const attachments = [
        embedded ? { filename: "skinphd-logo.png", content: embedded, cid: "skinphd-logo", contentType: "image/png" } : null,
      ].filter((item): item is NonNullable<typeof item> => Boolean(item));
      await Promise.race([
        transport.sendMail({
          from: process.env.SMTP_FROM || process.env.MAIL_FROM || `SkinPhD Confirm <${user}>`,
          to: data.to,
          subject: data.subject,
          text: data.body,
          html: brandedHtml(
            data.subject,
            data.body,
            embedded ? "cid:skinphd-logo" : hostedLogo,
            undefined,
            { heading: data.heading, cta: data.cta },
          ),
          attachments,
        }),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("SMTP timed out after 18s")), 18000);
        }),
      ]);
      transport.close();
      return { ok: true as const };
    } catch (err) {
      const message = err instanceof Error ? err.message : "send failed";
      const reason = /auth|535/i.test(message) ? "auth" : "smtp_error";
      return { ok: false as const, reason, message };
    }
  });

export async function deliverMail(mail: EmployeeMail, opts?: { compose?: boolean }): Promise<"sent" | "compose"> {
  if (!mail.to) return "compose";
  try {
    const result = await Promise.race([
      sendMailFn({ data: mail }),
      new Promise<{ ok: false; reason: string }>((resolve) => {
        window.setTimeout(() => resolve({ ok: false, reason: "timeout" }), 20000);
      }),
    ]);
    if (result.ok) return "sent";
  } catch {
    // Fall back to the mail app so Head Office can still send.
  }
  if (opts?.compose !== false) window.location.href = employeeMailHref(mail);
  return "compose";
}