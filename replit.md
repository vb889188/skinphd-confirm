# SkinPhD Confirm on Replit

## Run

- Use the **Start application** workflow (or run `npm run dev`).
- The Vite development server binds to `0.0.0.0:8080`.
- Node.js 22 is required by the current TanStack dependencies.

## Environment

- Workspace development flags are loaded from `.grok/app-env.json`.
- Supabase and mail settings can be overridden with Replit Secrets.
- Never commit mail passwords or other credentials.
- The app can start without mail credentials, but outbound email requires the documented `MAIL_*` values.

## Project constraints

- Keep the existing React, TanStack Start, Vite, and PGLite/Supabase structure.
- Do not use Docker for the Replit workflow.
- Do not edit `sources/`.

## Checks

Run:

```bash
npm run typecheck
npm test
```