import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from './database.types'
import type { EditSuggestion, ExternalLink, SuggestionChange, TimelineEvent, TimelineGroup } from '@/lib/timeline-types'

type Client = SupabaseClient<Database>

export async function fetchEvents(client: Client): Promise<TimelineEvent[]> {
  const [{ data: rows, error }, { data: edges, error: edgeError }] = await Promise.all([
    client.from('timeline_events').select('*').order('year').order('title'),
    client.from('event_parents').select('*').order('sort_order'),
  ])
  if (error) throw error
  if (edgeError) throw edgeError
  return rows.map((row) => ({
    id: row.id, year: row.year, dateLabel: row.date_label, title: row.title,
    tradition: row.tradition_id as TimelineEvent['tradition'], kind: row.kind as TimelineEvent['kind'],
    icon: row.icon as unknown as TimelineEvent['icon'], summary: row.summary, detail: row.detail,
    keyFigures: row.key_figures, links: row.links as unknown as ExternalLink[],
    groupId: row.group_id ?? undefined,
    parents: edges.filter((edge) => edge.event_id === row.id).map((edge) => edge.parent_id),
  }))
}

export async function fetchGroups(client: Client): Promise<TimelineGroup[]> {
  const { data, error } = await client
    .from('timeline_groups')
    .select('*')
    .order('start_year')
  if (error) throw error
  return data.map((row) => ({
    id: row.id,
    title: row.title,
    dateLabel: row.date_label,
    startYear: row.start_year,
    endYear: row.end_year,
    autoExpandZoom: row.auto_expand_zoom,
  }))
}

export const groupToDatabase = (group: TimelineGroup): Json => ({
  id: group.id,
  title: group.title,
  date_label: group.dateLabel,
  start_year: group.startYear,
  end_year: group.endYear,
  auto_expand_zoom: group.autoExpandZoom,
})

export async function fetchSuggestions(client: Client): Promise<EditSuggestion[]> {
  const [{ data: rows, error }, { data: changes, error: changesError }] = await Promise.all([
    client.from('edit_suggestions').select('*').order('created_at', { ascending: false }),
    client.from('suggestion_changes').select('*').order('id'),
  ])
  if (error) throw error
  if (changesError) throw changesError
  return rows.map((row) => ({
    id: row.id, eventId: row.event_id, eventTitle: row.event_title,
    contributor: row.contributor, note: row.note,
    source: row.source as unknown as ExternalLink | undefined,
    createdAt: row.created_at, status: row.status as EditSuggestion['status'],
    reviewedAt: row.reviewed_at ?? undefined,
    changes: changes.filter((change) => change.suggestion_id === row.id).map((change) => ({
      field: change.field as SuggestionChange['field'], before: change.before_value, after: change.after_value,
    })),
  }))
}

export const eventToDatabase = (event: TimelineEvent): Json => ({
  id: event.id, year: event.year, date_label: event.dateLabel, title: event.title,
  tradition_id: event.tradition, kind: event.kind, icon: event.icon as unknown as Json,
  summary: event.summary, detail: event.detail, key_figures: event.keyFigures ?? [],
  links: (event.links ?? []) as unknown as Json,
  group_id: event.groupId ?? null,
})
