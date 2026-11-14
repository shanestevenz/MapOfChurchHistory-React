import { pool, databaseIsConfigured } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 })
  }
  if (!databaseIsConfigured()) return Response.json({ error: 'Database is not configured.' }, { status: 503 })
  try {
    await pool.query('select public.purge_expired_suggestion_data()')
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Suggestion retention job failed', { code: (error as { code?: string }).code })
    return Response.json({ error: 'Retention job failed.' }, { status: 503 })
  }
}
