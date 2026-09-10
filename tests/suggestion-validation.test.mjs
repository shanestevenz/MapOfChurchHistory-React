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
