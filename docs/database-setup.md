# Setting up a database (staging, preview, new branch)

Use this whenever a deployment shows **"The timeline could not be loaded." (503)**
or you've created a new Neon branch/database.

## Quick start

```powershell
npm run db:setup
```

**First, enable Neon Auth on the branch** (Neon console → select the branch → **Auth**).
The app schema references Neon Auth's `neon_auth."user"` table, so setup stops with a
clear message if Auth isn't on.

Paste the connection string when asked (from Neon → your branch → **Connect**,
or the `DATABASE_URL` value in Vercel). Pooled (`-pooler`) or direct URLs both work.
Confirm the host it prints, and it does the rest:

1. Applies app migrations from `db/migrations/` (skips ones already applied).
2. Seeds timeline data from your **local** `db/seed.sql`.
3. Prints row counts so you can see it worked.

Safe to re-run: migrations are tracked, and the seed upserts.

## Create a curator

```powershell
npm run curator:create
```

Prompts for the database URL, the branch's **Neon Auth URL** (Neon console → Auth →
Configuration), email, name, and a hidden password. It signs the account up through
Neon Auth, marks it verified, and gives it the `admin` role. Running it for an email
that already exists just promotes that account.

If you've turned public sign-ups off in Neon (recommended), turn them on for the minute
this takes, then off again. The app itself never allows public sign-up either way.

## Per-environment checklist (Vercel)

| Variable | Value |
|---|---|
| `DATABASE_URL` / `DATABASE_URL_UNPOOLED` | That branch's pooled / direct connection strings |
| `NEON_AUTH_BASE_URL` | That branch's Auth URL (each branch has its own) |
| `NEON_AUTH_COOKIE_SECRET` | Random, 32+ characters (`openssl rand -base64 32`) |

In Neon (Auth → Configuration → Domains) the site's origin must be listed exactly,
e.g. `https://staging.example.com` with **no trailing slash**.

## Options

| Command | What it does |
|---|---|
| `npm run db:setup -- --reset` | Prompts for the URL, then **deletes everything** in the `public` schema (timeline data and suggestions) and sets up from scratch. Neon Auth users are kept |
| `node scripts/setup-database.mjs "<url>"` | Pass the URL instead of being prompted |
| `--yes` | Skip the confirmation prompt |

Prefer the prompt — it keeps the password out of your shell history.

> **Windows:** don't pass the URL through `npm run db:setup -- "<url>"`. Neon URLs
> contain `&`, and npm's Windows shim cuts the command off there. Use the prompt,
> or call `node scripts/setup-database.mjs "<url>"` directly.

## When to use `--reset`

If the script says *"partial schema from an earlier failed setup"*, a previous run
stopped halfway. Re-run with `--reset`. Never use it on production unless you mean to
wipe all timeline content and suggestions.

## Reading the 503 error

`/api/timeline` logs `Timeline query failed { code: ... }`. Common codes:

| Code | Meaning | Fix |
|---|---|---|
| `42P01` / `42703` | Tables/columns missing | `npm run db:setup` |
| `28P01` | Wrong password | Update `DATABASE_URL` in Vercel |
| `ENOTFOUND` / `ECONNREFUSED` | Bad host or deleted branch | Update `DATABASE_URL` in Vercel |
