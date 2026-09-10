# Host SkinPhD Confirm on a private server

This app is an employee-agreement workspace. Host it on a private network.

## What already runs

- 12 source training and equipment templates
- Clinic directory and staff directory
- Frozen snapshots with SHA-256 hashes
- Employee, franchisee and witness typed signatures
- Email + PIN sign-in with 8-hour sessions
- Postgres on the same droplet (`confirm_*` tables)
- Head Office live line (`/api/confirm-live`)

Client contacts and WhatsApp tables are not used by this app.

## Environment

- `CONFIRM_DB_PASSWORD` — Postgres password (not public)
- `DATABASE_URL` — set by Docker to the local Postgres
- `CONFIRM_SESSION_SECRET` — HMAC for desk sessions (8 hours)
- `CONFIRM_PUBLIC_URL` — public site used for the mail logo
- `VITE_CONFIRM_MODE=production`

Head Office signs in with email + PIN; that issues a desk session. Personal links only load that one pack.

Postgres is not published to the internet.

## Docker

```bash
docker compose up --build -d
```

The app listens on port 8080 behind nginx. Put HTTPS in front of it.

## Before live staff

1. Change every pilot PIN from Settings after first sign-in.
2. Confirm source-form wording with SkinPhD legal.
3. Keep the host private.
4. Do not enter live ID numbers until that review is done.
5. Do not use this app for payroll deductions or client consent.
