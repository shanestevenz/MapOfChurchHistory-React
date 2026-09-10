import { createHmac } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import {
  MAX_SUGGESTION_BODY_BYTES,
  validateSuggestionSubmission,
} from '../../../lib/suggestion-validation.ts'
import type { Database, Json } from '../../../lib/supabase/database.types'

export const runtime = 'nodejs'

const json = (body: { error: string } | { id: string }, status: number, headers?: HeadersInit) =>
  Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', ...headers },
  })

function sameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin) return process.env.NODE_ENV !== 'production'
  try {
    return new URL(origin).host === new URL(request.url).host
  } catch {
    return false
  }
}

function getClientIp(request: Request) {
  const header = process.env.VERCEL
    ? request.headers.get('x-vercel-forwarded-for')
    : request.headers.get('x-forwarded-for')
  return header?.split(',')[0]?.trim() || 'local-development'
}

async function verifyTurnstile(token: string, ip: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return process.env.NODE_ENV !== 'production'

  const body = new URLSearchParams({ secret, response: token, remoteip: ip })
  const response = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(5_000),
      cache: 'no-store',
    },
  )
  if (!response.ok) return false
  const result = (await response.json()) as { success?: boolean; action?: string }
  return result.success === true && result.action === 'suggestion'
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: 'Request origin is not allowed.' }, 403)
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return json({ error: 'Content-Type must be application/json.' }, 415)
  }

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

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY
  const rateLimitSecret = process.env.RATE_LIMIT_SECRET
  if (!url || !secretKey || (!rateLimitSecret && process.env.NODE_ENV === 'production')) {
    return json({ error: 'Suggestion service is not configured.' }, 503)
  }

  const ip = getClientIp(request)
  let captchaPassed = false
  try {
    captchaPassed = await verifyTurnstile(validated.value.turnstileToken, ip)
  } catch {
    return json({ error: 'The security check is temporarily unavailable.' }, 503)
  }
  if (!captchaPassed) return json({ error: 'The security check failed. Please try again.' }, 403)

  const rateLimitKey = createHmac(
    'sha256',
    rateLimitSecret || 'local-development-only',
  )
    .update(ip)
    .digest('hex')

  const supabase = createClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await supabase.rpc('submit_edit_suggestion', {
    suggestion_data: {
      event_id: validated.value.eventId,
      contributor: validated.value.contributor,
      note: validated.value.note,
      source: validated.value.source,
    } as unknown as Json,
    changes_data: validated.value.changes as unknown as Json,
    rate_limit_key: rateLimitKey,
  })

  if (error) {
    if (error.message.includes('suggestion_rate_limit_exceeded')) {
      return json({ error: 'Too many suggestions. Please try again tomorrow.' }, 429, {
        'Retry-After': '86400',
      })
    }
    if (error.message.includes('suggestion_queue_full')) {
      return json({ error: 'The review queue is full. Please try again later.' }, 429, {
        'Retry-After': '3600',
      })
    }
    console.error('Suggestion RPC failed', { code: error.code })
    return json({ error: 'The suggestion could not be saved.' }, 500)
  }

  return json({ id: data }, 201)
}
