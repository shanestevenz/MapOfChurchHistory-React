# Map of Church History

Interactive church-history timeline built with Next.js 16 and Supabase.

## Local development

Prerequisites: Node.js, Docker Desktop, Git, and npm.

```powershell
Copy-Item .env.example .env.local
npm install
npm run db:start
npx supabase status
npm run db:seed:generate
npm run db:reset
npm run dev
```

Copy the local URL, publishable key, and secret key printed by `npx supabase status` into `.env.local`. The local stack uses ports `54321`–`54327`; Studio is at <http://127.0.0.1:54323>.

The seed creates `curator@localhost.test` with password `local-curator-change-me`. This account is local-only. Visit <http://localhost:3000/admin> and enroll an authenticator app before editing.

## Verification commands

```powershell
npm ci
npm audit --audit-level=moderate
npm run lint
npm run typecheck
npm test
npm run build
npm run db:reset
npm run db:test
```

- `npm run db:seed:generate` regenerates both local seed data and a content-only SQL export.
- `npm run db:types` regenerates TypeScript types from the local database.
- `npm run production:check` validates real production environment variables without printing their values.
- `npm run load:test` performs a small read-only test only after a staging URL is explicitly confirmed.

## Production safety

Apply migrations with `npx supabase db push`. The fixed initial-content migration contains public timeline content but no Auth account. Never pass `--include-seed` to a production command: `supabase/seed.sql` contains the known local curator.

Create hosted curator accounts through Supabase Auth, promote them using a trusted SQL session, and have each curator enroll TOTP at `/admin`. Never expose `SUPABASE_SECRET_KEY`, the database password, or `TURNSTILE_SECRET_KEY` to browser code or a `NEXT_PUBLIC_` variable.

Follow [docs/production-readiness-checklist.md](docs/production-readiness-checklist.md) for the first deployment and [docs/operations-runbook.md](docs/operations-runbook.md) for incidents, backup tests, and recurring maintenance.
