import { getAuth } from '@/lib/auth/server'

export const runtime = 'nodejs'

type Context = { params: Promise<{ path: string[] }> }

function unavailable() {
  return Response.json({ error: 'Authentication is not configured.' }, { status: 503 })
}

// Paths the browser may not call directly through this proxy:
// - sign-up: curator accounts are created with `npm run curator:create`, never publicly.
// - sign-in/email: must go through /api/admin/login, which enforces Turnstile first.
// - admin/*: user management stays in the Neon console.
function blocked(path: string[]) {
  const joined = path.join('/')
  return joined.startsWith('sign-up') || joined === 'sign-in/email' || joined.startsWith('admin/')
}

async function handle(method: 'GET' | 'POST', request: Request, context: Context) {
  const auth = getAuth()
  if (!auth) return unavailable()
  const { path } = await context.params
  if (method === 'POST' && blocked(path)) {
    return Response.json({ error: 'Not found.' }, { status: 404 })
  }
  if (method === 'GET' && path[0] === 'admin') {
    return Response.json({ error: 'Not found.' }, { status: 404 })
  }
  return auth.handler()[method](request, context)
}

export const GET = (request: Request, context: Context) => handle('GET', request, context)
export const POST = (request: Request, context: Context) => handle('POST', request, context)
