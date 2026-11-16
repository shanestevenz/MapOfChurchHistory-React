// Creates (or promotes) a curator account in Neon Auth for one Neon branch.
//
//   npm run curator:create         -> prompts for everything
//   npm run curator:create:local   -> reads .env.local (local dev)
//
// Inputs (prompted when missing):
//   NEON_AUTH_BASE_URL        the branch's Auth URL (Neon console -> Auth -> Configuration)
//   NEON_BRANCH_DATABASE_URL  that branch's connection string (falls back to DATABASE_URL
//                             when it points at Neon)
//   --email, --name           flags; the password is always prompted, never a flag
//
// Steps: signs the account up through Neon Auth (Neon hashes the password), then marks
// it verified and gives it the admin role. All Neon traffic is HTTPS (Neon Auth + Neon's
// SQL-over-HTTP endpoint), so it works on networks that block Postgres port 5432.
// If DATABASE_URL is a local Postgres, the account is also mirrored into the local
// neon_auth."user" stand-in, which the database's curator checks read.
import { createInterface } from 'node:readline'
import pg from 'pg'

const flag = (name) => {
  const index = process.argv.indexOf(`--${name}`)
  return index > -1 ? process.argv[index + 1] : undefined
}

const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
let muted = false
rl._writeToOutput = (text) => { if (!muted || text.includes('\n')) process.stdout.write(muted ? '\n' : text) }
const ask = (question) => new Promise((resolve) => rl.question(question, (answer) => resolve(answer.trim())))
const askHidden = async (question) => {
  process.stdout.write(question)
  muted = true
  const answer = await ask('')
  muted = false
  return answer
}
const fail = (message) => {
  console.error(`\n${message}`)
  rl.close()
  process.exit(1)
}

const isLocalHost = (url) => ['localhost', '127.0.0.1', '::1', 'postgres', 'db'].includes(url.hostname.replace(/^\[|\]$/g, ''))
const parse = (value) => { try { return new URL(value) } catch { return null } }

// --- Inputs -----------------------------------------------------------------
const appDb = process.env.DATABASE_URL ? parse(process.env.DATABASE_URL) : null
const localDb = appDb && isLocalHost(appDb) ? appDb : null

let neonDbValue = process.env.NEON_BRANCH_DATABASE_URL
  || (appDb && !localDb ? process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL : '')
if (!neonDbValue) neonDbValue = await ask('Neon branch connection string: ')
const neonDb = parse(neonDbValue)
if (!neonDb || !neonDb.hostname.endsWith('.neon.tech')) fail('The Neon branch connection string is not a valid Neon URL.')
neonDb.hostname = neonDb.hostname.replace('-pooler.', '.')

const authValue = process.env.NEON_AUTH_BASE_URL
  || await ask('Neon Auth URL for that branch (Neon console -> Auth -> Configuration): ')
const authUrl = parse(authValue.replace(/\/+$/, ''))
if (!authUrl) fail('The Neon Auth URL is not a valid URL.')
const authBaseUrl = authUrl.toString().replace(/\/+$/, '')

console.log(`\nNeon branch: ${neonDb.hostname}\nNeon Auth:   ${authUrl.hostname}`)
if (localDb) console.log(`Local copy:  ${localDb.host}${localDb.pathname}`)
if (neonDb.hostname.split('.')[0] !== authUrl.hostname.split('.')[0]) {
  console.log('Warning: the database and Neon Auth URLs look like different branches.')
}

const email = (flag('email') || await ask('\nCurator email: ')).toLowerCase()
const name = flag('name') || await ask('Display name: ')
if (!email || !name) fail('Email and name are required.')

// --- Neon SQL over HTTPS ----------------------------------------------------
async function neonSql(query, params = []) {
  const response = await fetch(`https://${neonDb.hostname}/sql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Neon-Connection-String': neonDb.toString() },
    body: JSON.stringify({ query, params }),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.message || `Neon SQL request failed (${response.status})`)
  return body.rows
}

try {
  const [{ enabled }] = await neonSql(`select to_regclass('neon_auth."user"') is not null as enabled`)
  if (!enabled) fail('Neon Auth is not enabled on this branch. Enable it in the Neon console (Auth tab) first.')

  const existing = await neonSql('select id from neon_auth."user" where lower(email) = $1', [email])
  if (existing.length) {
    console.log(`\n${email} already exists on Neon; promoting it to curator.`)
  } else {
    const password = await askHidden('Password (min 8 characters, hidden): ')
    const confirm = await askHidden('Repeat password: ')
    if (password !== confirm) fail('The passwords do not match.')
    if (password.length < 8) fail('The password must be at least 8 characters.')

    // Neon Auth allows localhost origins by default, so a local script can sign up.
    const origin = flag('origin') || 'http://localhost:3000'
    const response = await fetch(`${authBaseUrl}/sign-up/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin },
      body: JSON.stringify({ email, password, name }),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      const code = String(body.code || body.message || response.statusText)
      const hint = /sign.?up/i.test(code)
        ? 'Sign-ups are disabled for this branch. Turn them on in Neon (Auth -> Settings) while you run this, then off again.'
        : /origin/i.test(code)
          ? `Neon Auth rejected the origin ${origin}. Enable "allow localhost" for the branch, or pass --origin with a trusted domain.`
          : 'Check that the Neon Auth URL belongs to the same branch as the connection string.'
      fail(`Neon Auth refused the sign-up (${response.status} ${code}).\n${hint}`)
    }
  }

  const promoted = await neonSql(
    `update neon_auth."user" set role = 'admin', "emailVerified" = true, "updatedAt" = now()
     where lower(email) = $1 returning id, name, email`,
    [email],
  )
  if (!promoted.length) fail('The account was not found after sign-up. Check that both URLs point at the same Neon branch.')
  const user = promoted[0]
  console.log(`\n${email} is a curator in Neon Auth (${neonDb.hostname.split('.')[0]}).`)

  if (localDb) {
    const client = new pg.Client({ connectionString: localDb.toString() })
    await client.connect()
    try {
      const { rows: [stub] } = await client.query(`select to_regclass('neon_auth."user"') is not null as ok`)
      if (!stub.ok) fail('The local database has no neon_auth."user" table. Run `npm run db:local-auth-stub` and `npm run db:migrate` first.')
      await client.query(`
        insert into neon_auth."user"(id, name, email, "emailVerified", role, "createdAt", "updatedAt")
        values ($1, $2, $3, true, 'admin', now(), now())
        on conflict (id) do update set name = excluded.name, email = excluded.email, role = 'admin', "updatedAt" = now()
      `, [user.id, user.name, user.email])
      console.log(`Mirrored into the local database so curator edits are allowed there.`)
    } finally {
      await client.end()
    }
  }
  console.log('\nSign in at /admin.')
} catch (error) {
  fail(`Failed: ${error.message}`)
} finally {
  rl.close()
}
