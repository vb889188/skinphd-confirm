import pg from "pg";

const TABLES = new Set([
  "confirm_clinics",
  "confirm_people",
  "confirm_agreements",
  "confirm_signatures",
  "confirm_signing_links",
  "confirm_audit",
  "confirm_templates",
  "confirm_source_files",
  "confirm_employee_records",
]);

const JSON_COLS = new Set(["snapshot", "payload"]);

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS confirm_clinics (
  id text PRIMARY KEY, tenant_id text, name text, code text, created_at timestamptz
);
CREATE TABLE IF NOT EXISTS confirm_people (
  id text PRIMARY KEY, tenant_id text, clinic_id text, full_name text, email text,
  role text, status text, scope text, pin_hash text, created_at timestamptz, updated_at timestamptz
);
CREATE TABLE IF NOT EXISTS confirm_templates (
  id text PRIMARY KEY, tenant_id text, name text, category text, version text, status text,
  module text, source_file text, source_file_id text, daily_rate_rands integer, default_days integer,
  pass_percent integer, mandatory_months integer, requires_witness boolean, has_waiver boolean,
  equipment_label text, content text, approved_at timestamptz, created_at timestamptz
);
CREATE TABLE IF NOT EXISTS confirm_agreements (
  id text PRIMARY KEY, tenant_id text, clinic_id text, employee_id text, manager_id text,
  witness_id text, template_id text, title text, activity text, status text, cost_cents integer,
  starts_on text, ends_on text, required_signatures integer, snapshot jsonb, snapshot_json text,
  snapshot_hash text, created_by text, created_at timestamptz, updated_at timestamptz, last_reminded_at timestamptz
);
CREATE TABLE IF NOT EXISTS confirm_signatures (
  id text PRIMARY KEY, tenant_id text, agreement_id text, payload jsonb, created_at timestamptz
);
CREATE TABLE IF NOT EXISTS confirm_signing_links (
  id text PRIMARY KEY, tenant_id text, agreement_id text, payload jsonb, created_at timestamptz
);
CREATE TABLE IF NOT EXISTS confirm_audit (
  id text PRIMARY KEY, tenant_id text, agreement_id text, actor text, action text, detail text, created_at timestamptz
);
CREATE TABLE IF NOT EXISTS confirm_source_files (
  id text PRIMARY KEY, tenant_id text, template_id text, agreement_id text, file_name text, mime_type text,
  byte_size integer, sha256 text, content_base64 text, created_at timestamptz
);
CREATE TABLE IF NOT EXISTS confirm_employee_records (
  id text PRIMARY KEY, tenant_id text, person_id text, file_name text, mime_type text, byte_size integer,
  sha256 text, note text, extracted_text text, content_base64 text, created_at timestamptz
);
CREATE INDEX IF NOT EXISTS confirm_people_email ON confirm_people (email);
CREATE INDEX IF NOT EXISTS confirm_agreements_updated ON confirm_agreements (updated_at DESC);
CREATE INDEX IF NOT EXISTS confirm_links_agreement ON confirm_signing_links (agreement_id);
CREATE INDEX IF NOT EXISTS confirm_signatures_agreement ON confirm_signatures (agreement_id);
`;

let pool: pg.Pool | null = null;
let ready: Promise<void> | null = null;

export function databaseUrl() {
  return (process.env.DATABASE_URL || "").trim();
}

function ident(value: string) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) throw new Error("Invalid column");
  return `"${value}"`;
}

function getPool() {
  const url = databaseUrl();
  if (!url) throw new Error("Confirm database is not configured on the server");
  if (!pool) pool = new pg.Pool({ connectionString: url, max: 5 });
  return pool;
}

export async function ensureConfirmSchema() {
  if (!databaseUrl()) return;
  if (!ready) {
    ready = getPool().query(SCHEMA_SQL).then(() => undefined);
  }
  await ready;
}

function parsePath(path: string) {
  const [table, query = ""] = path.split("?");
  if (!TABLES.has(table)) throw new Error("That path is not a Confirm table.");
  const params = new URLSearchParams(query);
  const select = params.get("select") || "*";
  const order = params.get("order");
  const onConflict = params.get("on_conflict");
  const filters: { col: string; value: string }[] = [];
  for (const [key, value] of params.entries()) {
    if (key === "select" || key === "order" || key === "on_conflict") continue;
    if (value.startsWith("eq.")) filters.push({ col: key, value: value.slice(3) });
  }
  const columns =
    select === "*"
      ? "*"
      : select
          .split(",")
          .map((item) => ident(item.trim()))
          .join(", ");
  return { table, columns, order, onConflict, filters };
}

function orderSql(order?: string | null) {
  if (!order) return "";
  const [col, dir] = order.split(".");
  const direction = dir === "desc" ? "DESC" : "ASC";
  return ` ORDER BY ${ident(col)} ${direction}`;
}

function headerMap(init: RequestInit): Record<string, string> {
  const raw = init.headers;
  if (!raw) return {};
  if (raw instanceof Headers) return Object.fromEntries(raw.entries());
  return raw as Record<string, string>;
}

function clinicScope(init: RequestInit): { org: boolean; branchId: string } | null {
  const headers = headerMap(init);
  const scope = (headers["x-confirm-scope"] || headers["X-Confirm-Scope"] || "").trim();
  const branchId = (headers["x-confirm-branch"] || headers["X-Confirm-Branch"] || "").trim();
  if (!scope || !branchId) return null;
  return { org: scope === "organisation", branchId };
}

export async function localRest<T>(path: string, init: RequestInit = {}): Promise<T> {
  await ensureConfirmSchema();
  const method = (init.method || "GET").toUpperCase();
  const parsed = parsePath(path);
  const client = getPool();
  const prefer = headerMap(init).Prefer || headerMap(init).prefer || "";
  const clinic = clinicScope(init);

  if (method === "GET") {
    const values: unknown[] = [];
    const where = parsed.filters.map((filter) => {
      values.push(filter.value);
      return `${ident(filter.col)} = $${values.length}`;
    });
    if (clinic && !clinic.org) {
      if (parsed.table === "confirm_agreements" || parsed.table === "confirm_people") {
        values.push(clinic.branchId);
        where.push(`${ident("clinic_id")} = $${values.length}`);
      } else if (parsed.table === "confirm_clinics") {
        values.push(clinic.branchId);
        where.push(`${ident("id")} = $${values.length}`);
      } else if (parsed.table === "confirm_signatures" || parsed.table === "confirm_signing_links" || parsed.table === "confirm_audit") {
        values.push(clinic.branchId);
        where.push(`agreement_id IN (SELECT id FROM confirm_agreements WHERE clinic_id = $${values.length})`);
      } else if (parsed.table === "confirm_employee_records") {
        values.push(clinic.branchId);
        where.push(`person_id IN (SELECT id FROM confirm_people WHERE clinic_id = $${values.length})`);
      } else if (parsed.table === "confirm_source_files") {
        values.push(clinic.branchId);
        where.push(`(agreement_id IS NULL OR agreement_id IN (SELECT id FROM confirm_agreements WHERE clinic_id = $${values.length}))`);
      }
    }
    const sql = `SELECT ${parsed.columns} FROM ${ident(parsed.table)}${where.length ? ` WHERE ${where.join(" AND ")}` : ""}${orderSql(parsed.order)}`;
    const result = await client.query(sql, values);
    return result.rows as T;
  }

  const body = init.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
  const keys = Object.keys(body).filter((key) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key));
  if (!keys.length) return undefined as T;

  if (clinic && !clinic.org) {
    await assertClinicMutation(client, parsed.table, parsed.filters, body, clinic.branchId);
  }

  if (method === "PATCH") {
    const values: unknown[] = [];
    const sets = keys.map((key) => {
      values.push(JSON_COLS.has(key) ? JSON.stringify(body[key]) : body[key]);
      return `${ident(key)} = $${values.length}${JSON_COLS.has(key) ? "::jsonb" : ""}`;
    });
    const where = parsed.filters.map((filter) => {
      values.push(filter.value);
      return `${ident(filter.col)} = $${values.length}`;
    });
    if (clinic && !clinic.org && parsed.table === "confirm_agreements") {
      values.push(clinic.branchId);
      where.push(`${ident("clinic_id")} = $${values.length}`);
    }
    await client.query(
      `UPDATE ${ident(parsed.table)} SET ${sets.join(", ")}${where.length ? ` WHERE ${where.join(" AND ")}` : ""}`,
      values,
    );
    return undefined as T;
  }

  const values = keys.map((key) => (JSON_COLS.has(key) ? JSON.stringify(body[key]) : body[key]));
  const placeholders = keys.map((key, index) => `$${index + 1}${JSON_COLS.has(key) ? "::jsonb" : ""}`);
  const conflict = parsed.onConflict === "id" || prefer.includes("merge-duplicates");
  const updates = keys
    .filter((key) => key !== "id")
    .map((key) => `${ident(key)} = EXCLUDED.${ident(key)}`)
    .join(", ");
  const sql = conflict
    ? `INSERT INTO ${ident(parsed.table)} (${keys.map(ident).join(", ")}) VALUES (${placeholders.join(", ")}) ON CONFLICT (id) DO UPDATE SET ${updates}`
    : `INSERT INTO ${ident(parsed.table)} (${keys.map(ident).join(", ")}) VALUES (${placeholders.join(", ")})`;
  await client.query(sql, values);
  return undefined as T;
}

async function assertClinicMutation(
  client: pg.Pool,
  table: string,
  filters: { col: string; value: string }[],
  body: Record<string, unknown>,
  branchId: string,
) {
  if (table === "confirm_templates" || table === "confirm_clinics") {
    throw new Error("That change is limited to Head Office.");
  }
  if (table === "confirm_agreements") {
    const clinicId = String(body.clinic_id ?? "");
    if (clinicId && clinicId !== branchId) throw new Error("That pack belongs to another clinic.");
    const id = String(body.id ?? filters.find((item) => item.col === "id")?.value ?? "");
    if (id) {
      const existing = await client.query("SELECT clinic_id FROM confirm_agreements WHERE id = $1", [id]);
      if (existing.rows[0] && existing.rows[0].clinic_id !== branchId) {
        throw new Error("That pack belongs to another clinic.");
      }
    }
  }
  if (table === "confirm_people") {
    const clinicId = String(body.clinic_id ?? "");
    if (clinicId && clinicId !== branchId) throw new Error("That staff record belongs to another clinic.");
    const id = String(body.id ?? filters.find((item) => item.col === "id")?.value ?? "");
    if (id) {
      const existing = await client.query("SELECT clinic_id FROM confirm_people WHERE id = $1", [id]);
      if (existing.rows[0] && existing.rows[0].clinic_id !== branchId) {
        throw new Error("That staff record belongs to another clinic.");
      }
    }
  }
  if (table === "confirm_signatures" || table === "confirm_signing_links" || table === "confirm_audit") {
    const agreementId = String(body.agreement_id ?? filters.find((item) => item.col === "agreement_id")?.value ?? "");
    if (agreementId) {
      const existing = await client.query("SELECT clinic_id FROM confirm_agreements WHERE id = $1", [agreementId]);
      if (existing.rows[0] && existing.rows[0].clinic_id !== branchId) {
        throw new Error("That pack belongs to another clinic.");
      }
    }
  }
}
