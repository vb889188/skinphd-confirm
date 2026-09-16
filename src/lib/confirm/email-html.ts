export type EmployeeMail = {
  to: string;
  subject: string;
  body: string;
  heading?: string;
  cta?: { label: string; url: string };
  attachments?: Array<{ filename: string; contentBase64: string; contentType?: string }>;
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

export function brandedHtml(
  subject: string,
  body: string,
  logoUrl?: string,
  _heartbeatUrl?: string,
  extras?: { heading?: string; cta?: { label: string; url: string } },
) {
  const logo = logoUrl || "https://confirm.relpdev.uk/skinphd-logo.png";
  const heading = extras?.heading || subject;
  const safe = (value: string) =>
    value.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
  const paragraphs = body
    .split(/\n\n+/)
    .map((block) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#1a2421;">${safe(block).replace(/\n/g, "<br/>")}</p>`)
    .join("");
  const button = extras?.cta
    ? `<p style="margin:16px 0;"><a href="${safe(extras.cta.url)}" style="display:inline-block;background:#176b50;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;">${safe(extras.cta.label)}</a></p>`
    : "";
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f3eee4;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3eee4;padding:24px 12px;"><tr><td align="center"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e4d9c6;border-radius:18px;overflow:hidden;"><tr><td style="height:8px;background:#0f3329;">&nbsp;</td></tr><tr><td style="padding:22px 28px 16px;border-bottom:3px solid #b8863a;"><img src="${safe(logo)}" alt="SkinPhD" width="190" style="display:block;height:auto;max-width:190px;border:0;"><p style="margin:12px 0 0;font-family:Georgia,serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#176b50;">Confirm</p></td></tr><tr><td style="padding:26px 24px 8px;font-family:'Segoe UI',Arial,sans-serif;color:#1a2421;"><h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:20px;font-weight:500;color:#0f3329;">${safe(heading)}</h1>${paragraphs}${button}</td></tr><tr><td style="padding:16px 24px 22px;border-top:1px solid #e4d9c6;font-size:12px;color:#5d6d67;">SkinPhD (Pty) Ltd · skinphd.co.za<br/>This email relates to staff documents. It is not a salon booking and not a client treatment consent.</td></tr></table></td></tr></table></body></html>`;
}
