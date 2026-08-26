'use client'

import * as React from 'react'
import { DATA_VERSION, SEED_EVENTS } from '@/lib/timeline-data'
import type { EditSuggestion, TimelineEvent } from '@/lib/timeline-types'

const STORAGE_KEY = 'church-timeline/v1'
const ADMIN_KEY = 'church-timeline/admin'
const SUGGESTIONS_KEY = 'church-timeline/suggestions'

/**
 * Local-only editor passcode. There is no backend yet, so this gate simply
 * hides the editing tools from ordinary visitors — it is not real security.
 */
export const ADMIN_PASSCODE = 'ecclesia'

interface TimelineContextValue {
  events: TimelineEvent[]
  isAdmin: boolean
  hydrated: boolean
  hasLocalEdits: boolean
  signIn: (passcode: string) => boolean
  signOut: () => void
  saveEvent: (event: TimelineEvent) => void
  deleteEvent: (id: string) => void
  resetToSeed: () => void
  replaceAll: (events: TimelineEvent[]) => void
  suggestions: EditSuggestion[]
  pendingCount: number
  submitSuggestion: (
    suggestion: Omit<EditSuggestion, 'id' | 'createdAt' | 'status'>,
  ) => void
  approveSuggestion: (id: string) => void
  declineSuggestion: (id: string) => void
}

const TimelineContext = React.createContext<TimelineContextValue | null>(null)

function isEventArray(value: unknown): value is TimelineEvent[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as TimelineEvent).id === 'string' &&
        typeof (item as TimelineEvent).title === 'string',
    )
  )
}

export function TimelineProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = React.useState<TimelineEvent[]>(SEED_EVENTS)
  const [isAdmin, setIsAdmin] = React.useState(false)
  const [hydrated, setHydrated] = React.useState(false)
  const [hasLocalEdits, setHasLocalEdits] = React.useState(false)
  const [suggestions, setSuggestions] = React.useState<EditSuggestion[]>([])

  // Read persisted state after mount so server and client markup match.
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (isEventArray(parsed?.events)) {
          setEvents(parsed.events)
          setHasLocalEdits(true)
        }
      }
      const rawSuggestions = window.localStorage.getItem(SUGGESTIONS_KEY)
      if (rawSuggestions) {
        const parsed = JSON.parse(rawSuggestions)
        if (Array.isArray(parsed)) setSuggestions(parsed as EditSuggestion[])
      }
      setIsAdmin(window.sessionStorage.getItem(ADMIN_KEY) === 'true')
    } catch {
      // Corrupt or unavailable storage — fall back to the seed timeline.
    }
    setHydrated(true)
  }, [])

  const persist = React.useCallback((next: TimelineEvent[]) => {
    setEvents(next)
    setHasLocalEdits(true)
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: DATA_VERSION, events: next }),
      )
    } catch {
      // Quota exceeded (usually a large uploaded image) — keep in memory only.
    }
  }, [])

  const persistSuggestions = React.useCallback((next: EditSuggestion[]) => {
    setSuggestions(next)
    try {
      window.localStorage.setItem(SUGGESTIONS_KEY, JSON.stringify(next))
    } catch {
      // Keep in memory only if storage is unavailable.
    }
  }, [])

  const value = React.useMemo<TimelineContextValue>(
    () => ({
      events,
      isAdmin,
      hydrated,
      hasLocalEdits,
      signIn: (passcode) => {
        const ok = passcode.trim().toLowerCase() === ADMIN_PASSCODE
        if (ok) {
          setIsAdmin(true)
          try {
            window.sessionStorage.setItem(ADMIN_KEY, 'true')
          } catch {
            // Ignore storage failures; the session still works in memory.
          }
        }
        return ok
      },
      signOut: () => {
        setIsAdmin(false)
        try {
          window.sessionStorage.removeItem(ADMIN_KEY)
        } catch {
          // Ignore.
        }
      },
      saveEvent: (event) => {
        const exists = events.some((candidate) => candidate.id === event.id)
        persist(
          exists
            ? events.map((candidate) =>
                candidate.id === event.id ? event : candidate,
              )
            : [...events, event],
        )
      },
      deleteEvent: (id) => {
        persist(
          events
            .filter((event) => event.id !== id)
            .map((event) => ({
              ...event,
              parents: event.parents.filter((parent) => parent !== id),
            })),
        )
      },
      resetToSeed: () => {
        setEvents(SEED_EVENTS)
        setHasLocalEdits(false)
        try {
          window.localStorage.removeItem(STORAGE_KEY)
        } catch {
          // Ignore.
        }
      },
      replaceAll: (next) => persist(next),

      suggestions,
      pendingCount: suggestions.filter((item) => item.status === 'pending')
        .length,

      submitSuggestion: (draft) => {
        persistSuggestions([
          {
            ...draft,
            id: `sug-${Date.now().toString(36)}-${Math.random()
              .toString(36)
              .slice(2, 7)}`,
            createdAt: new Date().toISOString(),
            status: 'pending',
          },
          ...suggestions,
        ])
      },

      approveSuggestion: (id) => {
        const suggestion = suggestions.find((item) => item.id === id)
        if (!suggestion) return
        const target = events.find((item) => item.id === suggestion.eventId)

        if (target) {
          const patched: TimelineEvent = { ...target }
          for (const change of suggestion.changes) {
            patched[change.field] = change.after
          }
          if (suggestion.source) {
            const existing = patched.links ?? []
            // Avoid duplicating a citation that is already listed.
            if (!existing.some((link) => link.url === suggestion.source!.url)) {
              patched.links = [...existing, suggestion.source]
            }
          }
          persist(
            events.map((item) => (item.id === patched.id ? patched : item)),
          )
        }

        persistSuggestions(
          suggestions.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: 'approved',
                  reviewedAt: new Date().toISOString(),
                }
              : item,
          ),
        )
      },

      declineSuggestion: (id) => {
        persistSuggestions(
          suggestions.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: 'declined',
                  reviewedAt: new Date().toISOString(),
                }
              : item,
          ),
        )
      },
    }),
    [
      events,
      isAdmin,
      hydrated,
      hasLocalEdits,
      persist,
      suggestions,
      persistSuggestions,
    ],
  )

  return (
    <TimelineContext.Provider value={value}>{children}</TimelineContext.Provider>
  )
}

export function useTimeline() {
  const context = React.useContext(TimelineContext)
  if (!context) {
    throw new Error('useTimeline must be used inside a TimelineProvider')
  }
  return context
}
