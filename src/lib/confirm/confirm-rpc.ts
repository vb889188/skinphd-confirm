import { createServerFn } from "@tanstack/react-start";
import { sha256Hex } from "./crypto";
import { bumpConfirmLive } from "./live-bus";
import type { Person } from "./types";

type SessionPayload = {
  personId: string;
  role: Person["role"];
  scope: string;
  branchId: string;
  exp: number;
};

function supabaseConfig() {
  const vite = import.meta.env as Record<string, string | undefined>;
  return {
    url: (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || vite.VITE_SUPABASE_URL || "").trim(),
    key: (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || vite.VITE_SUPABASE_ANON_KEY || "").trim(),
    workspace: (process.env.CONFIRM_WORKSPACE_KEY || process.env.VITE_CONFIRM_WORKSPACE_KEY || vite.VITE_CONFIRM_WORKSPACE_KEY || "").trim(),
    secret: (process.env.CONFIRM_SESSION_SECRET || process.env.CONFIRM_WORKSPACE_KEY || process.env.VITE_CONFIRM_WORKSPACE_KEY || vite.VITE_CONFIRM_WORKSPACE_KEY || "confirm-dev-session").trim(),
  };
}

function toHex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function encodeJson(value: unknown) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodeJson<T>(value: string): T {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
}

async function signPayload(payload: SessionPayload, secret: string) {
  const body = encodeJson(payload);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return `${body}.${toHex(new Uint8Array(sig))}`;
}

async function verifySession(token: string | undefined, secret: string): Promise<SessionPayload | null> {
  if (!token || !token.includes(".")) return null;
  const [body, signature] = token.split(".");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = toHex(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body))));
  if (expected !== signature) return null;
  try {
    const payload = decodeJson<SessionPayload>(body);
    if (!payload.personId || payload.exp < Date.now()) return null;
    if (payload.role !== "manager") return null;
    return payload;
  } catch {
    return null;
  }
}

async function dataRest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (process.env.DATABASE_URL?.trim()) {
    const { localRest } = await import("./confirm-db");
    return localRest<T>(path, init);
  }
  return supabaseRest<T>(path, init);
}

async function supabaseRest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { url, key, workspace } = supabaseConfig();
  if (!url || !key || !workspace) throw new Error("Confirm database is not configured on the server");
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
      "x-confirm-workspace": workspace,
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Supabase request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  const body = await response.text();
  return (body ? JSON.parse(body) : undefined) as T;
}

type LinkRow = { id: string; agreement_id: string; payload?: { tokenHash?: string; role?: string; agreementId?: string } };
type AgreementRow = { id: string; clinic_id: string; employee_id: string; manager_id: string; witness_id: string | null; template_id: string };

async function resolveLink(token: string) {
  const hash = await sha256Hex(token);
  const rows = await dataRest<LinkRow[]>("confirm_signing_links?select=id,agreement_id,payload");
  const row = rows.find((item) => item.payload?.tokenHash === hash);
  if (!row) return null;
  const agreements = await dataRest<AgreementRow[]>(`confirm_agreements?id=eq.${encodeURIComponent(row.agreement_id)}&select=id,clinic_id,employee_id,manager_id,witness_id,template_id`);
  return { row, agreement: agreements[0] ?? null, hash };
}

function stripPeople(rows: unknown) {
  if (!Array.isArray(rows)) return rows;
  return rows.map((row) => {
    if (!row || typeof row !== "object") return row;
    const next = { ...(row as Record<string, unknown>) };
    next.pin_hash = null;
    return next;
  });
}

function filterLinkRows(path: string, rows: unknown, link: { agreement: AgreementRow }) {
  if (!Array.isArray(rows)) return rows;
  const agreement = link.agreement;
  const allowedPeople = new Set([agreement.employee_id, agreement.manager_id, agreement.witness_id].filter(Boolean));
  if (path.startsWith("confirm_agreements")) return rows.filter((row) => (row as { id?: string }).id === agreement.id);
  if (path.startsWith("confirm_people")) return stripPeople(rows.filter((row) => allowedPeople.has((row as { id?: string }).id ?? "")));
  if (path.startsWith("confirm_clinics")) return rows.filter((row) => (row as { id?: string }).id === agreement.clinic_id);
  if (path.startsWith("confirm_templates")) return rows.filter((row) => (row as { id?: string }).id === agreement.template_id);
  if (path.startsWith("confirm_signatures") || path.startsWith("confirm_signing_links") || path.startsWith("confirm_audit")) {
    return rows.filter((row) => (row as { agreement_id?: string }).agreement_id === agreement.id);
  }
  return [];
}

function bodyAgreementId(body?: string) {
  if (!body) return "";
  try {
    const parsed = JSON.parse(body) as { agreement_id?: string; agreementId?: string };
    return parsed.agreement_id || parsed.agreementId || "";
  } catch {
    return "";
  }
}

export const confirmConfiguredFn = createServerFn({ method: "POST" }).handler(async () => {
  if (process.env.DATABASE_URL?.trim()) return { ok: true };
  const { url, key, workspace } = supabaseConfig();
  return { ok: Boolean(url && key && workspace) };
});

