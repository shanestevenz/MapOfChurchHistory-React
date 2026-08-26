export type TraditionId =
  | 'east-syriac'
  | 'oriental'
  | 'orthodox'
  | 'undivided'
  | 'catholic'
  | 'protestant'
  | 'radical'
  | 'anglican'
  | 'methodist'
  | 'pentecostal'

export type ColorFamily = 'gold' | 'sapphire' | 'ruby' | 'emerald' | 'amethyst'

export interface Tradition {
  id: TraditionId
  /** Short name shown in lane headers and legend. */
  name: string
  /** One-line description of the branch. */
  blurb: string
  /** Horizontal position of the branch, left to right. */
  lane: number
  family: ColorFamily
}

export type EventKind = 'event' | 'council' | 'schism' | 'reunion'

/** Either a built-in line icon or an admin-uploaded picture. */
export type EventIcon =
  | { type: 'lucide'; name: string }
  | { type: 'image'; src: string }

export interface ExternalLink {
  label: string
  url: string
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
}

export interface TimelineData {
  version: number
  events: TimelineEvent[]
}

/* --- Community edit suggestions --------------------------------------- */

/** Text fields an ordinary visitor is allowed to propose changes to. */
export type SuggestableField = 'title' | 'dateLabel' | 'summary' | 'detail'

export const SUGGESTABLE_FIELDS: {
  field: SuggestableField
  label: string
  multiline: boolean
}[] = [
  { field: 'title', label: 'Title', multiline: false },
  { field: 'dateLabel', label: 'Date', multiline: false },
  { field: 'summary', label: 'Summary', multiline: true },
  { field: 'detail', label: 'Full description', multiline: true },
]

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
