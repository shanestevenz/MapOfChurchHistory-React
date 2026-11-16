# EcclesioGraph

A Timeline of Church History: an interactive timeline built with Next.js 16 and Neon Postgres.

EcclesioGraph is a timeline of church history. It visually maps councils, schisms, reformations, revivals, missionary movements, and influential people as a branching timeline. Its purpose is to make the relationships between Christian traditions easier to explore without reducing their history to a simple list of dates.

## Explore the timeline

Move through the timeline chronologically, follow connections between events, focus on individual traditions, and open an event to read its historical context and sources.

The project currently includes:

- A visual timeline spanning the early church through the modern era
- Branches showing historical relationships between Christian traditions
- Focused sections for periods that benefit from additional detail
- Event summaries, key figures, longer explanations, and external sources
- A moderated suggestion system for proposing factual corrections

The public website link will be added here when the production deployment is complete.

## Historical approach

Church history contains sincere disagreement about terminology, dates, causation, and the significance of particular events. The timeline aims to be informative, readable, and fair across traditions while recognizing that no single visualization can capture every perspective.

Corrections and stronger sources may be proposed through the suggestion form on the published website. Suggestions are reviewed before they appear publicly.

## About this repository

This repository is public for transparency and to make the source behind the project visible. It is not currently open for outside development, pull requests, or feature contributions.


## Neon setup

The application uses Neon Postgres for timeline content and Neon Auth (managed Better Auth) for curator accounts. Users live in each branch's `neon_auth` schema. Browser requests go through the app's server routes; database credentials stay server-side, and every curator sign-in passes a Cloudflare Turnstile check first.

1. Create a Neon Postgres project. For each branch you deploy (e.g. production, staging), select the branch and enable **Auth** in the Neon console.
2. In that branch's Auth settings, add every site origin that signs in under **Domains** (scheme included, no trailing slash), and turn off public sign-ups.
3. Set the app's environment (`.env.local` or Vercel): `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED` (direct), `NEON_AUTH_BASE_URL` (the branch's Auth URL), and `NEON_AUTH_COOKIE_SECRET` (generate with `openssl rand -base64 32`). Add the Turnstile, rate-limit, cron, and privacy contact values shown in `.env.example`.
4. Apply the schema and public timeline seed, then create a curator (see [docs/database-setup.md](docs/database-setup.md)):

   ```sh
   npm run db:setup
   npm run curator:create
   ```

`npm run db:seed:generate` rebuilds `db/seed.sql` from `lib/timeline-data.ts`. The seed contains traditions, groups, events, and event relationships only. It does not import users, suggestions, or prior database records.

The scheduled Vercel job in `vercel.json` purges declined suggestions after 90 days, approved suggestions after one year, and rate-limit records after 48 hours. Set `CRON_SECRET` in the deployment environment.

## Local Postgres with Docker

`compose.yaml` starts PostgreSQL 16 with a persistent Docker volume. For the app and migration scripts, set these local values in `.env.local`:

```dotenv
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/church_history_dev
DATABASE_URL_UNPOOLED=postgresql://postgres:postgres@localhost:5432/church_history_dev
```

Start the database and initialize its schema and public timeline content. Plain Postgres has no Neon Auth, so `db:local-auth-stub` creates a stand-in `neon_auth."user"` table (curator sign-in itself needs a Neon branch):

```sh
docker compose up -d db
npm run db:local-auth-stub
npm run db:migrate
npm run db:seed
```

Use `docker compose down` to stop it; the named volume keeps local data. Set `POSTGRES_PORT` if port `5432` is already in use.

## CI and tests

GitHub Actions runs lint, TypeScript checks, unit tests, and a production build. Separate jobs migrate and seed a disposable PostgreSQL 16 service before exercising the database procedures and running Playwright end-to-end tests in Chromium and Firefox. Dependency auditing fails on high or critical advisories and separately fails on any production dependency advisory; CodeQL runs in its own workflow.

Run the suites locally with:

```sh
npm run test:unit
npm run test:integration
npm run test:e2e
npm run audit
```

`npm run test:perf` checks performance budgets against a production build: it builds, serves on port 3100, and measures page weight, server response times, load metrics (FCP, LCP, CLS, Total Blocking Time), frame times while zooming and panning, and how quickly an event opens. Load and interaction run twice, at full speed and with the CPU throttled 4x as a stand-in for a mid-range phone. Budgets live in `tests/perf/budgets.ts`; every run prints its measurements, so it doubles as a report. Set `PERF_BASE_URL` to measure an already running server instead. It is not part of CI, because shared runners make timings noisy.

The integration suite requires `TEST_DATABASE_URL` to point to a disposable local Postgres database whose name includes `ci` or `test`. Apply `npm run db:local-auth-stub`, `npm run db:migrate`, and `npm run db:seed` first. The integration test refuses remote hosts and production-style database names. Playwright starts the app in development mode so CI can exercise the real Postgres suggestion route without external Turnstile credentials; it applies the same migrations and seed first.

## Technology

The application is built with Next.js, React, TypeScript, Neon Postgres, and Neon Auth. Curator mutations require a Neon Auth account with the admin role; suggestion submissions use server-side validation, Cloudflare Turnstile, and a durable daily rate limit.

## License and reuse

No open-source license is currently granted. Unless a license is added later, the source code and original project content remain all rights reserved. Viewing this public repository does not grant permission to copy, redistribute, modify, or republish the project.
