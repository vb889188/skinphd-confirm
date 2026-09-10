# SkinPhD Confirm schema

Tables stay named `confirm_*`. `clinic_id` is the SkinPhD branch id.

Live cabinets sit in Postgres on the Confirm droplet (`DATABASE_URL`). The desk never talks to the database from the browser.

## Tables
- `confirm_clinics` — SkinPhD branches (name, code)
- `confirm_people` — staff; `scope` is `organisation` | `clinic` | `self`
- `confirm_templates` — approved source wording; `source_file_id` points at original bytes
- `confirm_source_files` — original pptx/pdf bytes and sha256
- `confirm_agreements` — frozen snapshot, hash, `last_reminded_at`
- `confirm_signatures` — typed signature payload
- `confirm_signing_links` — hashed one-time tokens
- `confirm_audit` — issue, sign, reminder, directory actions
- `confirm_employee_records` — staff file copies

The Head Office desk keeps a live line open (`/api/confirm-live`). A pack issued or a name recorded on one tablet is pushed to the others. Polling every 30 seconds is only the backup if that line drops.
