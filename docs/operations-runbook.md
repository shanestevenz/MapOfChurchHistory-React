# Operations and Incident Runbook

Last reviewed: 2026-09-08

This is the emergency guide for Map of Church History. Fill in the blanks before launch and keep a copy somewhere accessible if GitHub is unavailable.

## Owners and recovery targets

| Responsibility | Primary | Backup |
|---|---|---|
| Vercel deployment and rollback | `FILL IN` | `FILL IN` |
| Supabase migrations and restore | `FILL IN` | `FILL IN` |
| Curator promotion/demotion | `FILL IN` | `FILL IN` |
| Secret rotation | `FILL IN` | `FILL IN` |
| Public incident updates | `FILL IN` | `FILL IN` |

Recommended starting objectives for this low-change site:

- RPO (maximum data loss): 24 hours.
- RTO (maximum downtime): 4 hours.
- Emergency contact: `FILL IN`.
- Privacy contact: set `NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL` to a monitored inbox.

If losing up to 24 hours of curator edits is unacceptable, enable Supabase Point-in-Time Recovery and choose a smaller RPO.

## First response to any incident

1. Record the time, symptoms, and person leading the response. Do not paste secrets or visitor data into the notes.
2. Stop the damage. Disable suggestions, demote a compromised curator, or roll back Vercel as appropriate.
3. Preserve relevant Vercel and Supabase logs before their retention window expires.
4. Rotate exposed credentials and revoke affected sessions.
5. Restore service, verify public reads and one controlled curator action, then monitor closely.
6. Document impact, root cause, and follow-up work. Never include passwords, cookies, authorization headers, CAPTCHA tokens, secret keys, raw IPs, or full suggestion bodies.

## Disable suggestions without taking down the timeline

1. In Vercel, open the project, then **Firewall** and create a rule matching method `POST` and path `/api/suggestions`.
2. Set the action to **Deny**, publish the rule, and test that the form fails while the public timeline still loads.
3. Add a temporary public notice if the outage will be long.
4. After correcting the cause, change the rule back to the normal rate limit and test with Turnstile.

Do not delete `SUPABASE_SECRET_KEY` as the first response; changing an environment variable requires a redeployment and can complicate recovery.

## Compromised curator account

1. In Supabase Dashboard, open **Authentication → Users**, select the account, and ban or sign it out.
2. In **SQL Editor**, demote it immediately:

```sql
update public.profiles
set role = 'viewer'
where id = 'PASTE-AUTH-USER-UUID-HERE';
```

3. Review Auth logs, Postgres logs, recently updated events/groups, and reviewed suggestions for the incident window.
4. Reset the password. Remove and re-enroll MFA only after confirming identity through a pre-agreed second channel.
5. Promote again only after the device and email are secure. Verify `aal1` writes fail and `aal2` writes succeed.

## Lost authenticator recovery

Normal sign-in has no MFA bypass. A Supabase organization owner must verify the curator outside email alone, then use that Auth user's MFA controls to remove the lost TOTP factor. If the dashboard does not expose that control, use a short-lived server-side admin script following Supabase's Admin MFA `deleteFactor` documentation. Never put the secret key in a browser console. The curator then visits `/admin`, enrolls again, and confirms an `aal2` session before regaining the curator role.

## Exposed secret

1. Identify whether it is a Supabase secret key, database password, Turnstile secret, Vercel token, or account credential.
2. Rotate it at the provider immediately. Treat a committed secret as exposed even if the commit was deleted.
3. Update only the appropriate Vercel environment, redeploy, and test.
4. Revoke the old credential, examine logs for abuse, and enable/confirm GitHub secret scanning.
5. Record the rotation date and owner, never the value.

## Outage and rollback

1. Check the Supabase and Vercel status pages before changing the application.
2. If a frontend release caused it, promote the last known-good Vercel deployment.
3. If a migration caused it, never run `db reset` and do not edit a deployed migration. Create a reviewed forward-fix migration. Restore to a separate project first if data repair is uncertain.
4. Keep the site read-only while write safety is unclear. The suggestion endpoint can remain denied while public reads continue.

## Backups and restore drill

For the recommended 24-hour RPO, use a paid Supabase plan with daily backups. Once per quarter:

1. Create a separate temporary Supabase project; never restore a drill over production.
2. Restore/download a backup using **Database → Backups** and the project plan's displayed instructions.
3. Apply any later migrations to the temporary project.
4. Point local or staging at the restored project. Confirm event counts, several parent links, public reads, curator MFA, and one isolated create/delete test.
5. Record the backup timestamp, restore duration, result, tester, and missing data. Delete the temporary project only after recording the evidence.

Keep a quarterly encrypted logical export outside the production project if recovery from project deletion matters. Restrict it to the two recovery owners. Database backups do not restore separately deleted Storage objects.

## Alerts and quarterly maintenance

Alert on Vercel `5xx`, elevated `4xx`/`429`, function failures, Supabase Auth failures, database CPU/memory/connections/disk, egress, pending suggestions, and backup failures. Subscribe both owners to Supabase and Vercel status notifications.

Every quarter: perform a restore drill; review access; run Supabase Advisors; run all repository checks; and review rate limits, retention, traffic/cost, dependencies, and this runbook.
