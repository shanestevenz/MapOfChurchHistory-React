export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin) return process.env.NODE_ENV !== 'production'
  try {
    return new URL(origin).host === new URL(request.url).host
  } catch {
    return false
  }
}

export function getClientIp(request: Request) {
  const header = process.env.VERCEL
    ? request.headers.get('x-vercel-forwarded-for')
    : request.headers.get('x-forwarded-for')
  return header?.split(',')[0]?.trim() || 'local-development'
}

export async function verifyTurnstile(token: string, ip: string, action: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return process.env.NODE_ENV !== 'production'

  const body = new URLSearchParams({ secret, response: token, remoteip: ip })
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
    signal: AbortSignal.timeout(5_000),
    cache: 'no-store',
  })
  if (!response.ok) return false
  const result = await response.json() as { success?: boolean; action?: string }
  return result.success === true && result.action === action
}
