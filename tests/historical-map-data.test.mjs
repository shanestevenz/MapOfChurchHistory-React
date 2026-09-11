import assert from 'node:assert/strict'
import test from 'node:test'
import {
  coordinateInRegion,
  formatHistoricalYear,
  MAP_LANDMARKS,
  MAP_REGIONS,
  MAP_SNAPSHOTS,
} from '../lib/historical-map-data.ts'

test('historical snapshots are chronological and contain unique territories', () => {
  const years = MAP_SNAPSHOTS.map((snapshot) => snapshot.year)
  assert.deepEqual(years, [...years].sort((a, b) => a - b))
  assert.equal(new Set(years).size, years.length)

  for (const snapshot of MAP_SNAPSHOTS) {
    assert(snapshot.territories.length > 0)
    const ids = snapshot.territories.map((territory) => territory.id)
    assert.equal(new Set(ids).size, ids.length)
  }
})

test('territory polygons contain valid coordinates and closed rings', () => {
  for (const snapshot of MAP_SNAPSHOTS) {
    for (const territory of snapshot.territories) {
      for (const ring of territory.polygons) {
        assert(ring.length >= 4, `${territory.id} has an underspecified ring`)
        assert.deepEqual(ring[0], ring.at(-1), `${territory.id} has an open ring`)
        for (const [longitude, latitude] of ring) {
          assert(longitude >= -180 && longitude <= 180)
          assert(latitude >= -90 && latitude <= 90)
        }
      }
    }
  }
})

test('landmarks use unique IDs and valid WGS84 coordinates', () => {
  assert.equal(new Set(MAP_LANDMARKS.map((landmark) => landmark.id)).size, MAP_LANDMARKS.length)
  for (const landmark of MAP_LANDMARKS) {
    const [longitude, latitude] = landmark.coordinate
    assert(longitude >= -180 && longitude <= 180)
    assert(latitude >= -90 && latitude <= 90)
    if (landmark.until !== undefined) assert(landmark.until >= landmark.from)
  }
})

test('region filtering and historical year labels are stable', () => {
  const italy = MAP_REGIONS.find((region) => region.id === 'italy')
  assert(italy)
  assert.equal(coordinateInRegion([12.4964, 41.9028], italy), true)
  assert.equal(coordinateInRegion([35.2137, 31.7683], italy), false)
  assert.equal(formatHistoricalYear(325), 'AD 325')
  assert.equal(formatHistoricalYear(-44), '44 BC')
})
