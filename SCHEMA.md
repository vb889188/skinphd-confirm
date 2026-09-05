# SkinPhD Confirm schema

Tenant `49937a9c-4c8c-420f-bac7-f2ff3f22f43e`. Tables stay named `confirm_*`. `clinic_id` is the SkinPhD branch id.

## Tables
- `confirm_clinics` — SkinPhD branches (name, code)
- `confirm_people` — staff; `scope` is `organisation` | `clinic` | `self`
- `confirm_templates` — approved source wording; `source_file_id` points at original bytes
- `confirm_source_files` — original pptx/pdf bytes and sha256
- `confirm_agreements` — frozen snapshot, hash, `last_reminded_at`
- `confirm_signatures` — typed signature payload
- `confirm_signing_links` — hashed one-time tokens
- `confirm_audit` — issue, sign, reminder, directory actions

Indexes cover tenant plus branch, status, created_at, employee, snapshot hash, agreement signatures, and audit time.
