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

function detailsPanel(rows: { label: string; value: string }[]) {
  const body = rows
    .map(
      (row) => `<tr><td style="padding:7px 0;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;color:#5d6d67;width:36%;vertical-align:top;">${escapeHtml(row.label)}</td><td style="padding:7px 0 7px 10px;font-size:15px;line-height:1.4;color:#0f3329;word-break:break-word;vertical-align:top;">${escapeHtml(row.value)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 18px;background:#eef5f1;border:1px solid #d4e3db;border-radius:12px;"><tr><td style="padding:14px 16px;border-left:4px solid #176b50;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${body}</table></td></tr></table>`;
}

function linkCard(label: string, url: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;background:#eef5f1;border:1px solid #d4e3db;border-radius:12px;"><tr><td style="padding:14px 16px;border-left:4px solid #b8863a;"><p style="margin:0 0 6px;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#0f3329;">${escapeHtml(label.replace(/:$/, ""))}</p><a href="${escapeHtml(url)}" style="color:#176b50;font-size:14px;line-height:1.5;font-weight:700;text-decoration:underline;word-break:break-word;">${escapeHtml(url)}</a></td></tr></table>`;
}

function bulletList(items: string[]) {
  const rows = items
    .map((item) => `<tr><td style="width:18px;vertical-align:top;padding:3px 0;color:#b8863a;">•</td><td style="padding:3px 0;font-size:15px;line-height:1.5;color:#1a2421;">${escapeHtml(item)}</td></tr>`)
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">${rows}</table>`;
}

function ctaButton(cta: { label: string; url: string }) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:10px 0 8px;"><tr><td><a href="${escapeHtml(cta.url)}" style="display:block;width:100%;box-sizing:border-box;background:#176b50;color:#ffffff;text-align:center;text-decoration:none;font-family:'Segoe UI',Arial,sans-serif;font-size:16px;font-weight:700;padding:14px 20px;border-radius:10px;">${escapeHtml(cta.label)}</a></td></tr></table>`;
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
    const line = lines[i].trim();
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
    if (line.startsWith("\u2022 ") || line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length) {
        const next = lines[i].trim();
        if (!next.startsWith("\u2022 ") && !next.startsWith("- ")) break;
        items.push(next.replace(/^[\u2022-]\s+/, ""));
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
      if (isHttpUrl(next) || next.startsWith("\u2022 ") || next.startsWith("- ") || (detail.test(next) && !isHttpUrl(next))) break;
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
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f3eee4;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3eee4;padding:24px 12px;"><tr><td align="center"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e4d9c6;border-radius:18px;overflow:hidden;"><tr><td style="height:8px;background:#0f3329;">&nbsp;</td></tr><tr><td style="padding:22px 28px 16px;border-bottom:3px solid #b8863a;"><img src="${escapeHtml(logo)}" alt="SkinPhD" width="190" style="display:block;height:auto;max-width:190px;border:0;"><p style="margin:12px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#176b50;">Confirm</p></td></tr><tr><td style="padding:26px 24px 8px;font-family:'Segoe UI',Arial,sans-serif;color:#1a2421;"><h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:20px;line-height:1.35;font-weight:500;color:#0f3329;">${escapeHtml(heading)}</h1>${richBodyHtml(body, extras?.cta)}</td></tr><tr><td style="padding:16px 24px 22px;border-top:1px solid #e4d9c6;font-size:12px;line-height:1.5;color:#5d6d67;">SkinPhD (Pty) Ltd \u00b7 <a href="https://skinphd.co.za" style="color:#176b50;">skinphd.co.za</a><br/>This email relates to staff documents. It is not a salon booking and not a client treatment consent.</td></tr></table></td></tr></table></body></html>`;
}
