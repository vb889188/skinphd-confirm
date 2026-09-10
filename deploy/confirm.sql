-- SkinPhD Confirm — local cabinet (Postgres on the droplet)
CREATE TABLE IF NOT EXISTS confirm_clinics (
  id text PRIMARY KEY,
  tenant_id text,
  name text,
  code text,
  created_at timestamptz
);

CREATE TABLE IF NOT EXISTS confirm_people (
  id text PRIMARY KEY,
  tenant_id text,
  clinic_id text,
  full_name text,
  email text,
  role text,
  status text,
  scope text,
  pin_hash text,
  created_at timestamptz,
  updated_at timestamptz
);

CREATE TABLE IF NOT EXISTS confirm_templates (
  id text PRIMARY KEY,
  tenant_id text,
  name text,
  category text,
  version text,
  status text,
  module text,
  source_file text,
  source_file_id text,
  daily_rate_rands integer,
  default_days integer,
  pass_percent integer,
  mandatory_months integer,
  requires_witness boolean,
  has_waiver boolean,
  equipment_label text,
  content text,
  approved_at timestamptz,
  created_at timestamptz
);

CREATE TABLE IF NOT EXISTS confirm_agreements (
  id text PRIMARY KEY,
  tenant_id text,
  clinic_id text,
  employee_id text,
  manager_id text,
  witness_id text,
  template_id text,
  title text,
  activity text,
  status text,
  cost_cents integer,
  starts_on text,
  ends_on text,
  required_signatures integer,
  snapshot jsonb,
  snapshot_json text,
  snapshot_hash text,
  created_by text,
  created_at timestamptz,
  updated_at timestamptz,
  last_reminded_at timestamptz
);

CREATE TABLE IF NOT EXISTS confirm_signatures (
  id text PRIMARY KEY,
  tenant_id text,
  agreement_id text,
  payload jsonb,
  created_at timestamptz
);

CREATE TABLE IF NOT EXISTS confirm_signing_links (
  id text PRIMARY KEY,
  tenant_id text,
  agreement_id text,
  payload jsonb,
  created_at timestamptz
);

CREATE TABLE IF NOT EXISTS confirm_audit (
  id text PRIMARY KEY,
  tenant_id text,
  agreement_id text,
  actor text,
  action text,
  detail text,
  created_at timestamptz
);

CREATE TABLE IF NOT EXISTS confirm_source_files (
  id text PRIMARY KEY,
  tenant_id text,
  template_id text,
  agreement_id text,
  file_name text,
  mime_type text,
  byte_size integer,
  sha256 text,
  content_base64 text,
  created_at timestamptz
);

CREATE TABLE IF NOT EXISTS confirm_employee_records (
  id text PRIMARY KEY,
  tenant_id text,
  person_id text,
  file_name text,
  mime_type text,
  byte_size integer,
  sha256 text,
  note text,
  extracted_text text,
  content_base64 text,
  created_at timestamptz
);

CREATE INDEX IF NOT EXISTS confirm_people_email ON confirm_people (email);
CREATE INDEX IF NOT EXISTS confirm_agreements_updated ON confirm_agreements (updated_at DESC);
CREATE INDEX IF NOT EXISTS confirm_links_agreement ON confirm_signing_links (agreement_id);
CREATE INDEX IF NOT EXISTS confirm_signatures_agreement ON confirm_signatures (agreement_id);
