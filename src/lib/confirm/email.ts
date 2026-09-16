import type { Agreement, WorkspaceState } from "./types";

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
