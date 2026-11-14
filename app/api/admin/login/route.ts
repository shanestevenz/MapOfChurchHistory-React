import { toNextJsHandler } from 'better-auth/next-js'
import { auth } from '@/lib/auth/server'
import { authIsConfigured } from '@/lib/db'
import { getClientIp, sameOrigin, verifyTurnstile } from '@/lib/http-security'

export const runtime = 'nodejs'

const authPost = toNextJsHandler(auth).POST

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Request origin is not allowed.' }, { status: 403 })
  if (!authIsConfigured()) return Response.json({ error: 'Sign-in is not configured.' }, { status: 503 })
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return Response.json({ error: 'Content-Type must be application/json.' }, { status: 415 })
  }
  if (Number(request.headers.get('content-length') || 0) > 8_192) {
    return Response.json({ error: 'The sign-in request is too large.' }, { status: 413 })
  }

  let rawBody: string
  try {
    rawBody = await request.text()
  } catch {
    return Response.json({ error: 'The sign-in request is invalid.' }, { status: 400 })
  }
  if (new TextEncoder().encode(rawBody).byteLength > 8_192) {
    return Response.json({ error: 'The sign-in request is too large.' }, { status: 413 })
  }

  let body: unknown
  try {
    body = JSON.parse(rawBody)
  } catch {
    return Response.json({ error: 'The sign-in request is invalid.' }, { status: 400 })
  }
  if (!body || typeof body !== 'object') return Response.json({ error: 'The sign-in request is invalid.' }, { status: 400 })
  const input = body as Record<string, unknown>
  if (typeof input.email !== 'string' || typeof input.password !== 'string') {
    return Response.json({ error: 'Email and password are required.' }, { status: 400 })
  }
  if (input.email.length > 320 || input.password.length > 1024
    || (typeof input.turnstileToken === 'string' && input.turnstileToken.length > 4_096)) {
    return Response.json({ error: 'The sign-in request is invalid.' }, { status: 400 })
  }

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const requireTurnstile = process.env.NODE_ENV === 'production' || Boolean(process.env.TURNSTILE_SECRET_KEY)
  if (process.env.NODE_ENV === 'production' && !siteKey) {
    return Response.json({ error: 'Sign-in is not configured.' }, { status: 503 })
  }
  if (requireTurnstile) {
    if (typeof input.turnstileToken !== 'string' || !input.turnstileToken) {
      return Response.json({ error: 'Complete the security check and try again.' }, { status: 400 })
    }
    try {
      if (!(await verifyTurnstile(input.turnstileToken, getClientIp(request), 'admin-signin'))) {
        return Response.json({ error: 'The security check failed. Please try again.' }, { status: 403 })
      }
    } catch {
      return Response.json({ error: 'The security check is temporarily unavailable.' }, { status: 503 })
    }
  }

  const headers = new Headers(request.headers)
  headers.delete('content-length')
  headers.set('content-type', 'application/json')
  const authRequest = new Request(new URL('/api/auth/sign-in/email', request.url), {
    method: 'POST',
    headers,
    body: JSON.stringify({ email: input.email, password: input.password }),
  })
  try {
    return await authPost(authRequest)
  } catch (error) {
    console.error('Curator sign-in failed', { code: (error as { code?: string }).code })
    return Response.json({ error: 'Sign-in could not be completed. Check your credentials and try again.' }, { status: 401 })
  }
}
