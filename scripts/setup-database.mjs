// One-shot database setup for any Neon branch (staging, preview, a fresh prod branch...).
//
//   npm run db:setup                              -> prompts for the connection string
//   npm run db:setup -- --reset                   -> prompts, then WIPES the app schema first
//                                                    (Neon Auth's neon_auth schema and its users are kept)
//   node scripts/setup-database.mjs "<url>"       -> uses the given connection string
//   add --yes to skip the confirmation prompt
//
// On Windows, pass a URL via `node ...` rather than `npm run db:setup -- "<url>"`:
// npm's cmd shim splits the command at the "&" that Neon URLs contain.
//
// Requires Neon Auth to be enabled on the branch (it owns the user table the app
// schema references). Runs app migrations -> seed, then checks that the
// timeline API's queries work. Create a curator afterwards with `npm run curator:create`. Pooled or direct URLs are both
// accepted; the direct (unpooled) host is used for setup, as Neon recommends.

import { spawnSync } from 'node:child_process'
import { createInterface } from 'node:readline/promises'
import pg from 'pg'

const args = process.argv.slice(2)
const reset = args.includes('--reset')
const skipConfirm = args.includes('--yes')
let rawUrl = args.find((arg) => !arg.startsWith('--'))

const rl = createInterface({ input: process.stdin, output: process.stdout })
if (!rawUrl) rawUrl = (await rl.question('Paste the Postgres connection string: ')).trim()
if (!rawUrl) fail('No connection string given.')

let url
try {
  url = new URL(rawUrl)
} catch {
  fail('That does not look like a valid connection string (postgresql://user:password@host/db).')
}
if (!['postgres:', 'postgresql:'].includes(url.protocol)) fail('The connection string must start with postgresql://')

// Use the direct host for migrations; PgBouncer (-pooler) can interfere with DDL.
url.hostname = url.hostname.replace('-pooler.', '.')
// pg already treats "require" as verify-full; say so explicitly to silence its warning.
if (['require', 'prefer', 'verify-ca'].includes(url.searchParams.get('sslmode'))) {
  url.searchParams.set('sslmode', 'verify-full')
}
const databaseUrl = url.toString()

console.log(`\nTarget: ${url.hostname} / database "${url.pathname.slice(1)}"`)
if (reset) console.log('Mode:   RESET - every table in the "public" schema (all timeline data and suggestions) will be deleted.')
if (!skipConfirm) {
  const answer = (await rl.question(reset ? 'Type "reset" to continue: ' : 'Continue? (y/N): ')).trim().toLowerCase()
  if (reset ? answer !== 'reset' : !['y', 'yes'].includes(answer)) fail('Cancelled.')
}
rl.close()

const client = new pg.Client({ connectionString: databaseUrl })
await client.connect()
try {
  const { rows: [neonAuth] } = await client.query(`select to_regclass('neon_auth."user"') is not null as enabled`)
  if (!neonAuth.enabled) {
    fail('Neon Auth is not enabled on this branch.\n'
      + 'Enable it in the Neon console (select the branch, then the Auth tab), then run this again.')
  }

  if (reset) {
    step('Wiping the public schema')
    await client.query('begin')
    // "auth" held the old self-hosted Better Auth tables; Neon Auth uses neon_auth.
    await client.query('drop schema if exists auth cascade')
    await client.query('drop schema if exists public cascade')
    await client.query('create schema public')
    await client.query('commit')
  } else {
    // A failed earlier run leaves objects behind without recording the migration,
    // and the next run then fails with "already exists". Catch that up front.
    const { rows } = await client.query(`
      select
        exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                where n.nspname = 'public' and t.typname = 'suggestion_status') as has_objects,
        to_regclass('public.schema_migrations') is not null as has_tracking
    `)
    let applied = false
    if (rows[0].has_tracking) {
      const result = await client.query('select 1 from public.schema_migrations limit 1')
      applied = result.rowCount > 0
    }
    if (rows[0].has_objects && !applied) {
      fail('This database contains a partial schema from an earlier failed setup.\n'
        + 'Re-run with --reset to wipe it and start clean.')
    }
  }
} finally {
  await client.end()
}

// Override both variables so nothing from .env.local can point the steps at another database.
const env = { ...process.env, DATABASE_URL: databaseUrl, DATABASE_URL_UNPOOLED: databaseUrl }
for (const [label, script] of [
  ['Applying app migrations', 'db:migrate'],
  ['Seeding timeline data', 'db:seed'],
]) {
  step(label)
  const result = spawnSync('npm', ['run', script, '--silent'], {
    stdio: 'inherit',
    env,
    shell: process.platform === 'win32',
  })
  if (result.status !== 0) fail(`"npm run ${script}" failed - see the output above.`)
}

step('Checking the timeline queries')
const check = new pg.Client({ connectionString: databaseUrl })
await check.connect()
try {
  for (const table of ['traditions', 'timeline_events', 'event_parents', 'timeline_groups']) {
    const { rows } = await check.query(`select count(*)::int as n from public.${table}`)
    console.log(`  ${table.padEnd(16)} ${rows[0].n} rows`)
  }
} finally {
  await check.end()
}
console.log('\nDone. The database is ready; no redeploy is needed.')
console.log('Next: create a curator account with `npm run curator:create`.')

function step(label) {
  console.log(`\n==> ${label}`)
}

function fail(message) {
  console.error(`\n${message}`)
  process.exit(1)
}
