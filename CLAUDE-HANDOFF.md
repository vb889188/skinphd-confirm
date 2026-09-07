# SkinPhD Confirm — handoff

Inspect first. Small diffs. Do not rewrite.

Last brought current: 2026-09-07. Apply Claude patch 1 only; patches 2–3 were not applied (stale SHAs).

## Product
Employee training and equipment agreements as frozen snapshots, typed-name signatures, hashes, audit, optional paper PDF/photo uploads.

Must not decide legal enforceability, competence, treatment authorization, payroll deductions, repayment amounts, medical suitability, or client treatment consent.

Client consent nav is a locked placeholder. Brand is **SkinPhD**. Branch label is **SkinPhD branch**. Head Office seed display name is **SkinPhD Head Office** (`person-amelia`).

## Live
- Code: https://github.com/vb889188/skinphd-confirm
- HEAD: see `git log -1` on main (PIN/Home fixes landed in `4da80d1`)
- Origin HTTP: http://139.59.183.201 (and :8080)
- Hostname: https://confirm.relpdev.uk — Cloudflare 521/522 until SSL is Flexible or an origin cert is on :443
- Replit is an import/preview, not the production host

Do not commit droplet passwords, SMTP passwords, or origin certs.

## Stack
TanStack Start + React 19 + Vite + Tailwind v4 + Zustand + Radix.

Supabase PostgREST: anon key + `x-confirm-workspace` + after sign-in `x-confirm-person/role/scope/branch`.

Auth is email + PIN (`sha256(email|pin)`). Not Supabase Auth.

SMTP: `src/lib/confirm/send-mail.ts` uses `MAIL_*` or `SMTP_*`. If unset, falls back to mailto.

## Paths
- `src/components/workspace.tsx`
- `src/lib/confirm/store.ts`
- `src/lib/confirm/remote.ts`
- `src/lib/confirm/send-mail.ts`
- `src/lib/confirm/rules.ts`
- `src/lib/confirm/access.ts`
- `DESIGN-TOKENS.md`, `PIN.md`, `MAIL.md`, `HTTPS.md`, `DEPLOY.md`

Do not edit `sources/`.

## What works
- Issue pack → freeze snapshot + hash
- Typed name must match snapshot name + 6-digit code + consent
- Status machine and employee-hidden issue UI
- Home: 4 display-only summary cards + 6-tile queue filter (includes Completed) — `4da80d1`
- Staff search, edit, deactivate → Inactive, reactivate, Email new PIN
- Issued PIN stays on the profile for the session after the confirm modal closes — `4da80d1`
- SMTP when configured; pack mail does not rotate the PIN
- Manager RLS headers set on sign-in, hydrate, and persistWorkspace
- `persistPerson` upsert + PATCH (both kept; people writes need manager role)
- `npm test` includes `store.test.ts`

## Still open
- Droplet image may lag GitHub — operator must rebuild
- Cloudflare hostname SSL
- Header spoofing until Supabase Auth
- Sign-code expiry is off for the pilot — SkinPhD must say if that stays
- Witness only when template `requiresWitness`

## Client consent commit
`e7a5d25` author is `Skin PhD Confirm <confirm@skinphd.local>` (this workspace identity). Locked screen only.

## Deploy
```bash
cd /opt/skinphd-confirm
git fetch origin
git reset --hard origin/main
test -f .env && grep MAIL_HOST .env
docker compose up --build -d
sleep 20
curl -I http://127.0.0.1:80
git log -1 --oneline
```
Expect `4da80d1`. Keep `.env`.

## SkinPhD decisions
- Witness per source form
- Payroll-deduction text stays recorded wording only
- Approved client forms
- Production mailbox
- Sign-code expiry after pilot
- Rotate workspace key if it leaked in chat
