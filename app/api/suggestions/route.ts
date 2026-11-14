import { createHmac } from 'node:crypto'
import { pool, databaseIsConfigured } from '@/lib/db'
import {
  MAX_SUGGESTION_BODY_BYTES,
  validateSuggestionSubmission,
} from '@/lib/suggestion-validation'
import { getClientIp, sameOrigin, verifyTurnstile } from '@/lib/http-security'

export const runtime = 'nodejs'

const json = (body: { error: string } | { id: string }, status: number, headers?: HeadersInit) =>
  Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', ...headers },
  })

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: 'Request origin is not allowed.' }, 403)
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return json({ error: 'Content-Type must be application/json.' }, 415)
  }
  if (!databaseIsConfigured()) return json({ error: 'Suggestion service is not configured.' }, 503)

  const declaredLength = Number(request.headers.get('content-length') || 0)
  if (declaredLength > MAX_SUGGESTION_BODY_BYTES) {
    return json({ error: 'The submission is too large.' }, 413)
  }

  let rawBody: string
  try {
    rawBody = await request.text()
  } catch {
    return json({ error: 'The request body could not be read.' }, 400)
  }
  if (new TextEncoder().encode(rawBody).byteLength > MAX_SUGGESTION_BODY_BYTES) {
    return json({ error: 'The submission is too large.' }, 413)
  }

  let input: unknown
  try {
    input = JSON.parse(rawBody)
  } catch {
    return json({ error: 'The request body is not valid JSON.' }, 400)
  }

  const requireTurnstile = process.env.NODE_ENV === 'production' || Boolean(process.env.TURNSTILE_SECRET_KEY)
  const validated = validateSuggestionSubmission(input, { requireTurnstile })
  if (!validated.ok) return json({ error: validated.error }, 400)

  const rateLimitSecret = process.env.RATE_LIMIT_SECRET
  if (!rateLimitSecret && process.env.NODE_ENV === 'production') {
    return json({ error: 'Suggestion service is not configured.' }, 503)
  }

  const ip = getClientIp(request)
  let captchaPassed = false
  try {
    captchaPassed = await verifyTurnstile(validated.value.turnstileToken, ip, 'suggestion')
  } catch {
    return json({ error: 'The security check is temporarily unavailable.' }, 503)
  }
  if (!captchaPassed) return json({ error: 'The security check failed. Please try again.' }, 403)

  const rateLimitKey = createHmac('sha256', rateLimitSecret || 'local-development-only')
    .update(ip)
    .digest('hex')

  try {
    const suggestion = {
      event_id: validated.value.eventId,
      contributor: validated.value.contributor,
      note: validated.value.note,
      source: validated.value.source,
    }
    const changes = validated.value.changes.map(({ field, after }) => ({ field, after }))
    const { rows } = await pool.query<{ id: string }>(
      'select public.submit_edit_suggestion($1::jsonb, $2::jsonb, $3::text) as id',
      [JSON.stringify(suggestion), JSON.stringify(changes), rateLimitKey],
    )
    return json({ id: rows[0].id }, 201)
  } catch (error) {
    const pgError = error as { code?: string; message?: string }
    const message = pgError.message ?? ''
    if (message.includes('suggestion_rate_limit_exceeded')) {
      return json({ error: 'Too many suggestions. Please try again tomorrow.' }, 429, {
        'Retry-After': '86400',
      })
    }
    if (message.includes('suggestion_queue_full')) {
      return json({ error: 'The review queue is full. Please try again later.' }, 429, {
        'Retry-After': '3600',
      })
    }
    console.error('Suggestion insert failed', { code: pgError.code })
    return json({ error: 'The suggestion could not be saved.' }, 500)
  }
}
