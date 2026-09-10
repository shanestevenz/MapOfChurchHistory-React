'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { SEED_EVENTS, TIMELINE_GROUPS } from '@/lib/timeline-data'
import type { EditSuggestion, TimelineEvent, TimelineGroup } from '@/lib/timeline-types'
import { createClient } from '@/lib/supabase/client'
import { eventToDatabase, fetchEvents, fetchGroups, fetchSuggestions, groupToDatabase } from '@/lib/supabase/timeline'

interface TimelineContextValue {
  events: TimelineEvent[]; isAdmin: boolean; hydrated: boolean; hasLocalEdits: boolean
  groups: TimelineGroup[]
  signOut: () => Promise<void>
  saveEvent: (event: TimelineEvent) => Promise<void>; deleteEvent: (id: string) => Promise<void>
  resetToSeed: () => Promise<void>; replaceAll: (events: TimelineEvent[]) => Promise<void>
  suggestions: EditSuggestion[]; pendingCount: number
  submitSuggestion: (
    suggestion: Omit<EditSuggestion, 'id' | 'createdAt' | 'status'>,
    turnstileToken: string,
  ) => Promise<void>
  approveSuggestion: (id: string) => Promise<void>; declineSuggestion: (id: string) => Promise<void>
  saveGroup: (group: TimelineGroup) => Promise<void>; deleteGroup: (id: string) => Promise<void>
}

const TimelineContext = React.createContext<TimelineContextValue | null>(null)

export function TimelineProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = React.useState<TimelineEvent[]>(SEED_EVENTS)
  const [groups, setGroups] = React.useState<TimelineGroup[]>(TIMELINE_GROUPS)
  const [suggestions, setSuggestions] = React.useState<EditSuggestion[]>([])
  const [isAdmin, setIsAdmin] = React.useState(false)
  const [hydrated, setHydrated] = React.useState(false)
  const supabase = React.useMemo(() => createClient(), [])

  const loadEvents = React.useCallback(async () => {
    const [nextEvents, nextGroups] = await Promise.all([
      fetchEvents(supabase),
      fetchGroups(supabase),
    ])
    if (nextEvents.length) setEvents(nextEvents)
    setGroups(nextGroups)
  }, [supabase])

  const loadPrivateState = React.useCallback(async (userId?: string) => {
    if (!userId) { setIsAdmin(false); setSuggestions([]); return }
    const [{ data, error }, assurance] = await Promise.all([
      supabase.from('profiles').select('role').eq('id', userId).single(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ])
    if (error) throw error
    if (assurance.error) throw assurance.error
    const curator = data.role === 'curator' && assurance.data.currentLevel === 'aal2'
    setIsAdmin(curator)
    setSuggestions(curator ? await fetchSuggestions(supabase) : [])
  }, [supabase])

  React.useEffect(() => {
    let active = true
    Promise.all([loadEvents(), supabase.auth.getUser()])
      .then(async ([, result]) => { if (active) await loadPrivateState(result.data.user?.id) })
      .catch(() => toast.error('Could not load the timeline. Check your connection and try again.'))
      .finally(() => active && setHydrated(true))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) void loadPrivateState(session?.user?.id)
    })
    return () => { active = false; data.subscription.unsubscribe() }
  }, [loadEvents, loadPrivateState, supabase])

  const review = React.useCallback(async (id: string, decision: 'approved' | 'declined') => {
    const { error } = await supabase.rpc('review_edit_suggestion', { suggestion_id: id, decision })
    if (error) throw error
    await Promise.all([loadEvents(), fetchSuggestions(supabase).then(setSuggestions)])
  }, [loadEvents, supabase])

  const value = React.useMemo<TimelineContextValue>(() => ({
    events, groups, isAdmin, hydrated, hasLocalEdits: false,
    signOut: async () => { await supabase.auth.signOut(); setIsAdmin(false); setSuggestions([]) },
    saveEvent: async (event) => {
      const { error } = await supabase.rpc('save_timeline_event', { event_data: eventToDatabase(event), parent_ids: event.parents })
      if (error) throw error
      await loadEvents()
    },
    deleteEvent: async (id) => {
      const { error } = await supabase.rpc('delete_timeline_event', { target_id: id })
      if (error) throw error
      await loadEvents()
    },
    resetToSeed: loadEvents,
    replaceAll: async (next) => {
      for (const event of next) {
        const { error } = await supabase.rpc('save_timeline_event', { event_data: eventToDatabase(event), parent_ids: event.parents })
        if (error) throw error
      }
      await loadEvents()
    },
    suggestions,
    pendingCount: suggestions.filter((item) => item.status === 'pending').length,
    submitSuggestion: async (draft, turnstileToken) => {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: draft.eventId,
          contributor: draft.contributor,
          note: draft.note,
          source: draft.source ?? null,
          changes: draft.changes.map(({ field, after }) => ({ field, after })),
          turnstileToken,
        }),
      })
      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: string } | null
        throw new Error(result?.error ?? 'The suggestion could not be submitted.')
      }
    },
    saveGroup: async (group) => {
      const { error } = await supabase.rpc('save_timeline_group', {
        group_data: groupToDatabase(group),
      })
      if (error) throw error
      await loadEvents()
    },
    deleteGroup: async (id) => {
      const { error } = await supabase.rpc('delete_timeline_group', {
        target_id: id,
      })
      if (error) throw error
      await loadEvents()
    },
    approveSuggestion: (id) => review(id, 'approved'), declineSuggestion: (id) => review(id, 'declined'),
  }), [events, groups, hydrated, isAdmin, loadEvents, review, suggestions, supabase])

  return <TimelineContext.Provider value={value}>{children}</TimelineContext.Provider>
}

export function useTimeline() {
  const context = React.useContext(TimelineContext)
  if (!context) throw new Error('useTimeline must be used inside a TimelineProvider')
  return context
}
