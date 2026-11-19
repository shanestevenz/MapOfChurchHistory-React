import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MAX_SUGGESTION_BODY_BYTES,
  validateSuggestionSubmission,
} from '../lib/suggestion-validation.ts'

const valid = () => ({
  eventId: 'pentecost',
  contributor: 'Reader',
  note: 'Clarifies the wording.',
  changes: [{ field: 'summary', after: 'A clearer summary.' }],
  source: { label: 'Primary source', url: 'https://example.com/source' },
  turnstileToken: 'token',
})

test('accepts and normalizes a valid suggestion', () => {
  const result = validateSuggestionSubmission(valid(), { requireTurnstile: true })
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.value.source.url, 'https://example.com/source')
    assert.deepEqual(result.value.changes, [{ field: 'summary', after: 'A clearer summary.' }])
  }
})

test('rejects unsupported and duplicate fields', () => {
  assert.equal(
    validateSuggestionSubmission({ ...valid(), admin: true }, { requireTurnstile: true }).ok,
    false,
  )
  assert.equal(
    validateSuggestionSubmission(
      { ...valid(), changes: [valid().changes[0], valid().changes[0]] },
      { requireTurnstile: true },
    ).ok,
    false,
  )
})

test('rejects unsafe URLs, embedded credentials, and oversized text', () => {
  for (const url of [
    'javascript:alert(1)',
    'http://example.com',
    'https://user:password@example.com',
  ]) {
    assert.equal(
      validateSuggestionSubmission(
        { ...valid(), source: { label: 'Source', url } },
        { requireTurnstile: true },
      ).ok,
      false,
    )
  }
  assert.equal(
    validateSuggestionSubmission(
      { ...valid(), changes: [{ field: 'title', after: 'x'.repeat(201) }] },
      { requireTurnstile: true },
    ).ok,
    false,
  )
})

test('requires CAPTCHA only when configured', () => {
  const withoutToken = { ...valid(), turnstileToken: '' }
  assert.equal(validateSuggestionSubmission(withoutToken, { requireTurnstile: true }).ok, false)
  assert.equal(validateSuggestionSubmission(withoutToken, { requireTurnstile: false }).ok, true)
})

test('documents the endpoint body limit', () => {
  assert.equal(MAX_SUGGESTION_BODY_BYTES, 65_536)
})

test('a person’s group can be suggested, or cleared with an empty value', () => {
  const withGroup = (after) => ({ ...valid(), changes: [{ field: 'personGroup', after }] })
  const set = validateSuggestionSubmission(withGroup(' Early Church Fathers '), { requireTurnstile: true })
  assert.equal(set.ok, true)
  if (set.ok) assert.deepEqual(set.value.changes, [{ field: 'personGroup', after: 'Early Church Fathers' }])
  assert.equal(validateSuggestionSubmission(withGroup(''), { requireTurnstile: true }).ok, true)
  assert.equal(validateSuggestionSubmission(withGroup('x'.repeat(101)), { requireTurnstile: true }).ok, false)
  // Other fields still may not be emptied.
  assert.equal(
    validateSuggestionSubmission({ ...valid(), changes: [{ field: 'title', after: ' ' }] }, { requireTurnstile: true }).ok,
    false,
  )
})
