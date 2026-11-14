import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const failures = []
const required = (name) => {
  const value = process.env[name]?.trim()
  if (!value) failures.push(`${name} is missing.`)
  return value ?? ''
}
const validSecret = (name, value) => {
  if (value.length < 32 || /replace|example|local|change-me/i.test(value)) {
    failures.push(`${name} must be a unique random value of at least 32 characters.`)
  }
}

const databaseUrl = required('DATABASE_URL')
const directDatabaseUrl = process.env.DATABASE_URL_UNPOOLED?.trim()
const authUrl = required('BETTER_AUTH_URL')
const authSecret = required('BETTER_AUTH_SECRET')
required('NEXT_PUBLIC_TURNSTILE_SITE_KEY')
required('TURNSTILE_SECRET_KEY')
const rateLimitSecret = required('RATE_LIMIT_SECRET')
const cronSecret = required('CRON_SECRET')
const privacyEmail = required('NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL')

try {
  const url = new URL(databaseUrl)
  if (!url.hostname.endsWith('.neon.tech')) failures.push('DATABASE_URL must point to Neon Postgres.')
  if (!url.hostname.includes('-pooler')) failures.push('DATABASE_URL must use the Neon pooled endpoint for application requests.')
  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') failures.push('DATABASE_URL must use PostgreSQL.')
  if (url.searchParams.get('sslmode') !== 'require') failures.push('DATABASE_URL must require SSL.')
} catch {
  failures.push('DATABASE_URL is not a valid PostgreSQL URL.')
}

if (directDatabaseUrl) {
  try {
    const url = new URL(directDatabaseUrl)
    if (!url.hostname.endsWith('.neon.tech')) failures.push('DATABASE_URL_UNPOOLED must point to Neon Postgres.')
    if (url.hostname.includes('-pooler')) failures.push('DATABASE_URL_UNPOOLED must use the direct Neon endpoint.')
  } catch {
    failures.push('DATABASE_URL_UNPOOLED is not a valid PostgreSQL URL.')
  }
}

try {
  const url = new URL(authUrl)
  if (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
    failures.push('BETTER_AUTH_URL must be the HTTPS production app origin.')
  }
} catch {
  failures.push('BETTER_AUTH_URL is not a valid URL.')
}

validSecret('BETTER_AUTH_SECRET', authSecret)
validSecret('RATE_LIMIT_SECRET', rateLimitSecret)
validSecret('CRON_SECRET', cronSecret)
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(privacyEmail) || /example\.(com|org|net)$/i.test(privacyEmail)) {
  failures.push('NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL must be a real monitored inbox.')
}

const migrationDir = resolve('db/migrations')
for (const name of await readdir(migrationDir)) {
  if (!name.endsWith('.sql')) continue
  const sql = await readFile(resolve(migrationDir, name), 'utf8')
  if (/curator@localhost\.test|local-curator-change-me|insert\s+into\s+(auth\.)?"?user"?/i.test(sql)) {
    failures.push(`${name} contains local account or direct Auth seed data.`)
  }
}

const seed = await readFile(resolve('db/seed.sql'), 'utf8')
if (/curator@localhost\.test|local-curator-change-me|insert\s+into\s+(auth\.)?"?user"?/i.test(seed)) {
  failures.push('db/seed.sql contains user or direct Auth seed data.')
}

if (failures.length) {
  console.error('Production configuration check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exitCode = 1
} else {
  console.log('Production configuration check passed. No secret values were printed.')
}
