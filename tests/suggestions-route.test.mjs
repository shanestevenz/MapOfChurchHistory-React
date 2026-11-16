import assert from 'node:assert/strict'
import test from 'node:test'
import pg from 'pg'
import { POST } from '../app/api/suggestions/route.ts'

const originalFetch = globalThis.fetch
const originalQuery = pg.Pool.prototype.query
const originalEnv = { ...process.env }

const body = {
  eventId: 'pentecost',
  contributor: 'Reader',
  note: 'Clarifies the wording.',
  changes: [{ field: 'summary', after: 'A clearer summary.' }],
  source: null,
  turnstileToken: 'test-token',
}

const request = (value = body) => new Request('https://history.example/api/suggestions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: 'https://history.example' },
  body: JSON.stringify(value),
})

test.beforeEach(() => {
  process.env.TURNSTILE_SECRET_KEY = 'turnstile-test-secret'
  process.env.DATABASE_URL = 'postgres://test:test@localhost/test'
  process.env.RATE_LIMIT_SECRET = 'rate-limit-test-secret'
  process.env.VERCEL = '1'
})

test.afterEach(() => {
  pg.Pool.prototype.query = originalQuery
  globalThis.fetch = originalFetch
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) delete process.env[key]
  }
  Object.assign(process.env, originalEnv)
})

test('rejects a failed Turnstile verification before contacting Neon', async () => {
  let databaseCalls = 0
  pg.Pool.prototype.query = async () => {
    databaseCalls += 1
    throw new Error('Database should not be queried.')
  }
  globalThis.fetch = async () => Response.json({ success: false })
  const response = await POST(request())
  assert.equal(response.status, 403)
  assert.equal(databaseCalls, 0)
})

test('maps the durable database limit to 429 with Retry-After', async () => {
  pg.Pool.prototype.query = async () => {
    throw { code: 'P0001', message: 'suggestion_rate_limit_exceeded' }
  }
  globalThis.fetch = async () => Response.json({ success: true, action: 'suggestion' })
  const response = await POST(request())
  assert.equal(response.status, 429)
  assert.equal(response.headers.get('retry-after'), '86400')
})

test('returns 201 when CAPTCHA and the Neon insert succeed', async () => {
  const id = '11111111-2222-4333-8444-555555555555'
  pg.Pool.prototype.query = async () => ({ rows: [{ id }] })
  globalThis.fetch = async () => Response.json({ success: true, action: 'suggestion' })
  const response = await POST(request())
  assert.equal(response.status, 201)
  assert.deepEqual(await response.json(), { id })
})
