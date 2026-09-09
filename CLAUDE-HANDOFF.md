# SkinPhD Confirm — handoff

Inspect first. Small diffs. Do not rewrite.

Last brought current: 2026-09-09. Signing UX is patched into this repo — not a parallel app.

## Product
Employee training and equipment agreements as frozen snapshots, typed-name signatures, hashes, audit, optional paper PDF/photo uploads.

Must not decide legal enforceability, competence, treatment authorization, payroll deductions, repayment amounts, medical suitability, or client treatment consent.

Client consent nav is a locked placeholder. Brand is **SkinPhD**. Branch label is **SkinPhD branch**. Head Office seed display name is **SkinPhD Head Office** (`person-amelia`).

## Signing (2026-09-09)
Client feedback: too many PIN/code numbers confuse employees. Landed on the existing workspace, not a new product:

- Kill per-pack 6-digit codes.
- Default same-day salon-table ceremony: pass the tablet, signer types their own legal name, consent tick, optional drawn mark, snapshot hash.
- Personal email/WhatsApp link only if the signer has left. Not a PIN. Not a 6-digit code.
- Workspace PIN stays for Head Office / franchisee desk only. Therapists and witnesses do not collect a PIN.
- Head Office never types another person's name.
- Pack opened is audited. HO can void an open pack (reason required) and reissue a freeze. Completed packs print as a certificate of record.

## Live
- Code: https://github.com/vb889188/skinphd-confirm
- HEAD: see `git log -1` on main
- Origin HTTP: http://139.59.183.201 (and :8080)
- Hostname: https://confirm.relpdev.uk — Cloudflare 521/522 until SSL is Flexible or an origin cert is on :443
- Replit is an import/preview, not the production host

Do not commit droplet passwords, SMTP passwords, or origin certs.

## Stack
TanStack Start + React 19 + Vite + Tailwind v4 + Zustand + Radix.

Supabase PostgREST: anon key + `x-confirm-workspace` + after sign-in `x-confirm-person/role/scope/branch`.

Auth is email + PIN (`sha256(email|pin)`). Not Supabase Auth. PIN is desk sign-in only.

SMTP: `src/lib/confirm/send-mail.ts` uses `MAIL_*` or `SMTP_*`. If unset, falls back to mailto.

## Paths
- `src/components/workspace.tsx`
- `src/components/sign-pad.tsx`
- `src/lib/confirm/store.ts`
- `src/lib/confirm/remote.ts`
- `src/lib/confirm/send-mail.ts`
- `src/lib/confirm/email.ts`
- `src/lib/confirm/rules.ts`
- `src/lib/confirm/access.ts`
- `DESIGN-TOKENS.md`, `PIN.md`, `MAIL.md`, `HTTPS.md`, `DEPLOY.md`

Do not edit `sources/`.

## What works
- Issue pack → freeze snapshot + hash
- Typed name must match snapshot name + consent. No 6-digit pack code. Optional drawn mark.
- Status machine and employee-hidden issue UI
- Home: 4 display-only summary cards + 6-tile queue filter (includes Completed) — `4da80d1`
- Staff search, edit, deactivate → Inactive, reactivate, Email new PIN (franchisee/HO)
- Issued PIN stays on the profile for the session after the confirm modal closes — `4da80d1`
- SMTP when configured; pack mail does not rotate the PIN
- Manager RLS headers set on sign-in, hydrate, and persistWorkspace
- `persistPerson` upsert + PATCH (both kept; people writes need manager role)
- `npm test` includes `store.test.ts`
- Void + reissue on an open pack; personal link mail when the signer has left

## Still open
- Droplet image may lag GitHub — operator must rebuild
- Cloudflare hostname SSL
- Header spoofing until Supabase Auth
- Personal-link phone open still uses the hashed token already stored in `confirm_signing_links`; do not add a second code
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
Keep `.env`.

## SkinPhD decisions
- Witness per source form
- Payroll-deduction text stays recorded wording only
- Approved client forms
- Production mailbox
- Rotate workspace key if it leaked in chat
