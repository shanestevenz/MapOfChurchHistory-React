import assert from 'node:assert/strict'
import test from 'node:test'
import { TRADITIONS } from '../lib/timeline-data.ts'
import {
  activeFilterCount,
  applyFilters,
  DEFAULT_FILTERS,
  emptyTraditions,
  FILTER_PRESETS,
  lineageOf,
  TRADITION_CATEGORIES,
} from '../lib/timeline-filters.ts'

const event = (id, year, tradition, parents = [], kind = 'event') => ({
  id,
  year,
  dateLabel: String(year),
  title: id,
  tradition,
  parents,
  kind,
  icon: { type: 'lucide', name: 'Church' },
  summary: '',
  detail: '',
})

const events = [
  event('root', 33, 'undivided'),
  event('council', 325, 'undivided', ['root'], 'council'),
  event('split', 1054, 'catholic', ['council'], 'schism'),
  event('reform', 1517, 'protestant', ['split']),
  event('baptists', 1609, 'baptist', ['reform']),
]

test('every tradition belongs to exactly one category', () => {
  const grouped = TRADITION_CATEGORIES.flatMap((category) => category.traditions)
  assert.equal(grouped.length, TRADITIONS.length)
  assert.equal(new Set(grouped).size, TRADITIONS.length)
  for (const id of ['eastern', 'western', 'protestant', 'other']) {
    assert.ok(TRADITION_CATEGORIES.some((category) => category.id === id))
  }
})

test('default filters show everything unchanged', () => {
  assert.deepEqual(applyFilters(events, DEFAULT_FILTERS), events)
  assert.equal(activeFilterCount(DEFAULT_FILTERS), 0)
})

test('hidden events are bridged to their nearest visible ancestor', () => {
  const result = applyFilters(events, {
    ...DEFAULT_FILTERS,
    hiddenTraditions: ['catholic'],
    hiddenKinds: ['council'],
  })
  const byId = Object.fromEntries(result.map((item) => [item.id, item]))
  assert.equal(byId.split, undefined)
  assert.equal(byId.council, undefined)
  assert.deepEqual(byId.reform.parents, ['root'])
  assert.deepEqual(byId.baptists.parents, ['reform'])
})

test('era filters remove events in that era', () => {
  const result = applyFilters(events, {
    ...DEFAULT_FILTERS,
    hiddenEras: ['Reformation'],
  })
  assert.deepEqual(
    result.map((item) => item.id),
    ['root', 'council', 'split'],
  )
  assert.ok(emptyTraditions(result).has('baptist'))
})

test('lineage covers ancestors and descendants but not siblings', () => {
  const withSibling = [...events, event('orthodox', 1054, 'orthodox', ['council'])]
  const lineage = lineageOf(withSibling, 'split')
  assert.deepEqual(
    [...lineage].sort(),
    ['baptists', 'council', 'reform', 'root', 'split'],
  )
})

test('presets keep display preferences', () => {
  const custom = { ...DEFAULT_FILTERS, compactLabels: true }
  for (const preset of FILTER_PRESETS) {
    assert.equal(preset.apply(custom).compactLabels, true)
  }
})
