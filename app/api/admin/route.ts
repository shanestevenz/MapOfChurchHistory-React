import { getCuratorId } from '@/lib/auth/authorization'
import { auth } from '@/lib/auth/server'
import { pool, authIsConfigured, databaseIsConfigured } from '@/lib/db'
import { sameOrigin } from '@/lib/http-security'

export const runtime = 'nodejs'

type Json = null | boolean | number | string | Json[] | { [key: string]: Json | undefined }

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

export async function GET(request: Request) {
  if (!authIsConfigured()) return json({ error: 'Curator access is required.' }, 401)
  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null)
  if (!session || session.user.role !== 'admin') return json({ error: 'Curator access is required.' }, 401)
  if (!session.user.twoFactorEnabled) return json({ isAdmin: true, twoFactorEnabled: false, suggestions: [] })
  try {
    const [{ rows: suggestions }, { rows: changes }] = await Promise.all([
      pool.query('select * from public.edit_suggestions order by created_at desc'),
      pool.query('select * from public.suggestion_changes order by id'),
    ])
    const changesBySuggestion = new Map<string, typeof changes>()
    for (const change of changes) {
      const list = changesBySuggestion.get(change.suggestion_id) ?? []
      list.push(change)
      changesBySuggestion.set(change.suggestion_id, list)
    }
    return json({
      isAdmin: true,
      twoFactorEnabled: true,
      suggestions: suggestions.map((row) => ({
        id: row.id,
        eventId: row.event_id,
        eventTitle: row.event_title,
        contributor: row.contributor,
        note: row.note,
        source: row.source ?? undefined,
        createdAt: row.created_at,
        status: row.status,
        reviewedAt: row.reviewed_at ?? undefined,
        changes: (changesBySuggestion.get(row.id) ?? []).map((change) => ({
          field: change.field,
          before: change.before_value,
          after: change.after_value,
        })),
      })),
    })
  } catch (error) {
    console.error('Curator data query failed', { code: (error as { code?: string }).code })
    return json({ error: 'Curator data could not be loaded.' }, 503)
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: 'Request origin is not allowed.' }, 403)
  if (!databaseIsConfigured()) return json({ error: 'The database is not configured.' }, 503)
  const declaredLength = Number(request.headers.get('content-length') || 0)
  if (declaredLength > 1_000_000) return json({ error: 'The request is too large.' }, 413)
  const userId = await getCuratorId(request)
  if (!userId) return json({ error: 'Curator access is required.' }, 401)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'The request is not valid JSON.' }, 400)
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'The request is invalid.' }, 400)
  const input = body as Record<string, unknown>

  try {
    if (input.action === 'save-event' && input.event && typeof input.event === 'object') {
      const event = input.event as Record<string, unknown>
      const value: Json = {
        id: event.id as string,
        year: event.year as number,
        date_label: event.dateLabel as string,
        title: event.title as string,
        tradition_id: event.tradition as string,
        kind: event.kind as string,
        icon: event.icon as Json,
        summary: event.summary as string,
        detail: (event.detail as string | undefined) ?? '',
        key_figures: (event.keyFigures as string[] | undefined) ?? [],
        links: (event.links as Json | undefined) ?? [],
        group_id: (event.groupId as string | undefined) ?? null,
      }
      const parents = Array.isArray(event.parents) ? event.parents.filter((value): value is string => typeof value === 'string') : []
      await pool.query('select public.save_timeline_event($1, $2::jsonb, $3::text[])', [userId, JSON.stringify(value), parents])
      return json({ ok: true })
    }
    if (input.action === 'delete-event' && typeof input.id === 'string') {
      await pool.query('select public.delete_timeline_event($1, $2)', [userId, input.id])
      return json({ ok: true })
    }
    if (input.action === 'save-group' && input.group && typeof input.group === 'object') {
      const group = input.group as Record<string, unknown>
      const value: Json = {
        id: group.id as string,
        title: group.title as string,
        date_label: group.dateLabel as string,
        start_year: group.startYear as number,
        end_year: group.endYear as number,
        auto_expand_zoom: group.autoExpandZoom as number,
      }
      await pool.query('select public.save_timeline_group($1, $2::jsonb)', [userId, JSON.stringify(value)])
      return json({ ok: true })
    }
    if (input.action === 'delete-group' && typeof input.id === 'string') {
      await pool.query('select public.delete_timeline_group($1, $2)', [userId, input.id])
      return json({ ok: true })
    }
    if (input.action === 'review-suggestion'
      && typeof input.id === 'string'
      && (input.decision === 'approved' || input.decision === 'declined')) {
      await pool.query('select public.review_edit_suggestion($1, $2::uuid, $3)', [userId, input.id, input.decision])
      return json({ ok: true })
    }
    return json({ error: 'The requested action is invalid.' }, 400)
  } catch (error) {
    const pgError = error as { code?: string; message?: string }
    const message = pgError.message ?? ''
    if (message.includes('suggestion_not_found')) return json({ error: 'The suggestion no longer exists.' }, 404)
    if (message.includes('suggestion_already_reviewed')) return json({ error: 'The suggestion has already been reviewed.' }, 409)
    if (message.includes('curator_access_required')) return json({ error: 'Curator access is required.' }, 401)
    console.error('Curator database write failed', { code: pgError.code })
    return json({ error: 'The change could not be saved.' }, 400)
  }
}
