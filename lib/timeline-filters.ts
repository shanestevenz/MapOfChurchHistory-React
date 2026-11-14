import { TRADITIONS } from './timeline-data'
import { ERAS } from './timeline-layout'
import type {
  EventKind,
  TimelineEvent,
  TraditionCategory,
  TraditionId,
} from './timeline-types'

/* --- Categories -------------------------------------------------------- */

export interface CategoryDefinition {
  id: TraditionCategory
  label: string
  description: string
  traditions: TraditionId[]
}

const CATEGORY_META: Omit<CategoryDefinition, 'traditions'>[] = [
  {
    id: 'shared',
    label: 'Early Church',
    description: 'The shared trunk before the great divisions.',
  },
  {
    id: 'eastern',
    label: 'Eastern',
    description: 'Church of the East, Oriental and Eastern Orthodox.',
  },
  {
    id: 'western',
    label: 'Western',
    description: 'The Latin church gathered around Rome.',
  },
  {
    id: 'protestant',
    label: 'Protestant',
    description: 'Reformation churches and the movements descended from them.',
  },
  {
    id: 'other',
    label: 'Other',
    description:
      'Movements outside the historic creeds, such as Latter-day Saints and Jehovah’s Witnesses.',
  },
]

export const TRADITION_CATEGORIES: CategoryDefinition[] = CATEGORY_META.map(
  (meta) => ({
    ...meta,
    traditions: [...TRADITIONS]
      .sort((a, b) => a.lane - b.lane)
      .filter((tradition) => tradition.category === meta.id)
      .map((tradition) => tradition.id),
  }),
)

/* --- Filter state ------------------------------------------------------ */

export type EraLabel = (typeof ERAS)[number]['label']

export const EVENT_KINDS: { id: EventKind; label: string }[] = [
  { id: 'event', label: 'Milestones' },
  { id: 'council', label: 'Councils' },
  { id: 'schism', label: 'Divisions' },
  { id: 'reunion', label: 'Reunions' },
]

export interface TimelineFilters {
  hiddenTraditions: TraditionId[]
  hiddenKinds: EventKind[]
  hiddenEras: string[]
  /** The generated "today" node at the end of every living branch. */
  showPresentDay: boolean
  /** "Began here" flags on each branch's founding event. */
  showOrigins: boolean
  /** Shorter labels: no event-type caption, titles clamped to two lines. */
  compactLabels: boolean
  /** Collapse lanes that have nothing left to show after filtering. */
  hideEmptyLanes: boolean
  /** Dim everything outside the selected event's ancestors and descendants. */
  focusLineage: boolean
}

export const DEFAULT_FILTERS: TimelineFilters = {
  hiddenTraditions: [],
  hiddenKinds: [],
  hiddenEras: [],
  showPresentDay: true,
  showOrigins: true,
  compactLabels: false,
  hideEmptyLanes: true,
  focusLineage: false,
}

/**
 * How many kinds of setting differ from the defaults, for the toolbar badge.
 * Hiding a whole category counts once, not once per denomination.
 */
export function activeFilterCount(filters: TimelineFilters): number {
  return (
    Number(filters.hiddenTraditions.length > 0) +
    Number(filters.hiddenKinds.length > 0) +
    Number(filters.hiddenEras.length > 0) +
    (Object.keys(DEFAULT_FILTERS) as (keyof TimelineFilters)[]).filter(
      (key) =>
        typeof DEFAULT_FILTERS[key] === 'boolean' &&
        filters[key] !== DEFAULT_FILTERS[key],
    ).length
  )
}

const ALL_TRADITIONS = TRADITIONS.map((tradition) => tradition.id)
const traditionsExcept = (keep: TraditionId[]) =>
  ALL_TRADITIONS.filter((id) => !keep.includes(id))
const categoryMembers = (...ids: TraditionCategory[]) =>
  TRADITION_CATEGORIES.filter((category) => ids.includes(category.id)).flatMap(
    (category) => category.traditions,
  )

export interface FilterPreset {
  id: string
  label: string
  description: string
  apply: (current: TimelineFilters) => TimelineFilters
}

