import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const failures = []
const required = (name) => {
  const value = process.env[name]?.trim()
  if (!value) failures.push(`${name} is missing.`)
  return value ?? ''
}

const supabaseUrl = required('NEXT_PUBLIC_SUPABASE_URL')
const publishableKey = required('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
const secretKey = required('SUPABASE_SECRET_KEY')
required('NEXT_PUBLIC_TURNSTILE_SITE_KEY')
required('TURNSTILE_SECRET_KEY')
const rateLimitSecret = required('RATE_LIMIT_SECRET')
const privacyEmail = required('NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL')

try {
  const url = new URL(supabaseUrl)
  if (url.protocol !== 'https:') failures.push('NEXT_PUBLIC_SUPABASE_URL must use HTTPS.')
  if (['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
    failures.push('NEXT_PUBLIC_SUPABASE_URL must not point to the local Supabase stack.')
  }
} catch {
  failures.push('NEXT_PUBLIC_SUPABASE_URL is not a valid URL.')
}

if (!publishableKey.startsWith('sb_publishable_')) {
  failures.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must use a new sb_publishable_ key.')
}
if (!secretKey.startsWith('sb_secret_')) {
  failures.push('SUPABASE_SECRET_KEY must use a new sb_secret_ key.')
}
if (rateLimitSecret.length < 32 || /replace|example|local|change-me/i.test(rateLimitSecret)) {
  failures.push('RATE_LIMIT_SECRET must be a unique random value of at least 32 characters.')
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(privacyEmail) || /example\.(com|org|net)$/i.test(privacyEmail)) {
  failures.push('NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL must be a real monitored inbox.')
}

const migrationDir = resolve('supabase/migrations')
for (const name of await readdir(migrationDir)) {
  if (!name.endsWith('.sql')) continue
  const sql = await readFile(resolve(migrationDir, name), 'utf8')
  if (/curator@localhost\.test|local-curator-change-me|insert\s+into\s+auth\.(users|identities)/i.test(sql)) {
    failures.push(`${name} contains local account or direct Auth seed data.`)
  }
}

const productionContent = await readFile(resolve('supabase/production-content.sql'), 'utf8')
if (/curator@localhost\.test|local-curator-change-me|insert\s+into\s+auth\.(users|identities)/i.test(productionContent)) {
  failures.push('supabase/production-content.sql contains local account or direct Auth seed data.')
}

if (failures.length) {
  console.error('Production configuration check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exitCode = 1
} else {
  console.log('Production configuration check passed. No secret values were printed.')
}
