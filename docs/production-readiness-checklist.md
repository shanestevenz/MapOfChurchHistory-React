# Production Readiness and Security Checklist

Last reviewed and locally verified: 2026-09-08

This is the first-production-deployment guide for **Map of Church History**, using Vercel and hosted Supabase. A checked box means the repository work is complete and was verified locally. An unchecked box requires your account, billing, domain, production credentials, or a real staging/production environment; Codex cannot safely do it for you from this workspace.

```text
Public reads ------------------------------> Supabase Data API (publishable key + RLS)

Suggestion form -> POST /api/suggestions -> Vercel WAF -> Turnstile
                                                    -> strict validation + durable limit
                                                    -> server-only Supabase RPC

Curator -> /admin -> password + Turnstile + TOTP MFA -> PostgreSQL role + aal2 checks
```

The hidden `/admin` route reduces clutter; it is not a security boundary. The enforced boundary is MFA plus database grants, RLS, and function checks.

## 1. Repository launch blockers

- [x] **Migration history replays from an empty database.** The redundant pre-production migrations were removed. `npm run db:reset` and the expanded authorization smoke test pass from a clean local database.
- [x] **Production content contains no local Auth account.** `20260908001000_initial_timeline_content.sql` contains the 56 public events and related content. `supabase/seed.sql` remains local-only and contains `curator@localhost.test`; never use `--include-seed` against a hosted project.
- [x] **TypeScript errors fail the build.** `typescript.ignoreBuildErrors` was removed.
- [x] **The optimized production build passes.** Next.js was upgraded to 16.3.4, the build passes, and production browser source maps are disabled.
- [x] **CSP is enforced.** A per-request nonce policy allows the exact configured Supabase origin, Turnstile, and Vercel Analytics; it denies framing, plugins, and unsafe base/form targets. Local production responses were inspected.
- [x] **Anonymous suggestions have an abuse-control boundary.** Requests go through `/api/suggestions`, 64 KiB/exact-shape validation, HTTPS URL validation, Turnstile, a 20-per-24-hour HMAC-key limit, and a 500-pending ceiling. Direct browser RPC access is revoked.
- [x] **Database privileges are explicit.** Default/public function execution and unnecessary browser table privileges are revoked. Automated denial tests cover anonymous, viewer, curator `aal1`, and curator `aal2` roles.
- [x] **Admin sign-in moved to `/admin`.** The public sign-in control and local credential hint were removed. The page is `noindex` and requires TOTP before editor access.
- [ ] **Create separate hosted staging and production projects.** Follow section 2 before connecting Vercel.

Do not launch while that final unchecked blocker remains.

## 2. Create and secure the accounts

### Supabase environments

