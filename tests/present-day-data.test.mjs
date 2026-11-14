import assert from 'node:assert/strict'
import test from 'node:test'
import {
  PRESENT_DAY_DEFINITIONS,
  PRESENT_DAY_YEAR,
  withPresentDayEndpoints,
} from '../lib/present-day-data.ts'

const traditions = Object.keys(PRESENT_DAY_DEFINITIONS)
const historicalEvents = traditions.map((tradition, index) => ({
  id: `latest-${tradition}`,
  year: 1900 + index,
  dateLabel: String(1900 + index),
  title: `Latest ${tradition}`,
  tradition,
  parents: [],
  kind: 'event',
  icon: { type: 'lucide', name: 'Landmark' },
  summary: '',
  detail: '',
}))

test('adds one sourced present-day endpoint to every continuing branch', () => {
  const result = withPresentDayEndpoints(historicalEvents)
  const endpoints = result.filter((event) => event.presentDay)

  assert.equal(endpoints.length, 9)
  assert.deepEqual(
    new Set(endpoints.map((event) => event.tradition)),
    new Set(traditions),
  )

  for (const endpoint of endpoints) {
    assert.equal(endpoint.year, PRESENT_DAY_YEAR)
    assert.deepEqual(endpoint.parents, [`latest-${endpoint.tradition}`])
    assert.ok(endpoint.presentDay.membership)
    assert.ok(endpoint.presentDay.membershipNote)
    assert.ok(endpoint.presentDay.geography)
    assert.ok(endpoint.presentDay.currentDevelopments.length >= 2)
    assert.ok(endpoint.links.length >= 1)
    assert.ok(endpoint.links.every((link) => link.url.startsWith('https://')))
  }
})

test('generated endpoints are replaced rather than duplicated', () => {
  const once = withPresentDayEndpoints(historicalEvents)
  const twice = withPresentDayEndpoints(once)

  assert.equal(
    twice.filter((event) => event.presentDay).length,
    traditions.length,
  )
})

test('a branch without historical events does not get a disconnected endpoint', () => {
  const withoutPentecostal = historicalEvents.filter(
    (event) => event.tradition !== 'pentecostal',
  )
  const result = withPresentDayEndpoints(withoutPentecostal)

  assert.equal(
    result.some((event) => event.id === 'present-day-pentecostal'),
    false,
  )
})
