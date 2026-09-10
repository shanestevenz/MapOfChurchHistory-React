import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/supabase/database.types'

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const isDevelopment = process.env.NODE_ENV === 'development'
  let supabaseOrigin = ''
  try {
    supabaseOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').origin
  } catch {
    // The Supabase client reports a missing or invalid URL separately.
  }
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com${isDevelopment ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' ${supabaseOrigin} https://challenges.cloudflare.com https://vitals.vercel-insights.com${isDevelopment ? ' ws: wss:' : ''}`.replace(/\s+/g, ' ').trim(),
    "frame-src https://challenges.cloudflare.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    isDevelopment ? '' : 'upgrade-insecure-requests',
  ].filter(Boolean).join('; ')

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  const createResponse = () => {
    const next = NextResponse.next({ request: { headers: requestHeaders } })
    next.headers.set('Content-Security-Policy', csp)
    return next
  }
  let response = createResponse()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items) => {
        items.forEach(({ name, value }) => request.cookies.set(name, value))
        response = createResponse()
        items.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    } },
  )
  await supabase.auth.getClaims()
  return response
}

export const config = { matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'] }
