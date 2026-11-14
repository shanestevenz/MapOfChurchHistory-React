import { toNextJsHandler } from 'better-auth/next-js'
import { auth } from '@/lib/auth/server'
import { authIsConfigured } from '@/lib/db'

const handlers = toNextJsHandler(auth)

function unavailable() {
  return Response.json({ error: 'Authentication is not configured.' }, { status: 503 })
}

export const GET = (request: Request) =>
  !authIsConfigured()
    ? unavailable()
    : new URL(request.url).pathname.startsWith('/api/auth/admin/')
      ? Response.json({ error: 'Not found.' }, { status: 404 })
      : handlers.GET(request)

export async function POST(request: Request) {
  if (!authIsConfigured()) return unavailable()
  const path = new URL(request.url).pathname
  if (path.startsWith('/api/auth/admin/')) {
    return Response.json({ error: 'Not found.' }, { status: 404 })
  }
  if (path === '/api/auth/sign-in/email') {
    return Response.json({ error: 'Use the curator sign-in page.' }, { status: 403 })
  }
  return handlers.POST(request)
}
