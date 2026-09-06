# SkinPhD Confirm — handoff for Claude

Take over this repo. Do not rewrite it. Inspect first. Small reviewable diffs.

## Product
SkinPhD Confirm stores **employee** training and equipment agreements as frozen snapshots with typed-name signatures, hashes, audit, and optional paper PDF/photo uploads.

It must **not** decide: legal enforceability, competence, treatment authorization, payroll deductions, repayment amounts, medical suitability, or client treatment consent.

Client consultation / The Drop-style waivers stay locked until SkinPhD supplies approved client forms.

Brand is always **SkinPhD**. Branch label is **SkinPhD branch**, not clinic. Head Office identity display name is **SkinPhD Head Office** (seed id `person-amelia`).

## Repos and live
- Code: https://github.com/vb889188/skinphd-confirm
- HEAD at handoff: `1d3f464`
- Live IP: http://139.59.183.201 and http://139.59.183.201:8080
- Intended host: https://confirm.relpdev.uk (Cloudflare proxy; 522 until SSL mode / origin cert is right)
- Older private prototype: https://github.com/vb889188/skinphd-confirm-mvp (reference only)

Do not use the droplet root password from old chat logs in commits.

## Stack
TanStack Start + React 19 + Vite + Tailwind v4 + Zustand persist + Radix.

Supabase PostgREST (anon key + workspace header + person headers after sign-in).

Tables: `confirm_clinics`, `confirm_people`, `confirm_templates`, `confirm_agreements`, `confirm_signatures`, `confirm_signing_links`, `confirm_audit`, `confirm_source_files`, `confirm_employee_records`.

Tenant id: `49937a9c-4c8c-420f-bac7-f2ff3f22f43e`  
Project URL: `https://nncecsszisodfnaibjyw.supabase.co`

Auth is **email + PIN** in the app (SHA-256 `email|pin`). Not Supabase Auth.

## Important paths
- `src/components/workspace.tsx` — UI
- `src/lib/confirm/store.ts` — issue, sign, PIN, records
- `src/lib/confirm/remote.ts` — Supabase REST
- `src/lib/confirm/rules.ts` — status machine, name match
- `src/lib/confirm/access.ts` — RBAC
- `src/lib/confirm/email.ts` — mailto bodies
- `src/lib/confirm/ocr.ts` — browser Tesseract / PDF.js on upload
- `src/lib/confirm/templates.ts` — seeded SkinPhD source forms
- `docker-compose.yml` — ports `80:8080` and `8080:8080`
- `HTTPS.md`, `PIN.md`, `SCHEMA.md`, `DEPLOY.md`, `RECORDS.md`

Do not modify anything under `sources/` if present.

## What works
- Issue pack from approved source form → freeze snapshot + hash
- Typed signature needs official directory name + 6-digit emailed code + consent tick
- Status: awaiting_signatures → partially_signed → completed / declined
- Employee Home hides issue forms, live audit, source filters
- Head Office Home: who-signs-next tiles filter the queue
- Staff: search, edit, deactivate, Email new PIN, Open profile
- Profile lists completed Confirm packs and uploaded paper PDF/photos
- Paper upload indexed (filename, note, PDF text, OCR)
- Mailto for pack, reminder, sign code, welcome, next signer, signed record
- RLS: workspace key always; after sign-in person/role headers; employees select only packs they are on; audit select is manager-only
- Production `npm run build:server` last verified green

## What does not work / is incomplete
- Droplet often lags GitHub — operator must `git reset --hard origin/main && docker compose up --build -d`
- Email is **mailto**, not server SMTP. Gmail connector works in Grok chat only
- Cloudflare 522: origin HTTP on 80/8080 is up; CF Full/strict hits 443 with no cert. Use hostname Configuration Rule Flexible **or** Origin Certificate + nginx (`deploy/origin-nginx.conf`)
- Headers can be spoofed with the anon key until Supabase Auth exists
- Sign codes shown on screen to Head Office; employees get mail
- Witness required only when template `requiresWitness` is true — do not strip globally without SkinPhD legal
- No silent Gmail from Docker

## Rules when changing code
- Inspect before edit. No greenfield rewrite.
- No invented legal wording or repayment formulas.
- No client consent forms.
- Fictional / pilot identities only in seed.
- Do not commit secrets, origin.pem, or Cloudflare API tokens.
- Update docs when behaviour changes.
- Run `npx tsc --noEmit` after UI/store/remote edits.
- After meaningful work run `npm run build:server`.
- Tests live in `src/lib/confirm/rules.test.ts` and `access.test.ts` — add coverage for validation, snapshot integrity, status, signing.

## Signing rules (do not weaken)
- Typed name must `namesMatch` the official signer name on the snapshot (Head Office signing as franchisee types **Amelia Naidoo**, not SkinPhD Head Office, if that is the snapshot name)
- 6-digit code hashed, 15 minute expiry, required to record sign
- Snapshot JSON is immutable after issue

## Deploy
```bash
cd /opt/skinphd-confirm
git fetch origin
git reset --hard origin/main
docker compose up --build -d
sleep 15
curl -I http://127.0.0.1:80
git log -1 --oneline
```
Low-memory droplet: 2G swap before rebuild. Tesseract/PDF.js makes the image large.

## Decisions that need SkinPhD, not Claude
- Witness required or not, per source form
- Whether payroll-deduction sentences stay as recorded text only
- Approved client consent forms (separate product)
- Production SMTP mailbox
- Rotate workspace key if it leaked in chat

## Suggested first tasks
1. Confirm droplet HEAD matches GitHub
2. Finish Confirm-only Cloudflare HTTPS (Flexible rule or origin cert)
3. Employee profile QA: upload PDF, Open stored file, open completed Confirm pack
4. Optional: server-side mail with env SMTP — do not hardcode Gmail passwords
