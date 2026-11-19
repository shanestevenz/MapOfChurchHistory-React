export type TraditionId =
  | 'world'
  | 'east-syriac'
  | 'oriental'
  | 'orthodox'
  | 'undivided'
  | 'catholic'
  | 'protestant'
  | 'reformed'
  | 'radical'
  | 'baptist'
  | 'quaker'
  | 'anglican'
  | 'methodist'
  | 'pentecostal'
  | 'adventist'
  | 'evangelical'
  | 'restoration'
  | 'unitarian-universalist'
  | 'latter-day-saints'
  | 'jehovahs-witnesses'
  | 'christian-science'

/** Top-level grouping used by the filter controls. */
export type TraditionCategory =
  | 'world'
  | 'shared'
  | 'eastern'
  | 'western'
  | 'protestant'
  | 'other'

export type ColorFamily =
  | 'gold'
  | 'sapphire'
  | 'ruby'
  | 'emerald'
  | 'amethyst'
  | 'copper'
  /** Neutral grey, for the World History context lane. */
  | 'slate'

/** A header drawn above a run of related lanes. Groups can nest. */
export interface LaneGroup {
  id: string
  name: string
  blurb: string
  /** Header and band colour; defaults to the first lane's colour. */
  color?: string
  /** The enclosing group, e.g. Protestant for Magisterial Reformation. */
  parent?: LaneGroup
  /**
   * Drawn visibly apart from the rest of the timeline on a neutral grey
   * band, for movements outside the historic Nicene creeds.
   */
  setApart?: boolean
}

export interface Tradition {
  id: TraditionId
  /** Short name shown in lane headers and legend. */
  name: string
  /** One-line description of the branch. */
  blurb: string
  /** Horizontal position of the branch, left to right. */
  lane: number
  family: ColorFamily
  category: TraditionCategory
  /**
   * The innermost visual group this lane sits in. Neighbouring lanes naming
   * the same group are drawn under one header; each keeps its own lane.
   */
  laneGroup?: LaneGroup
  /**
   * When and where the branch began, drawn as start markers on its lane. The
   * first entry is the lane's origin; further entries mark separate movements
   * that share the lane. If an event is missing (e.g. deleted in the admin),
   * the lane's earliest event carries the first marker instead.
   */
  origins: TraditionOrigin[]
  /**
   * Draw the lane as one solid rail from the very start, instead of dotted
   * until its first event. Used by World History, which is not a branch.
   */
  continuous?: boolean
}

export interface TraditionOrigin {
  /** The event node the marker sits on. */
  eventId: string
  /** Short, human-readable date, e.g. "1609" or "1730s". */
  dateLabel: string
  /** Where the movement began, e.g. "Amsterdam". */
  place: string
}

export type BranchFrom = 'node' | 'date'

/**
 * The larger church a person drawn on another lane was a member of: the one
 * they still belonged to (`affiliation`) or the one they left (`formerly`).
 * Their node gets a dashed line from that church's lane.
 */
export function parentChurchOf(event: {
  tradition: TraditionId
  person?: PersonDetails
}): TraditionId | null {
  const church = event.person?.affiliation ?? event.person?.formerly
  return church && church !== event.tradition ? church : null
}

export type EventKind = 'event' | 'council' | 'schism' | 'reunion' | 'person'

/** Broad roles used to filter people nodes. */
export type PersonType =
  | 'theologian'
  | 'reformer'
  | 'evangelist'
  | 'church-leader'
  | 'ruler'
  | 'world'

/** Extra details carried by a node whose kind is 'person'. */
export interface PersonDetails {
  /** Short caption under the name, e.g. "Bishop of Hippo". */
  role: string
  type: PersonType
  /**
   * The branch this person belongs to, when it differs from the lane the
   * node is drawn on — e.g. Jonathan Edwards (Reformed) shown on the
   * Evangelical lane beside the Great Awakening. Omitted: the node's lane.
   */
  affiliation?: TraditionId
  /**
   * Other names used for this person in events' key-figure tags, so those
   * tags can link here, e.g. "Augustine" or "Pope Gregory I".
   */
  aliases?: string[]
  /**
   * A named group, e.g. "Early Church Fathers". People in the same group on
   * the same lane are drawn as one node (see groupPeople in
   * lib/timeline-people.ts), except anyone who lived through a landmark
   * event on that lane.
   */
  group?: string
  /** Where they lived and worked, e.g. "North Africa" or "Kyivan Rus’". */
  region?: string
  /**
   * The church they were a member of before the branch they are drawn on,
   * e.g. Martin Luther, a Catholic monk, on the Lutheran lane. Use this or
   * `affiliation` (still a member), not both.
   */
  formerly?: TraditionId
  /**
   * The movement their lane church is tagged with, when it is more specific
   * than the lane, e.g. "Quaker" or "Amish" on the Anabaptist & Peace
   * Churches lane. Omitted: the lane's own short name.
   */
  movement?: string
  /**
   * How they were persecuted, condemned, jailed or killed, by anyone, e.g.
   * "Excommunicated by Pope Leo X and outlawed by the Edict of Worms, 1521".
   * Shown as its own callout, not as a tag.
   */
  persecution?: string
}

