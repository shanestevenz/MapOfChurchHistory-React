import type { SuggestableField } from '@/lib/timeline-types'

export const MAX_SUGGESTION_BODY_BYTES = 64 * 1024
export const MAX_SUGGESTION_CHANGES = 4

const FIELD_LIMITS: Record<SuggestableField, number> = {
  title: 200,
  dateLabel: 100,
  summary: 2_000,
  detail: 50_000,
}

const TOP_LEVEL_KEYS = new Set([
  'eventId',
  'contributor',
  'note',
  'changes',
  'source',
  'turnstileToken',
])
const CHANGE_KEYS = new Set(['field', 'after'])
const SOURCE_KEYS = new Set(['label', 'url'])

type JsonObject = Record<string, unknown>

export interface ValidatedSuggestion {
  eventId: string
  contributor: string
  note: string
  changes: { field: SuggestableField; after: string }[]
  source: { label: string; url: string } | null
  turnstileToken: string
}

export type SuggestionValidationResult =
  | { ok: true; value: ValidatedSuggestion }
  | { ok: false; error: string }

const isObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const hasOnlyKeys = (value: JsonObject, allowed: Set<string>) =>
  Object.keys(value).every((key) => allowed.has(key))

const fail = (error: string): SuggestionValidationResult => ({ ok: false, error })

export function validateSuggestionSubmission(
  input: unknown,
  options: { requireTurnstile: boolean },
): SuggestionValidationResult {
  if (!isObject(input) || !hasOnlyKeys(input, TOP_LEVEL_KEYS)) {
    return fail('The submission contains unsupported fields.')
  }

  if (
    typeof input.eventId !== 'string' ||
    !/^[a-z0-9-]{1,100}$/.test(input.eventId)
  ) {
    return fail('Choose a valid timeline event.')
  }

  const contributor =
    typeof input.contributor === 'string' && input.contributor.trim()
      ? input.contributor.trim()
      : 'Anonymous'
  if (contributor.length > 100) return fail('Your name is too long.')

  if (typeof input.note !== 'string' || !input.note.trim()) {
    return fail('Please include a short edit summary.')
  }
  const note = input.note.trim()
  if (note.length > 2_000) return fail('The edit summary is too long.')

  if (!Array.isArray(input.changes) || input.changes.length > MAX_SUGGESTION_CHANGES) {
    return fail('Submit no more than four field changes at once.')
  }

  const seen = new Set<SuggestableField>()
  const changes: ValidatedSuggestion['changes'] = []
  for (const item of input.changes) {
    if (!isObject(item) || !hasOnlyKeys(item, CHANGE_KEYS)) {
      return fail('A proposed change has an invalid shape.')
    }
    if (
      typeof item.field !== 'string' ||
      !Object.hasOwn(FIELD_LIMITS, item.field)
    ) {
      return fail('A proposed change targets an unsupported field.')
    }
    const field = item.field as SuggestableField
    if (seen.has(field)) return fail('Each field can be changed only once.')
    if (typeof item.after !== 'string' || !item.after.trim()) {
      return fail('Proposed text cannot be empty.')
    }
    const after = item.after.trim()
    if (after.length > FIELD_LIMITS[field]) {
      return fail(`The proposed ${field} text is too long.`)
    }
    seen.add(field)
    changes.push({ field, after })
  }

  let source: ValidatedSuggestion['source'] = null
  if (input.source !== undefined && input.source !== null) {
    if (!isObject(input.source) || !hasOnlyKeys(input.source, SOURCE_KEYS)) {
      return fail('The supporting source has an invalid shape.')
    }
    if (typeof input.source.url !== 'string') {
      return fail('Enter a valid HTTPS source URL.')
    }
    const rawUrl = input.source.url.trim()
    if (!rawUrl || rawUrl.length > 2_048) {
      return fail('Enter a valid HTTPS source URL.')
    }
    let url: URL
    try {
      url = new URL(rawUrl)
    } catch {
      return fail('Enter a valid HTTPS source URL.')
    }
    if (url.protocol !== 'https:' || url.username || url.password) {
      return fail('Sources must use HTTPS and cannot contain credentials.')
    }
    const label =
      typeof input.source.label === 'string' && input.source.label.trim()
        ? input.source.label.trim()
        : rawUrl
    if (label.length > 300) return fail('The source title is too long.')
    source = { label, url: url.toString() }
  }

  if (changes.length === 0 && source === null) {
    return fail('Change at least one field or include a supporting source.')
  }

  const turnstileToken =
    typeof input.turnstileToken === 'string' ? input.turnstileToken.trim() : ''
  if (turnstileToken.length > 2_048) return fail('The security check is invalid.')
  if (options.requireTurnstile && !turnstileToken) {
    return fail('Complete the security check before submitting.')
  }

  return {
    ok: true,
    value: { eventId: input.eventId, contributor, note, changes, source, turnstileToken },
  }
}
