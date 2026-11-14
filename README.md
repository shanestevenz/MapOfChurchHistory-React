# Map Of Church History

An illustrated, interactive journey through two thousand years of church history.

The Map of Church History viusally maps councils, schisms, reformations, revivals, missionary movements, and influential people as a branching timeline. Its purpose is to make the relationships between Christian traditions easier to explore without reducing their history to a simple list of dates.

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

The application uses Neon Postgres for timeline content and Better Auth, hosted by the Next.js app, for curator accounts and TOTP multi-factor authentication. Browser requests go through the app's server routes; database credentials stay server-side.

1. Create a Neon Postgres project and copy its pooled and direct connection strings into `.env.local` as `DATABASE_URL` and `DATABASE_URL_UNPOOLED`. Use the pooled URL for app requests and the direct URL for schema and seed commands.
2. Set `BETTER_AUTH_URL` to the app origin and generate a private `BETTER_AUTH_SECRET` (at least 32 characters). Add the Turnstile, rate-limit, cron, and privacy contact values shown in `.env.example`.
3. Apply Better Auth's schema, the application schema, and the public timeline seed:

   ```sh
   npm run auth:migrate
   npm run db:migrate
   npm run db:seed
   ```

4. Create a fresh curator account. This prompts for a password and writes no account into the seed file:

   ```sh
   npm run auth:create-admin -- --email curator@example.com --name "Timeline Curator"
   ```

   On first sign-in, enroll an authenticator app and save the displayed recovery codes.

`npm run db:seed:generate` rebuilds `db/seed.sql` from `lib/timeline-data.ts`. The seed contains traditions, groups, events, and event relationships only. It does not import users, suggestions, or prior database records.

The scheduled Vercel job in `vercel.json` purges declined suggestions after 90 days, approved suggestions after one year, and rate-limit records after 48 hours. Set `CRON_SECRET` in the deployment environment.

## Local Postgres with Docker

`compose.yaml` starts PostgreSQL 16 with a persistent Docker volume. For the app and migration scripts, set these local values in `.env.local`:

```dotenv
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/church_history_dev
DATABASE_URL_UNPOOLED=postgresql://postgres:postgres@localhost:5432/church_history_dev
```

Start the database and initialize its schema and public timeline content:

```sh
docker compose up -d db
npm run auth:migrate
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

The integration suite requires `TEST_DATABASE_URL` to point to a disposable local Postgres database whose name includes `ci` or `test`. Apply `npm run auth:migrate`, `npm run db:migrate`, and `npm run db:seed` first. The integration test refuses remote hosts and production-style database names. Playwright starts the app in development mode so CI can exercise the real Postgres suggestion route without external Turnstile credentials; it applies the same migrations and seed first.

## Technology

The application is built with Next.js, React, TypeScript, Neon Postgres, and Better Auth. Curator mutations require an admin account with TOTP enabled; suggestion submissions use server-side validation, Cloudflare Turnstile, and a durable daily rate limit.

## License and reuse

No open-source license is currently granted. Unless a license is added later, the source code and original project content remain all rights reserved. Viewing this public repository does not grant permission to copy, redistribute, modify, or republish the project.
