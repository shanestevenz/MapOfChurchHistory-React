# Map of Church History Architecture

## Runtime and trust boundaries

The application is a Next.js 16 App Router site on Vercel backed by Supabase. Public timeline reads use the browser-safe publishable key and PostgreSQL row-level security (RLS). `proxy.ts` refreshes Auth cookies and creates a per-request nonce for the enforced Content Security Policy.

Anonymous suggestions follow a separate path:

```text
browser -> POST /api/suggestions -> origin/body/schema checks -> Turnstile
        -> HMAC-based rate limit -> server-only Supabase RPC -> PostgreSQL
```

The Supabase secret key exists only in the server route. Browser roles cannot execute the suggestion RPC directly.

Curators sign in at `/admin`, complete TOTP MFA, and receive editor controls only at Auth assurance level `aal2`. Every database write checks the curator role and `aal2` again, so hiding UI controls is not the authorization boundary.

## Data model

- `profiles`: one-to-one with `auth.users`; contains the `viewer` or `curator` role.
- `traditions`: stable timeline lanes and visual families.
- `timeline_groups`: optional progressively revealed sections.
- `timeline_events`: event content, validated icon JSON, figures, HTTPS links, and audit metadata.
- `event_parents`: ordered many-to-many parent edges with referential integrity.
- `edit_suggestions`: contribution metadata, review status, reviewer, and timestamps.
- `suggestion_changes`: normalized field-level values.
- `suggestion_rate_limits`: short-lived privacy-preserving HMAC keys and counters.

## Database authorization

Anonymous and authenticated visitors can select public timeline tables. Private tables use RLS. Direct table writes are revoked from browser roles.

Security-definer functions have an empty `search_path`, schema-qualified relations, explicit grants, shape/length checks, and role checks:

- `submit_edit_suggestion(jsonb, jsonb, text)` is executable only by the server role and derives the previous value from the database.
- Event and group save/delete functions require a curator at `aal2`.
- `review_edit_suggestion` locks a pending row and atomically applies or declines it.

A daily `pg_cron` job removes declined suggestions after 90 days, approved suggestions after one year, and rate-limit records after 48 hours.

## Migrations and content

- `20260826000000_initial_backend.sql`: baseline schema.
- `20260908000000_production_hardening.sql`: grants, validation, MFA enforcement, rate limits, indexes, and retention.
- `20260908001000_initial_timeline_content.sql`: fixed public-content snapshot with no Auth users.
- `supabase/seed.sql`: local content plus the local-only curator; never deploy this file.
- `supabase/production-content.sql`: generated content-only reference export.

`supabase db reset` replays the entire chain on an empty local database. Future production data/schema changes should be new migrations; do not edit an already-deployed migration.

## Web controls

The application enforces nonce-based CSP, frame denial, MIME sniffing protection, a restrictive permissions policy, HTTPS upgrades in production, safe external URLs, generic user-facing backend errors, and disabled controls while mutations are pending. Production browser source maps are disabled. `/admin` is `noindex`, but database authorization and MFA are the actual controls.

See the production checklist for hosted Supabase, Vercel, DNS, WAF, backup, alert, and account settings that cannot be configured from this repository.
