'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { SEED_EVENTS, TIMELINE_GROUPS } from '@/lib/timeline-data'
import type { EditSuggestion, TimelineEvent, TimelineGroup } from '@/lib/timeline-types'
import { authClient } from '@/lib/auth/client'

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

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null) as { error?: string } | null
  if (!response.ok) throw new Error(body?.error ?? 'The request could not be completed.')
  return body as T
}

async function runAdminAction(action: Record<string, unknown>) {
  const response = await fetch('/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(action),
  })
  await readJson(response)
}

export function TimelineProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = React.useState<TimelineEvent[]>(SEED_EVENTS)
  const [groups, setGroups] = React.useState<TimelineGroup[]>(TIMELINE_GROUPS)
  const [suggestions, setSuggestions] = React.useState<EditSuggestion[]>([])
  const [isAdmin, setIsAdmin] = React.useState(false)
  const [hydrated, setHydrated] = React.useState(false)

  const loadEvents = React.useCallback(async () => {
    const response = await fetch('/api/timeline', { cache: 'no-store' })
    const result = await readJson<{ events: TimelineEvent[]; groups: TimelineGroup[] }>(response)
    if (result.events.length) setEvents(result.events)
    else setEvents(SEED_EVENTS)
    setGroups(result.groups.length ? result.groups : TIMELINE_GROUPS)
  }, [])

  const loadPrivateState = React.useCallback(async () => {
    const response = await fetch('/api/admin', { cache: 'no-store' })
    if (response.status === 401) {
      setIsAdmin(false)
      setSuggestions([])
      return
    }
    const result = await readJson<{
      isAdmin: boolean
      twoFactorEnabled: boolean
      suggestions: EditSuggestion[]
    }>(response)
    const curator = result.isAdmin && result.twoFactorEnabled
    setIsAdmin(curator)
    setSuggestions(curator ? result.suggestions : [])
  }, [])

  React.useEffect(() => {
    let active = true
    Promise.all([loadEvents(), loadPrivateState()])
      .catch(() => toast.error('Could not load the timeline. Check your connection and try again.'))
      .finally(() => active && setHydrated(true))
    return () => { active = false }
  }, [loadEvents, loadPrivateState])

  const review = React.useCallback(async (id: string, decision: 'approved' | 'declined') => {
    await runAdminAction({ action: 'review-suggestion', id, decision })
    await Promise.all([loadEvents(), loadPrivateState()])
  }, [loadEvents, loadPrivateState])

  const value = React.useMemo<TimelineContextValue>(() => ({
    events, groups, isAdmin, hydrated, hasLocalEdits: false,
    signOut: async () => {
      await authClient.signOut()
      setIsAdmin(false)
      setSuggestions([])
    },
    saveEvent: async (event) => {
      await runAdminAction({ action: 'save-event', event })
      await loadEvents()
    },
    deleteEvent: async (id) => {
      await runAdminAction({ action: 'delete-event', id })
      await loadEvents()
    },
    resetToSeed: loadEvents,
    replaceAll: async (next) => {
      for (const event of next) await runAdminAction({ action: 'save-event', event })
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
      await readJson(response)
    },
    saveGroup: async (group) => {
      await runAdminAction({ action: 'save-group', group })
      await loadEvents()
    },
    deleteGroup: async (id) => {
      await runAdminAction({ action: 'delete-group', id })
      await loadEvents()
    },
    approveSuggestion: (id) => review(id, 'approved'),
    declineSuggestion: (id) => review(id, 'declined'),
  }), [events, groups, hydrated, isAdmin, loadEvents, review, suggestions])

  return <TimelineContext.Provider value={value}>{children}</TimelineContext.Provider>
}

export function useTimeline() {
  const context = React.useContext(TimelineContext)
  if (!context) throw new Error('useTimeline must be used inside a TimelineProvider')
  return context
}
