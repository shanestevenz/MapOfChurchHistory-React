import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { execFileSync, execSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

const readLocalSecret = () => {
  if (process.env.SUPABASE_SECRET_KEY && !process.env.SUPABASE_SECRET_KEY.startsWith('replace-')) {
    return process.env.SUPABASE_SECRET_KEY
  }
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx'
  const options = { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
  const output = process.platform === 'win32'
    ? execSync('npx.cmd supabase status --output json', options)
    : execFileSync(command, ['supabase', 'status', '--output', 'json'], options)
  const status = JSON.parse(output)
  return status.SECRET_KEY ?? status.SERVICE_ROLE_KEY
}

const decodeBase32 = (value) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const character of value.replaceAll('=', '').toUpperCase()) {
    const index = alphabet.indexOf(character)
    assert.notEqual(index, -1, 'TOTP secret must be valid base32')
    bits += index.toString(2).padStart(5, '0')
  }
  const bytes = []
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) {
    bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2))
  }
  return Buffer.from(bytes)
}

const totp = (secret) => {
  const counter = Math.floor(Date.now() / 30_000)
  const buffer = Buffer.alloc(8)
  buffer.writeBigUInt64BE(BigInt(counter))
  const digest = createHmac('sha1', decodeBase32(secret)).update(buffer).digest()
  const offset = digest[digest.length - 1] & 0x0f
  const code =
    (((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff)) %
    1_000_000
  return String(code).padStart(6, '0')
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:55321'
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
const secretKey = readLocalSecret()
assert(secretKey, 'Local Supabase secret key is required')

const anonymous = createClient(url, key, { auth: { persistSession: false } })
const server = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { data: events, error: readError } = await anonymous.from('timeline_events').select('id')
assert.ifError(readError)
assert.equal(events.length, 56, 'anonymous users should see all seeded events')

const { error: deniedInsert } = await anonymous.from('timeline_events').insert({
  id: 'forbidden-direct-insert', year: 2026, date_label: '2026', title: 'Forbidden',
  tradition_id: 'undivided', kind: 'event', icon: { type: 'lucide', name: 'Shield' },
  summary: 'This direct anonymous insert must be rejected.', detail: '',
})
assert(deniedInsert, 'table privileges should reject anonymous event inserts')

const deniedAnonymousCalls = await Promise.all([
  anonymous.rpc('save_timeline_event', { event_data: {}, parent_ids: [] }),
  anonymous.rpc('delete_timeline_event', { target_id: 'pentecost' }),
  anonymous.rpc('save_timeline_group', { group_data: {} }),
  anonymous.rpc('delete_timeline_group', { target_id: 'paul-life-and-journeys' }),
  anonymous.rpc('review_edit_suggestion', {
    suggestion_id: '00000000-0000-0000-0000-000000000000', decision: 'declined',
  }),
  anonymous.rpc('submit_edit_suggestion', {
    suggestion_data: {}, changes_data: [], rate_limit_key: 'a'.repeat(64),
  }),
])
assert(deniedAnonymousCalls.every(({ error }) => error), 'anonymous users must be denied every write RPC')

const { data: suggestionId, error: suggestionError } = await server.rpc('submit_edit_suggestion', {
  suggestion_data: {
    event_id: 'pentecost', contributor: 'Smoke test', note: 'Verifies protected submissions.', source: null,
  },
  changes_data: [{ field: 'summary', after: 'Smoke-test replacement text.' }],
  rate_limit_key: 'b'.repeat(64),
})
assert.ifError(suggestionError)
assert.match(suggestionId, /^[0-9a-f-]{36}$/)

const viewerEmail = `viewer-${Date.now()}@localhost.test`
const viewerPassword = 'Local-viewer-password-123!'
const { data: createdViewer, error: createViewerError } = await server.auth.admin.createUser({
  email: viewerEmail,
  password: viewerPassword,
  email_confirm: true,
})
assert.ifError(createViewerError)
assert(createdViewer.user)

const viewer = createClient(url, key, { auth: { persistSession: false } })
const { error: viewerSignInError } = await viewer.auth.signInWithPassword({
  email: viewerEmail,
  password: viewerPassword,
})
assert.ifError(viewerSignInError)
const { data: viewerSuggestions, error: viewerQueueError } = await viewer.from('edit_suggestions').select('id')
assert.ifError(viewerQueueError)
assert.equal(viewerSuggestions.length, 0, 'viewers must not see the suggestion queue')
const { error: promoteError } = await viewer
  .from('profiles')
  .update({ role: 'curator' })
  .eq('id', createdViewer.user.id)
assert(promoteError, 'viewers must not promote their own role')
const { error: viewerSaveError } = await viewer.rpc('save_timeline_event', {
  event_data: {}, parent_ids: [],
})
assert(viewerSaveError, 'viewers must not call curator write functions')
await viewer.auth.signOut()

const curator = createClient(url, key, { auth: { persistSession: false } })
const { data: auth, error: authError } = await curator.auth.signInWithPassword({
  email: 'curator@localhost.test', password: 'local-curator-change-me',
})
assert.ifError(authError)
assert(auth.user)

const { data: profile, error: profileError } = await curator.from('profiles').select('role').single()
assert.ifError(profileError)
assert.equal(profile.role, 'curator')

const { error: aal1SaveError } = await curator.rpc('save_timeline_event', {
  event_data: {}, parent_ids: [],
})
assert(aal1SaveError, 'a password-only curator session must not write')

const { data: enrollment, error: enrollmentError } = await curator.auth.mfa.enroll({
  factorType: 'totp',
  friendlyName: 'Automated smoke test',
})
assert.ifError(enrollmentError)
const { data: challenge, error: challengeError } = await curator.auth.mfa.challenge({
  factorId: enrollment.id,
})
assert.ifError(challengeError)
const { error: verifyError } = await curator.auth.mfa.verify({
  factorId: enrollment.id,
  challengeId: challenge.id,
  code: totp(enrollment.totp.secret),
})
assert.ifError(verifyError)

const { data: assurance, error: assuranceError } = await curator.auth.mfa.getAuthenticatorAssuranceLevel()
assert.ifError(assuranceError)
assert.equal(assurance.currentLevel, 'aal2')

const { error: saveError } = await curator.rpc('save_timeline_event', {
  event_data: {
    id: 'smoke-test-event', year: 2026, date_label: '2026', title: 'Backend smoke test',
    tradition_id: 'undivided', kind: 'event', icon: { type: 'lucide', name: 'TestTube' },
    summary: 'Temporary test event.', detail: '', key_figures: [], links: [], group_id: null,
  },
  parent_ids: ['pentecost'],
})
assert.ifError(saveError)

const { data: saved, error: savedError } = await curator
  .from('timeline_events')
  .select('title')
  .eq('id', 'smoke-test-event')
  .single()
assert.ifError(savedError)
assert.equal(saved.title, 'Backend smoke test')

const { error: reviewError } = await curator.rpc('review_edit_suggestion', {
  suggestion_id: suggestionId,
  decision: 'declined',
})
assert.ifError(reviewError)
const { error: deleteError } = await curator.rpc('delete_timeline_event', {
  target_id: 'smoke-test-event',
})
assert.ifError(deleteError)

const { error: unenrollError } = await curator.auth.mfa.unenroll({ factorId: enrollment.id })
assert.ifError(unenrollError)
await curator.auth.signOut()
const { error: deleteViewerError } = await server.auth.admin.deleteUser(createdViewer.user.id)
assert.ifError(deleteViewerError)

console.log('Supabase smoke test passed: least-privilege grants, RLS denials, server-only suggestions, viewer isolation, curator MFA, CRUD, and review workflow.')
