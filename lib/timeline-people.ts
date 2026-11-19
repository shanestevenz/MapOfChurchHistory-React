import { TRADITION_MAP } from './timeline-data'
import type { PersonType, TimelineEvent, TraditionId } from './timeline-types'

/** Person roles, in the order the filter chips show them. */
export const PERSON_TYPES: { id: PersonType; label: string; description: string }[] = [
  {
    id: 'theologian',
    label: 'Fathers & theologians',
    description: 'Church Fathers, doctors of the church and theologians.',
  },
  {
    id: 'reformer',
    label: 'Reformers & founders',
    description: 'Reformers and the founders of churches and movements.',
  },
  {
    id: 'evangelist',
    label: 'Preachers & missionaries',
    description: 'Revivalists, evangelists, missionaries and hymn writers.',
  },
  {
    id: 'church-leader',
    label: 'Popes & church leaders',
    description:
      'Only the most consequential popes, patriarchs and presiding leaders.',
  },
  { id: 'ruler', label: 'Rulers', description: 'Emperors, kings and queens.' },
  {
    id: 'world',
    label: 'World figures',
    description: 'People outside the church who shaped its world.',
  },
]

export const PERSON_TYPE_LABEL = Object.fromEntries(
  PERSON_TYPES.map((type) => [type.id, type.label]),
) as Record<PersonType, string>

/** Short church names for people's tags, e.g. "Catholic", "Anabaptist". */
export const CHURCH_TAG: Record<TraditionId, string> = {
  world: 'World History',
  'east-syriac': 'Church of the East',
  oriental: 'Oriental Orthodox',
  orthodox: 'Orthodox',
  undivided: 'Undivided Church',
  catholic: 'Catholic',
  protestant: 'Lutheran',
  reformed: 'Reformed',
  anglican: 'Anglican',
  radical: 'Anabaptist',
  quaker: 'Quaker',
  baptist: 'Baptist',
  methodist: 'Methodist',
  pentecostal: 'Pentecostal',
  evangelical: 'Evangelical',
  adventist: 'Adventist',
  restoration: 'Restoration Movement',
  'unitarian-universalist': 'Unitarian Universalist',
  'latter-day-saints': 'Latter-day Saint',
  'jehovahs-witnesses': 'Jehovah’s Witness',
  'christian-science': 'Christian Science',
}

/** The year a branch began, from its "Began here" label (0 if unknown). */
function branchStartYear(id: TraditionId): number {
  const label = TRADITION_MAP[id]?.origins[0]?.dateLabel ?? ''
  return Number(label.match(/\d{2,4}/)?.[0] ?? 0)
}

/**
 * The churches a person was part of, in order, for their tags: the church
 * they left (if any), then the one they belonged to. Someone drawn on a lane
 * only as a forerunner (Hus on the Lutheran lane in 1415, or Vladimir on the
 * Orthodox lane before 1054) isn't tagged with it, and World History is a
 * context lane, not a church.
 */
export function churchesOf(event: TimelineEvent): TraditionId[] {
  const person = event.person
  if (!person) return []
  const lane = event.tradition
  // Still alive when the lane's branch began (not just a forerunner).
  const laneIsTheirs =
    lane !== 'world' && lifespanOf(event)[1] >= branchStartYear(lane)
  const churches: TraditionId[] = []
  if (person.formerly && person.formerly !== lane) churches.push(person.formerly)
  if (person.affiliation && person.affiliation !== lane) {
    churches.push(person.affiliation)
    if (laneIsTheirs) churches.push(lane)
  } else if (lane !== 'world') {
    churches.push(lane)
  }
  return [...new Set(churches)]
}

/** The tag text for one of a person's churches (see churchesOf). */
export function churchTagLabel(event: TimelineEvent, church: TraditionId): string {
  const movement = event.person?.movement?.trim()
  return church === event.tradition && movement ? movement : CHURCH_TAG[church]
}

export function isPerson(event: TimelineEvent): boolean {
  return event.kind === 'person'
}

