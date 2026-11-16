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
  loadFilters,
  TRADITION_CATEGORIES,
  zoomOutScale,
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

test('zoomOutScale leaves nodes alone at or above 100% zoom', () => {
  assert.equal(zoomOutScale(1, 1), 1)
  assert.equal(zoomOutScale(1.5, 1), 1)
  assert.equal(zoomOutScale(0.5, 0), 1)
})

test('zoomOutScale grows nodes as you zoom out, scaled by strength', () => {
  assert.ok(Math.abs(zoomOutScale(0.5, 1) - 2) < 1e-9, 'full strength cancels the zoom')
  assert.ok(Math.abs(zoomOutScale(0.25, 0.5) - 2) < 1e-9, 'half strength is the square root')
  assert.ok(zoomOutScale(0.3, 0.7) > zoomOutScale(0.6, 0.7), 'grows more the further out')
  assert.equal(zoomOutScale(0.5, 5), zoomOutScale(0.5, 1), 'strength is clamped to 1')
  assert.equal(zoomOutScale(0, 1), 1, 'ignores a zero zoom')
})

test('loadFilters sanitises stored enlargement settings', () => {
  const store = new Map()
  globalThis.window = { localStorage: { getItem: (key) => store.get(key) ?? null } }
  try {
    store.set('timeline-filters:v1', JSON.stringify({
      version: 2,
      enlargeOrigins: false,
      enlargeKinds: ['council', 'bogus'],
      enlargeMode: 'sideways',
      enlargeStrength: 7,
    }))
    const loaded = loadFilters()
    assert.deepEqual(loaded.enlargeKinds, ['council'])
    assert.equal(loaded.enlargeMode, 'node')
    assert.equal(loaded.enlargeStrength, 1)
    assert.equal(loaded.enlargeOrigins, false, 'a current choice to turn it off is kept')
    assert.equal('version' in loaded, false, 'the storage version is not a filter')

    store.set('timeline-filters:v1', JSON.stringify({ version: 2, compactLabels: true }))
    assert.deepEqual(loadFilters().enlargeKinds, [], 'missing settings get the defaults')
  } finally {
    delete globalThis.window
  }
})

test('“Began here” nodes enlarge by default, at 50% strength', () => {
  assert.equal(DEFAULT_FILTERS.enlargeOrigins, true)
  assert.equal(DEFAULT_FILTERS.enlargeStrength, 0.5)
  assert.ok(Math.abs(zoomOutScale(0.3, DEFAULT_FILTERS.enlargeStrength) - 1.826) < 0.01)
})

test('loadFilters brings settings saved before the new defaults up to date', () => {
  const store = new Map()
  globalThis.window = { localStorage: { getItem: (key) => store.get(key) ?? null } }
  try {
    // Saved before versioning: enlarge was off by default and strength 70%.
    store.set('timeline-filters:v1', JSON.stringify({
      hiddenKinds: ['council'],
      compactLabels: true,
      enlargeOrigins: false,
      enlargeKinds: ['schism'],
      enlargeStrength: 0.7,
    }))
    const loaded = loadFilters()
    assert.equal(loaded.enlargeOrigins, true)
    assert.equal(loaded.enlargeStrength, 0.5)
    assert.deepEqual(loaded.hiddenKinds, ['council'], 'other choices are kept')
    assert.equal(loaded.compactLabels, true)
    assert.deepEqual(loaded.enlargeKinds, ['schism'])
  } finally {
    delete globalThis.window
  }
})
