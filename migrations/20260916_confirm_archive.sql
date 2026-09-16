ALTER TABLE confirm_agreements ADD COLUMN IF NOT EXISTS archive_mailed_at timestamptz;
ALTER TABLE confirm_agreements ADD COLUMN IF NOT EXISTS archive_mail_error text;
