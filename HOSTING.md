# Host SkinPhD Confirm on a private server

This app is an employee-agreement workspace. Host it on a private network.

## What already runs

- 12 source training and equipment templates
- Clinic directory and staff directory
- Frozen snapshots with SHA-256 hashes
- Employee, franchisee and witness typed signatures
- Email + PIN sign-in with 8-hour sessions
- Sync to the SkinPhD Supabase tenant (`confirm_*` tables only)
- Workspace key required on every database request

Client contacts and WhatsApp tables are not used by this app.

## Environment

Set these at **build** time.

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_CONFIRM_WORKSPACE_KEY` — required header for Confirm tables
- `VITE_CONFIRM_MODE=production`
- `VITE_AUTH_ENABLED=false`

Do not put a Supabase service-role key in this app.

## Docker

```bash
docker compose up --build -d
```

The service listens on port 8080. Put HTTPS in front of it.

## Node without Docker

```bash
npm ci
npm run build:server
HOST=0.0.0.0 PORT=8080 npm start
```

## Before live staff

1. Change every pilot PIN from Settings after first sign-in.
2. Confirm source-form wording with SkinPhD legal.
3. Keep the host private.
4. Do not enter live ID numbers until that review is done.
5. Do not use this app for payroll deductions or client consent.