export const confirmSignInFn = createServerFn({ method: "POST" })
  .validator((data: { email: string; pin: string }) => data)
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    const pin = data.pin.trim();
    if (!email || !pin) return { ok: false as const, error: "Enter the Head Office email and PIN." };
    const people = await dataRest<Array<{
      id: string;
      clinic_id: string;
      full_name: string;
      email: string;
      role: Person["role"];
      status: Person["status"];
      pin_hash: string | null;
      scope?: string;
      created_at: string;
    }>>("confirm_people?select=*&status=eq.active");
    const person = people.find((item) => item.email.toLowerCase() === email);
    if (!person?.pin_hash) return { ok: false as const, error: "No active staff record for that email." };
    if (person.role !== "manager") {
      return { ok: false as const, error: "Therapists and witnesses do not collect a PIN. Sign at the salon table, or open the personal link Head Office sent." };
    }
    const hash = await sha256Hex(`${email}|${pin}`);
    const alt = await sha256Hex(`${person.email}|${pin}`);
    if (hash !== person.pin_hash && alt !== person.pin_hash) {
      return { ok: false as const, error: "That PIN does not match. If Head Office emailed a temporary PIN, the old number no longer works." };
    }
    const session = await signPayload(
      {
        personId: person.id,
        role: person.role,
        scope: person.scope ?? "clinic",
        branchId: person.clinic_id,
        exp: Date.now() + 8 * 60 * 60 * 1000,
      },
      supabaseConfig().secret,
    );
    return {
      ok: true as const,
      token: session,
      person: {
        id: person.id,
        branchId: person.clinic_id,
        fullName: person.full_name,
        email: person.email,
        role: person.role,
        status: person.status,
        pinHash: null,
        scope: (person.scope as Person["scope"]) ?? "clinic",
        createdAt: person.created_at,
      },
    };
  });

export const confirmChangePinFn = createServerFn({ method: "POST" })
  .validator((data: { session: string; currentPin: string; nextPin: string }) => data)
  .handler(async ({ data }) => {
    const session = await verifySession(data.session, supabaseConfig().secret);
    if (!session) return { ok: false as const, error: "Sign in before changing the PIN." };
    if (!/^\d{4,8}$/.test(data.nextPin.trim())) return { ok: false as const, error: "Choose a 4 to 8 digit PIN." };
    const people = await dataRest<Array<{ id: string; email: string; pin_hash: string | null; full_name: string }>>(
      `confirm_people?id=eq.${encodeURIComponent(session.personId)}&select=id,email,pin_hash,full_name`,
    );
    const person = people[0];
    if (!person?.pin_hash) return { ok: false as const, error: "Sign in before changing the PIN." };
    const currentHash = await sha256Hex(`${person.email}|${data.currentPin.trim()}`);
    const currentAlt = await sha256Hex(`${person.email.trim().toLowerCase()}|${data.currentPin.trim()}`);
    if (currentHash !== person.pin_hash && currentAlt !== person.pin_hash) {
      return { ok: false as const, error: "Current PIN is not correct." };
    }
    const pinHash = await sha256Hex(`${person.email.trim().toLowerCase()}|${data.nextPin.trim()}`);
    await dataRest(`confirm_people?id=eq.${encodeURIComponent(person.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ pin_hash: pinHash, updated_at: new Date().toISOString() }),
    });
    return { ok: true as const, pinHash };
  });

export const confirmRestFn = createServerFn({ method: "POST" })
  .validator((data: { path: string; method?: string; body?: string; prefer?: string; session?: string; linkToken?: string }) => data)
  .handler(async ({ data }) => {
    const { url, key, workspace, secret } = supabaseConfig();
    if (!process.env.DATABASE_URL?.trim() && (!url || !key || !workspace)) return { ok: false as const, error: "not_configured" };
    const method = (data.method || "GET").toUpperCase();
    const path = data.path.replace(/^\/+/, "");
    if (!path.startsWith("confirm_")) return { ok: false as const, error: "That path is not a Confirm table." };

    const session = await verifySession(data.session, secret);
    const link = data.linkToken ? await resolveLink(data.linkToken) : null;

    if (!session && !link) return { ok: false as const, error: "Sign in, or open a personal pack link." };
    if (!session && method !== "GET") {
      const agreementId = bodyAgreementId(data.body) || link?.agreement?.id;
      if (!link?.agreement || agreementId !== link.agreement.id) {
        return { ok: false as const, error: "This personal link can only update its own pack." };
      }
      const allowedWrite = path.startsWith("confirm_signatures") || path.startsWith("confirm_signing_links") || path.startsWith("confirm_agreements") || path.startsWith("confirm_audit");
      if (!allowedWrite) return { ok: false as const, error: "This personal link cannot change Head Office records." };
    }
    if (!session && (path.startsWith("confirm_source_files") || path.startsWith("confirm_employee_records"))) {
      if (method === "GET") return { ok: true as const, body: "[]" };
      return { ok: false as const, error: "Source files stay on the Head Office desk." };
    }

    const headers: Record<string, string> = {};
    if (data.prefer) headers.Prefer = data.prefer;
    if (session) {
      headers["x-confirm-person"] = session.personId;
      headers["x-confirm-role"] = session.role;
      headers["x-confirm-scope"] = session.scope;
      headers["x-confirm-branch"] = session.branchId;
    }

    try {
      const rows = await dataRest<unknown>(path, {
        method,
        headers,
        body: data.body && method !== "GET" ? data.body : undefined,
      });
      if (method !== "GET") bumpConfirmLive();
      if (method === "GET" && path.startsWith("confirm_people")) {
        const stripped = stripPeople(rows);
        const filtered = link?.agreement ? filterLinkRows(path, stripped, { agreement: link.agreement }) : stripped;
        return { ok: true as const, body: JSON.stringify(filtered ?? null) };
      }
      if (method === "GET" && link?.agreement) {
        return { ok: true as const, body: JSON.stringify(filterLinkRows(path, rows, { agreement: link.agreement }) ?? null) };
      }
      return { ok: true as const, body: JSON.stringify(rows ?? null) };
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : "Database request failed" };
    }
  });

export async function allowConfirmLive(session?: string, linkToken?: string) {
  const { secret } = supabaseConfig();
  if (session && (await verifySession(session, secret))) return true;
  if (linkToken && (await resolveLink(linkToken))) return true;
  return false;
}
