export type { EmployeeMail } from "./email-html.ts";
export {
  employeeMailHref,
  confirmSiteUrl,
  packSignUrl,
  firstName,
  brandedHtml,
} from "./email-html.ts";
export {
  buildWelcomeMail,
  buildSignCodeMail,
  buildFranchiseeIssuedMail,
  buildNextSignerMail,
  buildEmployeeMail,
  buildReminderMail,
  buildSignedRecordMail,
} from "./email-messages.ts";
