// Creates (or promotes) a curator account in Neon Auth for one Neon branch.
//
//   npm run curator:create
//
// Prompts for everything it needs. Values can also come from the environment
// (DATABASE_URL_UNPOOLED / DATABASE_URL, NEON_AUTH_BASE_URL) or flags
// (--email, --name). The password is always prompted, never passed as a flag.
//
// How it works: signs the account up through the branch's Neon Auth URL (so the
// password is hashed by Neon Auth), then marks it verified and gives it the
// admin role in neon_auth."user". If the email already exists, it is promoted.
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

const databaseUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
  || await ask('Database connection string (the Neon branch): ')
const authBaseUrl = (process.env.NEON_AUTH_BASE_URL
  || await ask('Neon Auth URL for that branch (Neon console → Auth → Configuration): ')).replace(/\/+$/, '')
const email = (flag('email') || await ask('Curator email: ')).toLowerCase()
const name = flag('name') || await ask('Display name: ')
if (!databaseUrl || !authBaseUrl || !email || !name) fail('Database URL, Neon Auth URL, email and name are all required.')

let db
try {
  db = new URL(databaseUrl)
  new URL(authBaseUrl)
} catch {
  fail('The database URL or Neon Auth URL is not a valid URL.')
}
db.hostname = db.hostname.replace('-pooler.', '.')
if (['require', 'prefer', 'verify-ca'].includes(db.searchParams.get('sslmode'))) db.searchParams.set('sslmode', 'verify-full')

const client = new pg.Client({ connectionString: db.toString() })
await client.connect()
try {
  const hasNeonAuth = await client.query(`select to_regclass('neon_auth."user"') is not null as ok`)
  if (!hasNeonAuth.rows[0].ok) fail('Neon Auth is not enabled on this branch. Enable it in the Neon console (Auth tab) first.')

  const existing = await client.query('select id from neon_auth."user" where lower(email) = $1', [email])
  if (existing.rowCount) {
    console.log(`\n${email} already exists; promoting it to curator.`)
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
      const code = body.code || body.message || response.statusText
      const hint = /sign.?up/i.test(String(code))
        ? 'Sign-ups are disabled for this branch. Turn them on in Neon (Auth → Settings) while you run this, then off again.'
        : /origin/i.test(String(code))
          ? `Neon Auth rejected the origin ${origin}. Enable "allow localhost" for the branch, or pass --origin with a trusted domain.`
          : 'Check that the Neon Auth URL belongs to the same branch as the database URL.'
      fail(`Neon Auth refused the sign-up (${response.status} ${code}).\n${hint}`)
    }
  }

  const { rowCount } = await client.query(
    `update neon_auth."user" set role = 'admin', "emailVerified" = true, "updatedAt" = now() where lower(email) = $1`,
    [email],
  )
  if (!rowCount) fail('The account was not found after sign-up. Check that both URLs point at the same Neon branch.')
  console.log(`\n${email} is now a curator on ${db.hostname}. Sign in at /admin.`)
} finally {
  await client.end()
  rl.close()
}
