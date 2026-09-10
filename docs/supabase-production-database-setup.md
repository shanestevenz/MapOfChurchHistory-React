# Populate the Production Supabase Database

Last reviewed: 2026-09-10

Use this guide for a newly created, empty production Supabase project. It creates the application's tables, database functions, security policies, rate limits, retention job, and initial timeline content.

## 1. Find the production project reference

Open the production project in the [Supabase Dashboard](https://supabase.com/dashboard) and look at the browser address:

```text
https://supabase.com/dashboard/project/abcdefghijklmnopqrst
```

The text after `/project/` is the project reference:

```text
abcdefghijklmnopqrst
```

You can also find it under **Project Settings → General → Reference ID**.

The project reference is an identifier, not a password or secret key.

## 2. Open PowerShell in this repository

Make sure the terminal is in the project directory:

```powershell
Set-Location 'E:\Projects\WebDev\map-of-church-history-react'
```

## 3. Sign in to Supabase

Run:

```powershell
npx supabase login
```

Complete the browser authorization when it opens.

## 4. Link the repository to production

Replace the example reference with your production project reference:

```powershell
npx supabase link --project-ref abcdefghijklmnopqrst
```

Enter the production database password if requested. This is the password generated when the Supabase project was created.

Confirm which project is linked:

```powershell
npx supabase projects list
```

Stop if the linked project is not the intended production project.

## 5. Preview the migrations

First compare local and remote migration history:

```powershell
npx supabase migration list
```

Then perform a dry run:

```powershell
npx supabase db push --dry-run
```

For a new empty project, the output should include these migrations:

```text
20260826000000_initial_backend.sql
20260908000000_production_hardening.sql
20260908001000_initial_timeline_content.sql
```

The output must not say that `supabase/seed.sql` will be applied.

## 6. Apply the migrations

After confirming the project and dry-run output, run:

```powershell
npx supabase db push
```

The migrations create the database structure and add the 56 initial timeline events. They do not create the known local curator account.

## 7. Verify the result

In Supabase, open **Table Editor**. The tables should include:

- `profiles`
- `traditions`
- `timeline_groups`
- `timeline_events`
- `event_parents`
- `edit_suggestions`
- `suggestion_changes`
- `suggestion_rate_limits`

Open **SQL Editor**, create a new query, and run:

```sql
select count(*) as event_count
from public.timeline_events;
```

The expected result is:

```text
56
```

Check several event rows and parent relationships as well:

```sql
select id, title, date_label
from public.timeline_events
order by year, title
limit 10;

select event_id, parent_id, sort_order
from public.event_parents
order by event_id, sort_order
limit 10;
```

Finally, open **Database → Advisors → Security** and resolve any Error-level findings before launch.

## Commands that must never be used on production

Do not run either command against the production project:

```powershell
npx supabase db reset --linked
npx supabase db push --include-seed
```

`db reset --linked` can erase the hosted database. `--include-seed` would upload `supabase/seed.sql`, which contains the known local curator credentials.

Do not edit a migration after it has been deployed. Make future database changes in a new migration file.

## Next step: create the real curator

After the migrations succeed, create the real account under **Authentication → Users**. Then follow the **Create the first hosted curator** section in [production-readiness-checklist.md](production-readiness-checklist.md).

Supabase's official migration workflow is documented in [Local development workflow](https://supabase.com/docs/guides/local-development/cli-workflows).
