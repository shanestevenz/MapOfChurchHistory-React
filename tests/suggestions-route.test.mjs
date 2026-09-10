import assert from 'node:assert/strict'
import test from 'node:test'
import { POST } from '../app/api/suggestions/route.ts'

const originalFetch = globalThis.fetch
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
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_test'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'
  process.env.RATE_LIMIT_SECRET = 'rate-limit-test-secret'
  process.env.VERCEL = '1'
})

test.afterEach(() => {
  globalThis.fetch = originalFetch
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) delete process.env[key]
  }
  Object.assign(process.env, originalEnv)
})

test('rejects a failed Turnstile verification before contacting Supabase', async () => {
  let calls = 0
  globalThis.fetch = async () => {
    calls += 1
    return Response.json({ success: false })
  }
  const response = await POST(request())
  assert.equal(response.status, 403)
  assert.equal(calls, 1)
})

test('maps the durable database limit to 429 with Retry-After', async () => {
  globalThis.fetch = async (input) => {
    const url = typeof input === 'string' ? input : input.url
    if (url.includes('challenges.cloudflare.com')) {
      return Response.json({ success: true, action: 'suggestion' })
    }
    return Response.json(
      { code: 'P0001', message: 'suggestion_rate_limit_exceeded', details: null, hint: null },
      { status: 400 },
    )
  }
  const response = await POST(request())
  assert.equal(response.status, 429)
  assert.equal(response.headers.get('retry-after'), '86400')
})

test('returns 201 when CAPTCHA and the database submission succeed', async () => {
  const id = '11111111-2222-4333-8444-555555555555'
  globalThis.fetch = async (input) => {
    const url = typeof input === 'string' ? input : input.url
    if (url.includes('challenges.cloudflare.com')) {
      return Response.json({ success: true, action: 'suggestion' })
    }
    return Response.json(id)
  }
  const response = await POST(request())
  assert.equal(response.status, 201)
  assert.deepEqual(await response.json(), { id })
})