/**
 * Reduces a name to a comparable key: no accents, case or honorifics, so the
 * tag "Pope Leo I" finds the person "Leo I" and "St Augustine" finds
 * "Augustine". Ordinals (I, II, XXIII) are kept: Gregory I is not Gregory VII.
 */
export function nameKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    // Letters NFD doesn't split into base + accent (Wojtyła, Søren).
    .replace(/ł/g, 'l')
    .replace(/ø/g, 'o')
    .replace(/[.’']/g, '')
    .replace(/\b(pope|saint|st|emperor|empress|king|queen|mar|patriarch|catholicos|cardinal|rev|reverend)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Every name a person goes by: their title and any aliases. */
function namesOf(person: TimelineEvent): string[] {
  return [person.title, ...(person.person?.aliases ?? [])]
}

/** Looks up person nodes by any of their names. */
export function buildPersonIndex(events: TimelineEvent[]): Map<string, TimelineEvent> {
  const index = new Map<string, TimelineEvent>()
  for (const event of events) {
    if (!isPerson(event)) continue
    for (const name of namesOf(event)) {
      const key = nameKey(name)
      if (key && !index.has(key)) index.set(key, event)
    }
  }
  return index
}

/** Events (not people) whose key-figure tags name this person. */
export function eventsFeaturing(
  person: TimelineEvent,
  events: TimelineEvent[],
): TimelineEvent[] {
  const keys = new Set(namesOf(person).map(nameKey))
  return events
    .filter(
      (event) =>
        event.id !== person.id &&
        !event.presentDay &&
        event.keyFigures?.some((figure) => keys.has(nameKey(figure))),
    )
    .sort((a, b) => a.year - b.year)
}

/** Text a search box should match for a node, including a person's aliases. */
export function searchableText(event: TimelineEvent): string[] {
  return [
    event.title,
    event.dateLabel,
    ...(event.keyFigures ?? []),
    ...(event.person ? [event.person.role, ...(event.person.aliases ?? [])] : []),
  ]
}

/**
 * The years a person lived, read from their lifespan label: "354–430",
 * "c. 155 – c. 220", "c. 5 – c. 64/67", "d. c. 64", "b. 1940", "c. 4 BC – c. AD 30".
 * Only a death year ("d. 64") assumes a 60-year life; only a birth year runs
 * to today. Falls back to the node's own year.
 */
export function lifespanOf(event: TimelineEvent): [number, number] {
  const label = event.dateLabel
  const years = [...label.matchAll(/(\d{1,4})\s*(BC)?/gi)].map((match) =>
    match[2] ? -Number(match[1]) : Number(match[1]),
  )
  if (years.length === 0) return [event.year, event.year]
  const first = years[0]
  const last = years[years.length - 1]
  if (years.length === 1) {
    if (/\bd\./i.test(label)) return [first - 60, first]
    if (/\bb\./i.test(label)) return [first, new Date().getFullYear()]
    return [first, first]
  }
  return [Math.min(first, last), Math.max(first, last)]
}

/**
 * The year a person was born, when their lifespan label gives it ("354–430",
 * "c. 155 – c. 220", "b. 1940"); null when only a death year or a century is
 * known ("d. 454"). People are placed on the timeline by birth, so they sit
 * before the events they shaped.
 */
export function birthYearOf(event: TimelineEvent): number | null {
  const label = event.dateLabel
  const years = [...label.matchAll(/(\d{1,4})\s*(BC)?/gi)].map((match) =>
    match[2] ? -Number(match[1]) : Number(match[1]),
  )
  if (/century/i.test(label) || years.length === 0) return null
  if (years.length === 1) return /\bb\./i.test(label) ? years[0] : null
  return years[0]
}

/**
 * The events a group of people must not hide: every event on the lane except
 * people, the generated "today" nodes and minor detail events (those inside a
 * progressive detail group, such as Paul's journeys).
 */
function landmarksOn(lane: string, events: TimelineEvent[]): TimelineEvent[] {
  return events.filter(
    (event) =>
      event.tradition === lane &&
      !isPerson(event) &&
      !event.presentDay &&
      !event.groupId,
  )
}

const within = ([from, to]: [number, number], year: number) => year >= from && year <= to

/**
 * Landmark events on a person's lane that happened in their lifetime. A
 * person with any is always drawn on their own, even when they belong to a
 * group, so a group never hides someone who lived through e.g. Nicaea.
 */
export function groupConflicts(
  person: TimelineEvent,
  events: TimelineEvent[],
): TimelineEvent[] {
  const span = lifespanOf(person)
  return landmarksOn(person.tradition, events)
    .filter((event) => within(span, event.year))
    .sort((a, b) => a.year - b.year)
}

/** People group names in use on a lane, for the editor's suggestions. */
export function groupNamesOn(lane: string, events: TimelineEvent[]): string[] {
  const names = new Set<string>()
  for (const event of events) {
    if (event.tradition === lane && event.person?.group) names.add(event.person.group)
  }
  return [...names].sort()
}

/** The id of the group node standing in for a run of people. */
export function personGroupId(members: TimelineEvent[]): string {
  return `people-group-${members[0].id}`
}

function groupNode(name: string, members: TimelineEvent[]): TimelineEvent {
  const first = members[0]
  const spans = members.map(lifespanOf)
  const from = Math.min(...spans.map((span) => span[0]))
  const to = Math.max(...spans.map((span) => span[1]))
  return {
    id: personGroupId(members),
    year: first.year,
    dateLabel: `c. ${from < 100 ? `AD ${from}` : from}–${to}`,
    title: name,
    tradition: first.tradition,
    parents: [],
    kind: 'person',
    icon: { type: 'lucide', name: 'Users' },
    summary: members.map((member) => member.title).join(', '),
    detail: '',
    keyFigures: [],
    links: [],
    person: { role: `${members.length} people`, type: first.person!.type, group: name },
    personGroup: members,
  }
}

/**
 * Draws each curated group of people (people sharing a `person.group` name
 * on one lane) as a single node, so a busy stretch like the early Church
 * Fathers reads as one stop. Grouping never hides a landmark event: anyone
 * who lived through one on their lane is drawn on their own, and a group
 * whose members' combined lifetimes would span one is split there.
 */
export function groupPeople(events: TimelineEvent[]): TimelineEvent[] {
  const named = new Map<string, TimelineEvent[]>()
  for (const event of events) {
    const name = event.person?.group?.trim()
    if (!isPerson(event) || !name) continue
    const key = `${event.tradition}\u0000${name}`
    named.set(key, [...(named.get(key) ?? []), event])
  }

  const grouped = new Map<string, TimelineEvent>()
  for (const [key, people] of named) {
    const name = key.split('\u0000')[1]
    const landmarks = landmarksOn(people[0].tradition, events)
    const spansLandmark = (span: [number, number]) =>
      landmarks.some((event) => within(span, event.year))
    const runs: TimelineEvent[][] = []
    let run: TimelineEvent[] = []
    let span: [number, number] | null = null
    for (const person of [...people].sort((a, b) => a.year - b.year)) {
      const own = lifespanOf(person)
      if (spansLandmark(own)) continue
      const joined: [number, number] = span
        ? [Math.min(span[0], own[0]), Math.max(span[1], own[1])]
        : own
      if (span && spansLandmark(joined)) {
        runs.push(run)
        run = [person]
        span = own
      } else {
        run.push(person)
        span = joined
      }
    }
    runs.push(run)
    for (const members of runs.filter((item) => item.length >= 2)) {
      const node = groupNode(name, members)
      for (const member of members) grouped.set(member.id, node)
    }
  }

  if (grouped.size === 0) return events
  const result: TimelineEvent[] = []
  const added = new Set<string>()
  for (const event of events) {
    const node = grouped.get(event.id)
    if (!node) {
      result.push(event)
    } else if (!added.has(node.id)) {
      added.add(node.id)
      result.push(node)
    }
  }
  return result
}
