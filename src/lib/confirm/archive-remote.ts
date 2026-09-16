import { confirmRestFn } from "./confirm-rpc";

export async function persistArchiveStamp(input: {
  agreementId: string;
  mailedAt?: string | null;
  error?: string | null;
}) {
  const result = await confirmRestFn({
    data: {
      path: `confirm_agreements?id=eq.${encodeURIComponent(input.agreementId)}`,
      method: "PATCH",
      body: JSON.stringify({
        archive_mailed_at: input.mailedAt ?? null,
        archive_mail_error: input.error ?? null,
      }),
    },
  });
  if (!result.ok) throw new Error(result.error || "Confirm could not store the archive stamp");
}