/** One-click views. Display preferences are kept; content filters are set. */
export const FILTER_PRESETS: FilterPreset[] = [
  {
    id: 'everything',
    label: 'Everything',
    description: 'Every branch, era and event type.',
    apply: (current) => ({
      ...current,
      hiddenTraditions: [],
      hiddenKinds: [],
      hiddenEras: [],
    }),
  },
  {
    id: 'great-divisions',
    label: 'Great divisions',
    description:
      'Only councils, divisions and reunions — the branching points.',
    apply: (current) => ({
      ...current,
      hiddenTraditions: [],
      hiddenKinds: ['event'],
      hiddenEras: [],
    }),
  },
  {
    id: 'early-church',
    label: 'First millennium',
    description:
      'The early church and the ancient Eastern and Western churches.',
    apply: (current) => ({
      ...current,
      hiddenTraditions: traditionsExcept(
        categoryMembers('shared', 'eastern', 'western'),
      ),
      hiddenKinds: [],
      hiddenEras: ['Reformation', 'Modern'],
    }),
  },
  {
    id: 'east-west',
    label: 'East & West',
    description:
      'Catholic and Orthodox churches without the Protestant branches.',
    apply: (current) => ({
      ...current,
      hiddenTraditions: traditionsExcept(
        categoryMembers('shared', 'eastern', 'western'),
      ),
      hiddenKinds: [],
      hiddenEras: [],
    }),
  },
  {
    id: 'protestant-tree',
    label: 'Protestant family tree',
    description: 'The Reformation and every Protestant branch since.',
    apply: (current) => ({
      ...current,
      hiddenTraditions: traditionsExcept(
        categoryMembers('western', 'protestant'),
      ),
      hiddenKinds: [],
      hiddenEras: ['Apostolic', 'Imperial', 'Medieval'],
    }),
  },
]

/* --- Applying filters -------------------------------------------------- */

function eraOf(year: number): string | undefined {
  return ERAS.find((era) => year >= era.from && year <= era.to)?.label
}

/**
 * Returns the events that pass the filters. Parents that were filtered out
 * are replaced by their nearest visible ancestors, so the tree stays
 * connected instead of breaking into floating fragments.
 */
export function applyFilters(
  events: TimelineEvent[],
  filters: TimelineFilters,
): TimelineEvent[] {
  const hiddenTraditions = new Set(filters.hiddenTraditions)
  const hiddenKinds = new Set(filters.hiddenKinds)
  const hiddenEras = new Set(filters.hiddenEras)

  const isVisible = (event: TimelineEvent) => {
    if (hiddenTraditions.has(event.tradition)) return false
    if (event.presentDay) return filters.showPresentDay
    if (hiddenKinds.has(event.kind)) return false
    const era = eraOf(event.year)
    return !(era && hiddenEras.has(era))
  }

  const byId = new Map(events.map((event) => [event.id, event]))
  const visibleIds = new Set(events.filter(isVisible).map((event) => event.id))

  const resolved = new Map<string, string[]>()
  const visibleAncestors = (id: string, trail: Set<string>): string[] => {
    const cached = resolved.get(id)
    if (cached) return cached
    if (trail.has(id)) return []
    trail.add(id)
    const event = byId.get(id)
    const result: string[] = []
    for (const parent of event?.parents ?? []) {
      if (visibleIds.has(parent)) result.push(parent)
      else if (byId.has(parent)) result.push(...visibleAncestors(parent, trail))
    }
    const unique = [...new Set(result)]
    resolved.set(id, unique)
    return unique
  }

  return events
    .filter((event) => visibleIds.has(event.id))
    .map((event) => {
      const parents = visibleAncestors(event.id, new Set())
      const unchanged =
        parents.length === event.parents.length &&
        parents.every((parent, index) => parent === event.parents[index])
      return unchanged ? event : { ...event, parents }
    })
}

/** Traditions with nothing visible, so their lanes can collapse. */
export function emptyTraditions(events: TimelineEvent[]): Set<TraditionId> {
  const used = new Set(events.map((event) => event.tradition))
  return new Set(ALL_TRADITIONS.filter((id) => !used.has(id)))
}

/** The selected event plus everything it descends from and leads to. */
export function lineageOf(events: TimelineEvent[], id: string): Set<string> {
  const byId = new Map(events.map((event) => [event.id, event]))
  const children = new Map<string, string[]>()
  for (const event of events) {
    for (const parent of event.parents) {
      const list = children.get(parent) ?? []
      list.push(event.id)
      children.set(parent, list)
    }
  }

  const result = new Set<string>([id])
  const walk = (start: string, next: (id: string) => string[]) => {
    const stack = [start]
    while (stack.length) {
      for (const related of next(stack.pop()!)) {
        if (result.has(related)) continue
        result.add(related)
        stack.push(related)
      }
    }
  }
  walk(id, (current) => byId.get(current)?.parents ?? [])
  walk(id, (current) => children.get(current) ?? [])
  return result
}

/* --- Persistence ------------------------------------------------------- */

const STORAGE_KEY = 'timeline-filters:v1'

export function loadFilters(): TimelineFilters {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_FILTERS
    const parsed = JSON.parse(raw) as Partial<TimelineFilters>
    const known = new Set<string>(ALL_TRADITIONS)
    return {
      ...DEFAULT_FILTERS,
      ...parsed,
      // Drop ids from older versions of the data.
      hiddenTraditions: (parsed.hiddenTraditions ?? []).filter((id) =>
        known.has(id),
      ),
      hiddenKinds: parsed.hiddenKinds ?? [],
      hiddenEras: parsed.hiddenEras ?? [],
    }
  } catch {
    return DEFAULT_FILTERS
  }
}

export function saveFilters(filters: TimelineFilters) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filters))
  } catch {
    // Private windows and blocked storage simply don't remember filters.
  }
}
