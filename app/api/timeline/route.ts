import { pool, databaseIsConfigured } from '@/lib/db'
import { SEED_EVENTS, TIMELINE_GROUPS } from '@/lib/timeline-data'
import type { TimelineEvent, TimelineGroup } from '@/lib/timeline-types'

export const runtime = 'nodejs'

export async function GET() {
  if (!databaseIsConfigured()) {
    return Response.json({ events: SEED_EVENTS, groups: TIMELINE_GROUPS }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  try {
    const [{ rows: eventRows }, { rows: parentRows }, { rows: groupRows }] = await Promise.all([
      pool.query('select * from public.timeline_events order by year, title'),
      pool.query('select event_id, parent_id from public.event_parents order by sort_order'),
      pool.query('select * from public.timeline_groups order by start_year'),
    ])
    const parentsByEvent = new Map<string, string[]>()
    for (const row of parentRows) {
      const parents = parentsByEvent.get(row.event_id) ?? []
      parents.push(row.parent_id)
      parentsByEvent.set(row.event_id, parents)
    }

    const events: TimelineEvent[] = eventRows.map((row) => ({
      id: row.id,
      year: row.year,
      dateLabel: row.date_label,
      title: row.title,
      tradition: row.tradition_id,
      kind: row.kind,
      icon: row.icon,
      summary: row.summary,
      detail: row.detail,
      keyFigures: row.key_figures,
      links: row.links,
      groupId: row.group_id ?? undefined,
      parents: parentsByEvent.get(row.id) ?? [],
    }))
    const groups: TimelineGroup[] = groupRows.map((row) => ({
      id: row.id,
      title: row.title,
      dateLabel: row.date_label,
      startYear: row.start_year,
      endYear: row.end_year,
      autoExpandZoom: row.auto_expand_zoom,
    }))

    return Response.json({ events, groups }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Timeline query failed', { code: (error as { code?: string }).code })
    return Response.json({ error: 'The timeline could not be loaded.' }, { status: 503 })
  }
}