- [ ] Create a **staging** project in [Supabase Dashboard](https://supabase.com/dashboard): click **New project**, choose your organization, choose the region closest to most visitors, generate a database password in a password manager, and name it clearly (for example, `church-history-staging`).
- [ ] Repeat for a completely separate **production** project. Never reuse production keys in Preview deployments. Supabase recommends separate environments in its [deployment guide](https://supabase.com/docs/guides/deployment).
- [ ] Choose a paid plan for production if daily downloadable backups and non-pausing service matter. Under **Database → Backups**, confirm the exact retention shown for your selected plan. Enable PITR only if the 24-hour RPO in the operations runbook is insufficient. See [Database Backups](https://supabase.com/docs/guides/platform/backups).

### Human accounts and ownership

- [ ] In the Supabase organization settings, require MFA for all members. Enable MFA on your own Supabase and Vercel accounts; prefer a hardware security key or authenticator.
- [ ] Add a second individual owner who can recover Supabase, Vercel, the domain registrar, and GitHub. Never share one owner login. Store recovery codes separately from the password.
- [ ] Give everyone the lowest platform role they need. Put quarterly access review dates on the calendar.
- [ ] Fill every `FILL IN` cell in [operations-runbook.md](operations-runbook.md), including the emergency and backup owners. The proposed starting objectives are RPO 24 hours and RTO 4 hours; explicitly accept or change them.
- [x] Database changes are migration-driven and committed; the architecture document warns against editing an already-deployed migration.

### GitHub repository controls

- [x] CI, CodeQL, and weekly Dependabot configuration are committed in `.github/`.
- [ ] On GitHub, open **Settings → Rules → Rulesets → New branch ruleset**. Target your production branch, require a pull request, require at least one approval if another maintainer is available, require conversation resolution, block force pushes/deletions, and require the CI checks after their first successful run.
- [ ] Open **Settings → Code security** and enable Dependabot alerts/security updates, secret scanning, push protection, and private-vulnerability reporting where available. Protect every GitHub owner with MFA.

## 3. Secrets and Vercel variables

Use only the staging values for Vercel Preview and only production values for Production:

| Variable | Browser-visible | Preview | Production |
|---|---:|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Staging URL | Production URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Staging `sb_publishable_...` | Production `sb_publishable_...` |
| `SUPABASE_SECRET_KEY` | **No** | Staging `sb_secret_...` | Production `sb_secret_...` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Yes | Staging widget | Production widget |
| `TURNSTILE_SECRET_KEY` | **No** | Staging secret | Production secret |
| `RATE_LIMIT_SECRET` | **No** | Unique staging random value | Different production random value |
| `NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL` | Yes | Monitored inbox | Monitored inbox |

- [ ] In each Supabase project, open **Project Settings → API Keys**. Copy the new publishable and secret keys, not legacy `anon`/`service_role` keys. A secret key bypasses RLS and must never enter browser code. See [Supabase API keys](https://supabase.com/docs/guides/api/api-keys).
- [ ] In [Cloudflare Turnstile](https://dash.cloudflare.com/), create separate staging and production widgets. Allow only the appropriate hostnames. Save each site key and secret in the matching Vercel environment.
- [ ] Generate two different rate-limit secrets locally:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

- [ ] In Vercel, open **Project → Settings → Environment Variables**. Add every variable above and select only **Preview** or only **Production** as appropriate. Do not paste a secret into a `NEXT_PUBLIC_` variable. Redeploy after any change because an existing deployment keeps its old values. See [Vercel environment variables](https://vercel.com/docs/environment-variables).
- [ ] Pull production values into a temporary, ignored local file and validate them without printing secrets:

```powershell
npx vercel env pull .env.production.local --environment=production
node --env-file=.env.production.local scripts/check-production-env.mjs
```

  Delete the temporary file through your normal secure deletion process when finished. Do not commit or screenshot it.
- [x] `.env*`, `.env.local`, `.env*.local`, and `.vercel/` are ignored; secrets are confined to server code; the validator rejects localhost, legacy key formats, placeholders, weak rate-limit secrets, and local Auth seed data.
- [ ] If any secret appears in Git, logs, a screenshot, or chat, rotate it immediately at its provider, update only the affected Vercel environment, redeploy, verify, and revoke the old value. Follow the incident runbook.

## 4. Supabase database hardening

### Controls completed in migrations

- [x] RLS is enabled on every Data API table, and table/function grants follow least privilege.
- [x] `profiles.role` is protected from self-promotion; the unused profile-update policy was removed.
- [x] Security-definer functions use an empty `search_path`, qualified relations, input limits, and authorization checks.
- [x] `is_curator()` requires both the database curator role and JWT assurance level `aal2`.
- [x] Event links and suggestion sources require credential-free HTTPS URLs. Arrays, icons, links, parents, JSON shape, and text lengths are bounded. Suggestion `before_value` comes from the database.
- [x] Query indexes were added for group/author/reviewer/event lookup paths.
- [x] `graphql_public` was removed from the local exposed-schema list because GraphQL is unused.
- [x] A daily `pg_cron` retention job deletes declined suggestions after 90 days, approved suggestions after one year, and limiter records after 48 hours.
- [x] Automated smoke tests prove public reads; private queue isolation; no direct suggestion RPC; no self-promotion; no `aal1` writes; and successful `aal2` CRUD/review.

### Hosted project switches you must set

Repeat these steps in staging, then production:

- [ ] Open **Project Settings → Database → SSL Configuration** and enable SSL Enforcement.
- [ ] Open **Project Settings → Database → Network Restrictions**. If only the Data API is used, allow direct Postgres/pooler connections only from the current administrator/CI public IP ranges. This does not restrict the HTTPS Data API. Do not guess IPs: obtain and document the exact egress address first. See [Supabase platform security](https://supabase.com/docs/guides/security/platform-security).
- [ ] Open **Project Settings → API** and confirm only `public` is exposed; remove `graphql_public` if it appears and GraphQL is unused.
- [ ] After migrations, open **Database → Advisors → Security** and resolve every Error. Review Performance warnings rather than adding indexes blindly. Record any accepted warning and its reason.
- [x] The browser has no direct Postgres connection. The server uses the HTTPS Supabase API, so no serverless database pool needs configuration.

## 5. Auth and curator security

Repeat hosted settings in staging and production:

- [ ] Open **Authentication → Sign In / Providers → Email** and turn off new-user/public signup while retaining email/password sign-in. Disable every unused provider.
- [ ] Open **Authentication → URL Configuration**. Set **Site URL** to the exact canonical HTTPS origin. Allow only the exact production `/admin` URL in production; put preview URLs only in staging. Avoid wildcards in production.
- [ ] Open **Authentication → Bot and Abuse Protection**, choose Cloudflare Turnstile, paste that environment's Turnstile secret, and enable it. The `/admin` form already sends the CAPTCHA token.
- [ ] Open **Authentication → Rate Limits**. Start sign-up/sign-in at 30 requests per 5 minutes per IP (the documented default) and leave MFA challenge/verify at the provider limit of 15 per minute. Because the site has only curators, reduce token endpoint traffic after observing normal refreshes; do not set an untested value immediately. Supabase returns `429` when buckets empty; see [Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits).
- [ ] In Auth password settings, set minimum password length to 16, require digits/lowercase/uppercase/symbols, and enable leaked-password protection if the plan supports it. Use generated unique passwords stored in a password manager. See [Password security](https://supabase.com/docs/guides/auth/password-security).
- [ ] Confirm TOTP enrollment and verification are enabled. The application enrolls/challenges TOTP, and database writes reject `aal1`. See [Supabase MFA](https://supabase.com/docs/guides/auth/auth-mfa).
- [x] Sign-in errors are generic, submission buttons lock while pending, and the production UI contains no local account/password.
- [x] A lost-authenticator procedure is documented without weakening ordinary MFA.

### Create the first hosted curator

- [ ] In **Authentication → Users**, use **Add user** with a unique email and generated temporary password. Confirm the email if the dashboard offers that option.
- [ ] In **SQL Editor**, replace the email below and run exactly this promotion:

```sql
update public.profiles as p
set role = 'curator'
from auth.users as u
where p.id = u.id
  and lower(u.email) = lower('replace-with-curator@example.com')
returning p.id, p.display_name, p.role;
```

- [ ] Visit `https://YOUR-DOMAIN/admin`, sign in, scan the TOTP QR code, save the authenticator recovery details, and enter a code. Confirm editor controls appear only after MFA.
- [ ] Test demotion by changing `role` back to `viewer` and refreshing. Curator RPCs must immediately fail. Promote again only after the test.

## 6. Suggestions, WAF, privacy, and cost

- [x] Server-side Turnstile verification is mandatory in production. Tokens are never logged, and validation uses a 5-second timeout. Turnstile tokens are single-use and expire after five minutes; see [Cloudflare server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).
- [x] Durable limits are 20 accepted submissions per HMAC IP key per 24 hours, maximum 500 pending, and 64 KiB per request. Raw IP addresses are not stored.
- [x] A privacy page discloses suggestions, contributor/source data, Turnstile, Vercel Analytics, HMAC-based abuse data, retention, and contact information.
- [ ] Set the real privacy email and have someone read `/privacy` for accuracy for your jurisdiction. This repository change is technical documentation, not legal advice.
- [ ] In Vercel **Project → Firewall → Configure → Add New → Rule**, name it `suggestion-post-limit`. Conditions: request path equals `/api/suggestions` **AND** request method equals `POST`. Start with **Log**, publish, submit a test, and confirm only that endpoint matches. Then change it to **Rate Limit: 5 requests per 10 minutes per IP**, with follow-up action **Return 429**, review, and publish. Vercel recommends log-first testing; see [WAF custom rules](https://vercel.com/docs/vercel-firewall/vercel-waf/custom-rules).
- [ ] Configure Vercel/Supabase usage notifications. Alert on request/egress spikes, database CPU/memory/connections/disk, `5xx`, unusual `429`, Auth failures, and 100 pending suggestions. Name the owner who can deny suggestion POSTs.
- [ ] After staging contains realistic data, run the safe read-only load test (never production):

```powershell
$env:LOAD_TEST_URL = 'https://YOUR-STAGING-DEPLOYMENT.vercel.app/'
$env:CONFIRM_STAGING = 'yes'
$env:LOAD_TEST_REQUESTS = '100'
$env:LOAD_TEST_CONCURRENCY = '10'
npm run load:test
```

  Save p50/p95/p99, failures, Supabase resource graphs, and Vercel request counts. A reasonable first gate is zero failures and p95 under 2 seconds; adjust only after measuring real users.
- [ ] Public timeline reads still go directly to the Supabase Data API. This is acceptable for initial low traffic, but it is not covered by Vercel WAF. If read traffic/cost becomes material, move reads behind a cached Next.js endpoint before revoking anonymous table reads.

## 7. Apply migrations safely

First run this exact sequence locally:

```powershell
npm ci
npm audit --audit-level=moderate
npm run lint
npm run typecheck
npm test
npm run build
npm run db:start
npm run db:reset
npm run db:test
```

`db:reset` destroys only the local database in the usual unlinked workflow. Never add `--linked`.

Deploy to **staging first**:

```powershell
npx supabase login
npx supabase link --project-ref YOUR-STAGING-PROJECT-REF
npx supabase migration list
npx supabase db push --dry-run
npx supabase db push
```

- [ ] Read the dry-run list. It should include the baseline, hardening, and initial-content migrations, and must not mention `seed.sql`. If another maintainer exists, have them confirm the project reference and output.
- [ ] Run the commands for staging, verify 56 events and several parent links, then run Security Advisor. Never use `--include-seed`.
- [ ] Complete section 9 against staging. Only then relink to production, repeat `migration list` and `db push --dry-run`, and apply the exact reviewed migrations.
- [ ] Verify production contains no `curator@localhost.test` Auth user. Create the real curator through the dashboard only after migrations succeed.

Do not run the destructive local CRUD smoke script against production. Production verification should be public reads plus one intentional curator edit that you immediately inspect.

## 8. Vercel, domain, and browser security

- [ ] In Vercel click **Add New → Project**, import this Git repository, select the production branch, keep the detected Next.js settings, and configure the environment variables from section 3.
- [ ] Deploy a Preview against staging first. Inspect Build and Function logs, then complete the staging tests.
- [ ] Under **Settings → Domains**, add the real domain and copy the displayed DNS record into your registrar. Wait for Vercel to show a valid configuration and certificate; test both the canonical host and redirects over HTTPS.
- [x] Enforced CSP contains `frame-ancestors 'none'`; `X-Frame-Options: DENY`, `nosniff`, restrictive Permissions Policy, referrer policy, and production HTTPS upgrade are present.
- [x] External links allow HTTPS without embedded credentials and use `noopener noreferrer`; text is rendered as React text with no application `dangerouslySetInnerHTML`.
- [ ] On staging, use browser Developer Tools → Console/Network on `/`, `/admin`, `/privacy`, sign-in, Turnstile, Analytics, and external images. Investigate every CSP error before production. Confirm the CSP `connect-src` contains the exact environment's Supabase origin.
- [ ] After the domain has worked only over HTTPS for at least a week, consider strengthening HSTS to `max-age=63072000; includeSubDomains`. Do not add `includeSubDomains` until every subdomain is HTTPS; do not add `preload` without understanding its difficult reversal.
- [ ] Restrict Vercel project/environment settings to the two owners and necessary deployers.

## 9. Verification evidence

### Automated gates

- [x] `npm ci` succeeds from the committed lockfile.
- [x] `npm audit --audit-level=moderate` reports zero known vulnerabilities after upgrading Next.js to 16.3.4.
- [x] ESLint passes with zero warnings.
- [x] TypeScript passes and build errors are not ignored.
- [x] Eight validation/API tests pass, including dangerous URL, CAPTCHA failure, rate-limit `429`, and success cases.
- [x] Production build passes.
- [x] Empty local database replay and expanded authorization/MFA smoke tests pass.
- [x] GitHub Actions runs install, audit, lint, typecheck, unit tests, build, local Supabase reset, and database smoke tests. CodeQL and Dependabot are configured.
- [ ] Push a branch and confirm both GitHub Actions workflows pass in GitHub before making them required checks.

### Authorization matrix implemented by the smoke test

| Operation | Anonymous | Viewer `aal1` | Curator `aal1` | Curator `aal2` |
|---|---:|---:|---:|---:|
| Read public timeline | Allow | Allow | Allow | Allow |
| Read profiles | Deny | Own only | Own only | Own only |
| Read suggestion queue | Deny | Deny | Deny | Allow |
| Submit directly to Supabase | Deny | Deny | Deny | Deny |
| Submit through protected API | After checks | After checks | After checks | After checks |
| Save/delete content | Deny | Deny | Deny | Allow |
| Review suggestions | Deny | Deny | Deny | Allow |
| Promote own role | Deny | Deny | Deny | Deny |

### Manual staging test

- [ ] Sign in with a wrong password, fail Turnstile, fail MFA, complete MFA, sign out, and sign in again with an existing TOTP factor. Confirm all errors are useful but do not reveal whether an account exists.
- [ ] Using the publishable key only, attempt every RPC as anonymous and as a viewer. Direct suggestions and all writes must fail.
- [ ] Submit valid and malformed suggestions, an HTTP/credentialed URL, over four changes, rapid repeats, and a body over 64 KiB. Expect `201`, `400`, `403`, `413`, or `429` as appropriate without raw database details.
- [ ] Verify the Vercel rule affects only `POST /api/suggestions`, not `GET /`, Supabase reads, or `/admin`.
- [ ] Test phone width, desktop, keyboard-only navigation, focus, offline mode, backend downtime, empty data, and a `429` response.
- [ ] Run the load test from section 6 and save its result.

## 10. Backups, monitoring, and incidents

- [x] [operations-runbook.md](operations-runbook.md) documents RPO/RTO suggestions, disabling submissions without taking down reads, curator compromise, lost MFA, secret exposure, rollback, log redaction, restore drills, alerts, and quarterly review.
- [ ] Fill the ownership blanks and have the backup owner walk through the runbook.
- [ ] Confirm automated production backups are visible in **Database → Backups**.
- [ ] Perform a restore into a separate non-production project before launch, then quarterly. Record the chosen backup time, duration, row checks, application smoke result, and tester. Never restore a drill over production.
- [ ] If provider/project-loss recovery matters, keep a quarterly encrypted logical export outside Supabase with access limited to recovery owners. Remember that deleting a project deletes its associated backups and database backups do not restore separately deleted Storage objects.
- [ ] Configure and test the alerts from section 6. Subscribe both owners to [Supabase Status](https://status.supabase.com/) and [Vercel Status](https://www.vercel-status.com/).
- [ ] Schedule quarterly access, dependency, Advisor, retention, rate-limit, backup-restore, traffic/cost, and checklist reviews.

## 11. Final release sequence

Complete in order:

1. Create/harden staging, configure staging Auth/Turnstile, and apply migrations without seed.
2. Deploy a Vercel Preview with staging-only variables.
3. Complete every manual staging test, Advisor review, CSP review, and load test.
4. Create/harden production; configure backups, Auth, exact URLs, Turnstile, keys, and alerts.
5. Validate production variables with `npm run production:check`.
6. Dry-run and push reviewed migrations to production without seed.
7. Create/promote the real curator and enroll TOTP.
8. Set production Vercel variables, deploy, attach/verify the domain, and publish the WAF rule.
9. Run read-only public smoke checks, then one controlled curator edit and verification.
10. Monitor logs, `4xx/5xx`, Auth, rate limits, queue depth, and database load closely for 48 hours.

## Launch sign-off

- [ ] Staging and production are separate, and all section 1 blockers are closed.
- [ ] GitHub CI/CodeQL pass and branch/security settings are enabled.
- [ ] Hosted Supabase Auth, SSL, network, schema, Advisor, backup, and alert settings are complete.
- [ ] Production contains no local seed account or known development password.
- [ ] The authorization matrix and manual security tests pass in staging.
- [ ] Curator writes require the curator role plus `aal2` MFA.
- [ ] Suggestions cannot bypass Turnstile, server validation, durable limits, or WAF.
- [ ] CSP is enforced without unexplained violations on the real domain.
- [ ] A separate-project backup restore has succeeded.
- [ ] Ownership, privacy contact, incident response, monitoring, and rollback decision-maker are recorded.
- [ ] The first 48-hour monitoring window has named coverage.

## Primary references

- [Supabase production checklist](https://supabase.com/docs/guides/deployment/going-into-prod)
- [Supabase platform security](https://supabase.com/docs/guides/security/platform-security)
- [Supabase API security](https://supabase.com/docs/guides/api/securing-your-api)
- [Supabase MFA](https://supabase.com/docs/guides/auth/auth-mfa)
- [Supabase Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits)
- [Supabase backups](https://supabase.com/docs/guides/platform/backups)
- [Next.js CSP guide](https://nextjs.org/docs/app/guides/content-security-policy)
- [Vercel WAF custom rules](https://vercel.com/docs/vercel-firewall/vercel-waf/custom-rules)
- [Cloudflare Turnstile validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
