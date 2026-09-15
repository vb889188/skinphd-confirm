import pg from "pg";
import { clinicReadSql, clinicWriteError, type ClinicActor } from "./clinic-scope";
import { CONFIRM_TENANT_ID } from "./remote-shared";
import { assertSigningOrder, canSign, nextStatus } from "./rules";
import type { AgreementStatus, Signature, Snapshot } from "./types";

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
CREATE UNIQUE INDEX IF NOT EXISTS confirm_signatures_one_signed_role
  ON confirm_signatures (agreement_id, (payload->>'role'))
  WHERE payload->>'outcome' = 'signed';
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
    ready = (async () => {
      const client = getPool();
      await client.query(SCHEMA_SQL);
      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS confirm_signatures_one_signed_role
          ON confirm_signatures (agreement_id, (payload->>'role'))
          WHERE payload->>'outcome' = 'signed'
      `);
    })();
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

export async function localRest<T>(path: string, init: RequestInit = {}, actor?: ClinicActor | null): Promise<T> {
  await ensureConfirmSchema();
  const method = (init.method || "GET").toUpperCase();
  const parsed = parsePath(path);
  const client = getPool();
  const prefer = headerMap(init).Prefer || headerMap(init).prefer || "";

  if (method === "GET") {
    const values: unknown[] = [];
    const where = parsed.filters.map((filter) => {
      values.push(filter.value);
      return `${ident(filter.col)} = $${values.length}`;
    });
    if (actor) {
      const extra = clinicReadSql(parsed.table, actor, values.length + 1);
      if (extra) {
        values.push(extra.value);
        where.push(extra.sql);
      }
    }
    const sql = `SELECT ${parsed.columns} FROM ${ident(parsed.table)}${where.length ? ` WHERE ${where.join(" AND ")}` : ""}${orderSql(parsed.order)}`;
    const result = await client.query(sql, values);
    return result.rows as T;
  }

  const body = init.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
  const keys = Object.keys(body).filter((key) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key));
  if (!keys.length) return undefined as T;

  if (actor) {
    let existingClinicId: string | null = null;
    if (parsed.table === "confirm_agreements" || parsed.table === "confirm_people") {
      const id = String(body.id ?? parsed.filters.find((item) => item.col === "id")?.value ?? "");
      if (id) {
        const existing = await client.query(`SELECT clinic_id FROM ${ident(parsed.table)} WHERE id = $1`, [id]);
        existingClinicId = existing.rows[0]?.clinic_id ?? null;
      }
    } else if (parsed.table === "confirm_signatures" || parsed.table === "confirm_signing_links" || parsed.table === "confirm_audit") {
      const agreementId = String(body.agreement_id ?? parsed.filters.find((item) => item.col === "agreement_id")?.value ?? "");
      if (agreementId) {
        const existing = await client.query("SELECT clinic_id FROM confirm_agreements WHERE id = $1", [agreementId]);
        existingClinicId = existing.rows[0]?.clinic_id ?? null;
      }
    }
    const denied = clinicWriteError(parsed.table, actor, body, existingClinicId);
    if (denied) throw new Error(denied);
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
    if (actor && !isOrg(actor) && parsed.table === "confirm_agreements") {
      values.push(actor.branchId);
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
    .map((key) => {
      if (parsed.table === "confirm_agreements" && key === "status") {
        return `${ident(key)} = CASE
          WHEN ${ident(parsed.table)}.status IN ('completed', 'declined', 'superseded') THEN ${ident(parsed.table)}.status
          ELSE EXCLUDED.${ident(key)}
        END`;
      }
      return `${ident(key)} = EXCLUDED.${ident(key)}`;
    })
    .join(", ");
  const sql = conflict
    ? `INSERT INTO ${ident(parsed.table)} (${keys.map(ident).join(", ")}) VALUES (${placeholders.join(", ")}) ON CONFLICT (id) DO UPDATE SET ${updates}`
    : `INSERT INTO ${ident(parsed.table)} (${keys.map(ident).join(", ")}) VALUES (${placeholders.join(", ")})`;
  await client.query(sql, values);
  return undefined as T;
}

function isOrg(actor: ClinicActor) {
  return actor.scope === "organisation";
}

export async function recordDurableSignature(input: {
  actor: ClinicActor | null;
  agreementId: string;
  signature: Signature;
  action: "sign" | "decline";
  consumeLinkId?: string | null;
  audit: { id: string; actor: string; action: string; detail: string; createdAt: string };
}): Promise<{ status: string; signedCount: number; required: number; signature: Signature }> {
  await ensureConfirmSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))", ["confirm_agreements", input.agreementId]);
    const agr = await client.query(
      "SELECT id, clinic_id, status, required_signatures, snapshot, snapshot_json FROM confirm_agreements WHERE id = $1 FOR UPDATE",
      [input.agreementId],
    );
    const row = agr.rows[0] as
      | { id: string; clinic_id: string; status: string; required_signatures: number; snapshot: Snapshot | null; snapshot_json?: string }
      | undefined;
    if (!row) throw new Error("That pack is not on the server.");
    if (input.actor) {
      const denied = clinicWriteError("confirm_agreements", input.actor, { clinic_id: row.clinic_id }, row.clinic_id);
      if (denied) throw new Error(denied);
    }
    if (!canSign(row.status as AgreementStatus)) {
      throw new Error("This pack is not open for signatures");
    }
    const snapshot = (row.snapshot ?? (row.snapshot_json ? JSON.parse(row.snapshot_json) : { signers: [] })) as Snapshot;
    const sigs = await client.query(
      "SELECT payload FROM confirm_signatures WHERE agreement_id = $1 FOR UPDATE",
      [input.agreementId],
    );
    const existing = sigs.rows.map((item) => item.payload as Signature);
    if (existing.some((item) => item.role === input.signature.role && item.outcome === "signed")) {
      throw new Error(`${input.signature.role} has already signed this agreement`);
    }
    const requiredRoles = (snapshot.signers ?? []).map((item) => item.role);
    const signedRoles = existing.filter((item) => item.outcome === "signed").map((item) => item.role);
    if (input.action === "sign") assertSigningOrder(input.signature.role, requiredRoles, signedRoles);

    await client.query(
      "INSERT INTO confirm_signatures (id, tenant_id, agreement_id, payload, created_at) VALUES ($1, $2, $3, $4::jsonb, $5)",
      [input.signature.id, CONFIRM_TENANT_ID, input.agreementId, JSON.stringify(input.signature), input.signature.signedAt],
    );

    const links = await client.query(
      "SELECT id, payload FROM confirm_signing_links WHERE agreement_id = $1 ORDER BY id FOR UPDATE",
      [input.agreementId],
    );
    for (const link of links.rows as Array<{ id: string; payload: { status?: string; consumedAt?: string | null } }>) {
      const payload = { ...link.payload };
      if (payload.status !== "pending") continue;
      if (input.action === "decline") {
        payload.status = link.id === input.consumeLinkId ? "declined" : "revoked";
        payload.consumedAt = input.signature.signedAt;
        await client.query("UPDATE confirm_signing_links SET payload = $1::jsonb WHERE id = $2", [JSON.stringify(payload), link.id]);
      } else if (input.consumeLinkId && link.id === input.consumeLinkId) {
        payload.status = "consumed";
        payload.consumedAt = input.signature.signedAt;
        await client.query("UPDATE confirm_signing_links SET payload = $1::jsonb WHERE id = $2", [JSON.stringify(payload), link.id]);
      }
    }

    const signedCount = signedRoles.length + (input.action === "sign" ? 1 : 0);
    const status = input.action === "decline" ? "declined" : nextStatus(signedCount, row.required_signatures);
    await client.query("UPDATE confirm_agreements SET status = $1, updated_at = $2 WHERE id = $3", [
      status,
      input.signature.signedAt,
      input.agreementId,
    ]);
    await client.query(
      "INSERT INTO confirm_audit (id, tenant_id, agreement_id, actor, action, detail, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [input.audit.id, CONFIRM_TENANT_ID, input.agreementId, input.audit.actor, input.audit.action, input.audit.detail, input.audit.createdAt],
    );
    await client.query("COMMIT");
    return { status, signedCount, required: row.required_signatures, signature: input.signature };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    const code = err && typeof err === "object" && "code" in err ? String((err as { code?: string }).code) : "";
    if (code === "55P03" || code === "40P01") {
      throw new Error("This pack is being signed at another desk. Wait a moment and try again.");
    }
    if (code === "23505") {
      throw new Error("That role has already signed this agreement");
    }
    throw err;
  } finally {
    client.release();
  }
}
