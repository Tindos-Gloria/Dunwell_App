# Dunwell Youth Priority Clinic

A full-stack healthcare web app for Dunwell Youth Priority Clinic — booking appointments, managing nurse availability, and generating medical documents (sick notes, prescriptions, referrals).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000/8080)
- `pnpm --filter @workspace/dunwell run dev` — run the frontend (Vite, random port)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS v3 (PostCSS mode), react-router-dom v7, BrowserRouter with `basename=import.meta.env.BASE_URL`
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: custom email/password via bcryptjs; session stored in localStorage under key `dunwell_user`
- Build: esbuild (CJS bundle for API)

## Where things live

- `artifacts/dunwell/src/pages/` — Index, Auth, PatientPortal, NursePortal, NotFound
- `artifacts/dunwell/src/lib/store.ts` — all React hooks + mutations; replaces Supabase
- `artifacts/dunwell/src/components/` — UI components (shadcn/ui based)
- `artifacts/dunwell/src/assets/` — logo, images
- `artifacts/api-server/src/routes/` — auth, appointments, slots, profiles, documents, health
- `lib/db/src/schema/dunwell.ts` — DB schema (profiles, appointments, nurse_slots, medical_documents)

## Architecture decisions

- Supabase + Lovable.dev completely replaced: all data goes through `/api` REST endpoints
- No Supabase realtime: replaced with 5-second polling in `useAppointments` and `useSlots` hooks
- Auth sessions stored in `localStorage` (key: `dunwell_user`) — no server-side sessions
- Nurse invite code is hardcoded: `DUNWELL-NURSE-2026`
- Google OAuth removed (was Lovable-specific); email/password only

## Product

- **Landing page** — hero, services grid, campaigns, about, testimonials
- **Patient portal** — book appointments (virtual/in-clinic), view history, rate appointments, view medical documents
- **Nurse portal** — manage availability slots, view/confirm/complete appointments, issue sick notes / prescriptions / referrals, assign Zoom links

## User preferences

- Migrated from Lovable.dev (Supabase) to Replit (Postgres + Express)
- Keep Tailwind v3 PostCSS mode (not @tailwindcss/vite plugin)
- Navy + yellow color theme; Poppins + Inter fonts

## Gotchas

- Always run `pnpm --filter @workspace/db run push` after schema changes
- Vite config uses `postcss` mode for Tailwind — do NOT switch to `@tailwindcss/vite`
- `BASE_URL` is injected by Vite from artifact config; BrowserRouter must use it as `basename`
- API server listens on `PORT` env var (defaults to 8080 in dev)
- `bcryptjs` is installed in both `api-server` (for auth) and `dunwell` (listed in deps)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- DB schema source of truth: `lib/db/src/schema/dunwell.ts`
- API contract lives in the Express route files under `artifacts/api-server/src/routes/`