/** Either a built-in line icon or an admin-uploaded picture. */
export type EventIcon =
  | { type: 'lucide'; name: string }
  | { type: 'image'; src: string }

export interface ExternalLink {
  label: string
  url: string
}

export interface PresentDayProfile {
  /** Date attached to statistics and contemporary notes. */
  asOf: string
  /** A sourced figure, with its reporting scope kept explicit. */
  membership: string
  /** Why the figure may not equal every person in the broader tradition. */
  membershipNote: string
  /** Where the largest communities or institutional centres are found. */
  geography: string
  /** A short, maintainable list of active developments. */
  currentDevelopments: string[]
}

export interface TimelineEvent {
  id: string
  /** Numeric year used for ordering. */
  year: number
  /** Human-readable date, e.g. "c. AD 33" or "31 Oct 1517". */
  dateLabel: string
  title: string
  tradition: TraditionId
  /** Ids of the events this one grows out of. Empty for the root. */
  parents: string[]
  kind: EventKind
  icon: EventIcon
  /** One or two sentences, shown in the quick dialog. */
  summary: string
  /** Long-form description, shown in the detail panel. Blank lines split paragraphs. */
  detail: string
  keyFigures?: string[]
  links?: ExternalLink[]
  /** Presentation-only grouping; unlike parents, this creates no graph edge. */
  groupId?: string
  /** Local, generated endpoint metadata for a continuing branch. */
  presentDay?: PresentDayProfile
  /** Set when kind is 'person'. For people, dateLabel is their lifespan. */
  person?: PersonDetails
  /**
   * Where this event's dotted branch line leaves a parent on another lane:
   * 'node' from the parent event itself, 'date' from the parent's rail at the
   * moment this branch began. Unset: 'node' when the parent is a schism (the
   * division the branch came out of), otherwise 'date'.
   */
  branchFrom?: BranchFrom
  /**
   * Set only on a group node the timeline draws in place of several people
   * in a row on one lane (see groupPeople); never stored.
   */
  personGroup?: TimelineEvent[]
}

export interface TimelineGroup {
  id: string
  title: string
  dateLabel: string
  startYear: number
  endYear: number
  autoExpandZoom: number
}

export interface TimelineData {
  version: number
  events: TimelineEvent[]
}

/* --- Community edit suggestions --------------------------------------- */

/** Text fields an ordinary visitor is allowed to propose changes to. */
export type SuggestableField =
  | 'title'
  | 'dateLabel'
  | 'summary'
  | 'detail'
  | 'personGroup'
  | 'personRegion'

export const SUGGESTABLE_FIELDS: {
  field: SuggestableField
  label: string
  multiline: boolean
  /** Only offered for people. */
  personOnly?: boolean
  /** An empty value is a real change (e.g. leaving a group). */
  allowEmpty?: boolean
}[] = [
  { field: 'title', label: 'Title', multiline: false },
  { field: 'dateLabel', label: 'Date', multiline: false },
  { field: 'summary', label: 'Summary', multiline: true },
  { field: 'detail', label: 'Full description', multiline: true },
  { field: 'personRegion', label: 'Country or region', multiline: false, personOnly: true, allowEmpty: true },
  { field: 'personGroup', label: 'Group', multiline: false, personOnly: true, allowEmpty: true },
]

/** The current value of a suggestable field on an event. */
export function suggestableValue(event: TimelineEvent, field: SuggestableField): string {
  if (field === 'personGroup') return event.person?.group ?? ''
  if (field === 'personRegion') return event.person?.region ?? ''
  return event[field]
}

export interface SuggestionChange {
  field: SuggestableField
  before: string
  after: string
}

export type SuggestionStatus = 'pending' | 'approved' | 'declined'

export interface EditSuggestion {
  id: string
  eventId: string
  /** Snapshot of the title so the queue still reads well if the event is renamed. */
  eventTitle: string
  contributor: string
  /** Why the change should be made — the contributor's edit summary. */
  note: string
  changes: SuggestionChange[]
  /** Optional citation appended to the event's links when approved. */
  source?: ExternalLink
  createdAt: string
  status: SuggestionStatus
  reviewedAt?: string
}
