# SkinPhD Confirm — Replit handoff

Import the GitHub repo. Do not start a blank Repl.

- Repo: https://github.com/vb889188/skinphd-confirm
- Branch: `main`
- Current HEAD when written: `11e21a5`

## What this app is

Employee training and equipment agreement records for SkinPhD.

It may: issue an approved template, freeze wording, collect typed names, store hashes and paper scans, email PINs.

It must not: invent legal clauses, repayment formulas, treatment authorization, payroll rules, or client consultation consent. Client consent in the nav stays locked.

## Run on Replit

```bash
npm install
npm run dev
```

Dev server: Vite on `8080`. Set the Replit webview / reserved port to **8080**.

Production-style:

```bash
npm run build:server
npm start
```

## Secrets — Replit Secrets tab only

Never commit these.

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_CONFIRM_WORKSPACE_KEY=
VITE_CONFIRM_MODE=production
MAIL_HOST=smtppro.zoho.com
MAIL_PORT=465
MAIL_USERNAME=info@relpdev.uk
MAIL_PASSWORD=
MAIL_FROM=SkinPhD Confirm <info@relpdev.uk>
```

Copy values from the DigitalOcean droplet `/opt/skinphd-confirm/.env`. Do not paste passwords into the Replit chat.

`docker-compose.yml` is for the droplet. Replit does not need Docker if `npm run dev` is used.

## First files to read

1. `CLAUDE-HANDOFF.md`
2. `src/lib/confirm/store.ts`
3. `src/lib/confirm/remote.ts`
4. `src/lib/confirm/send-mail.ts`
5. `src/components/workspace.tsx`
6. `PIN.md` and `MAIL.md`

Do not edit `sources/`.

## Rules for changes

- Inspect before editing. No rewrite.
- Typed signature name must match the snapshot signer name.
- PIN hash is `sha256(lowercaseEmail + "|" + pin)`.
- Persist the person row **before** sending any PIN / welcome / pack mail.
- Add person: valid email → Send/Cancel preview → save → mail.
- Deactivate = `inactive` + Inactive tab. Reactivate exists. Inactive cannot sign in or receive a PIN.
- 6-digit sign codes do not expire in this pilot; used codes still fail.

## After a change

```bash
npx tsc --noEmit
npm test
```

## Live droplet (separate from Replit)

http://139.59.183.201

```bash
cd /opt/skinphd-confirm
git fetch origin && git reset --hard origin/main
docker compose up --build -d
```

Keep droplet `.env`. `git reset` must not delete it.

## Out of scope until SkinPhD decides

- Client treatment consent
- Real enforceability / payroll / medical fitness
- Cloudflare Full Strict HTTPS (confirm.relpdev.uk still fails from here)
```
