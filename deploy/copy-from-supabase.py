#!/usr/bin/env python3
"""One-time copy of Confirm tables from Supabase onto local Postgres."""
from __future__ import annotations

import json
import os
import subprocess
import sys
import urllib.request

TABLES = [
    "confirm_clinics",
    "confirm_people",
    "confirm_templates",
    "confirm_agreements",
    "confirm_signatures",
    "confirm_signing_links",
    "confirm_audit",
    "confirm_source_files",
    "confirm_employee_records",
]


def env_file(path: str) -> dict[str, str]:
    values: dict[str, str] = {}
    if not os.path.exists(path):
        return values
    for line in open(path, errors="replace"):
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip("'").strip('"')
    return values


def fetch_rows(url: str, key: str, workspace: str, table: str) -> list:
    req = urllib.request.Request(
        f"{url}/rest/v1/{table}?select=*",
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "x-confirm-workspace": workspace,
        },
    )
    with urllib.request.urlopen(req, timeout=60) as response:
        data = json.loads(response.read().decode())
    return data if isinstance(data, list) else []


def main() -> int:
    values = env_file("/opt/skinphd-confirm/.env")
    url = values.get("SUPABASE_URL") or values.get("VITE_SUPABASE_URL") or os.environ.get("SUPABASE_URL") or "https://nncecsszisodfnaibjyw.supabase.co"
    key = values.get("SUPABASE_ANON_KEY") or values.get("VITE_SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_ANON_KEY") or "sb_publishable_Awm7V0LMYhv7l8nEqoVfOQ_4xqV-Sqs"
    workspace = values.get("CONFIRM_WORKSPACE_KEY") or values.get("VITE_CONFIRM_WORKSPACE_KEY") or "sph-confirm-7f3a9c2e-brooklyn"
    container = os.environ.get("CONFIRM_PG_CONTAINER", "skinphd-confirm-postgres-1")

    total = 0
    for table in TABLES:
        try:
            rows = fetch_rows(url, key, workspace, table)
        except Exception as err:
            print(f"{table}: skip ({err})")
            continue
        if not rows:
            print(f"{table}: 0")
            continue
        payload = json.dumps(rows)
        sql = (
            f"INSERT INTO {table} SELECT * FROM jsonb_populate_recordset(NULL::{table}, $copy${payload}$copy$::jsonb) "
            f"ON CONFLICT (id) DO NOTHING;"
        )
        result = subprocess.run(
            ["docker", "exec", "-i", container, "psql", "-U", "confirm", "-d", "confirm", "-v", "ON_ERROR_STOP=1"],
            input=sql.encode(),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
        if result.returncode != 0:
            print(f"{table}: copy failed")
            sys.stdout.buffer.write(result.stdout[:800])
            print()
            return 1
        print(f"{table}: {len(rows)}")
        total += len(rows)
    print(f"copied {total} rows")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
