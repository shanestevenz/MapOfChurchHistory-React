import assert from 'node:assert/strict'
import test from 'node:test'
import { formatDecades } from '../components/date-text.tsx'

test('formatDecades writes decades with an apostrophe', () => {
  assert.equal(formatDecades('1960s'), '1960’s')
  assert.equal(formatDecades('1730s–1740s'), '1730’s–1740’s')
  assert.equal(formatDecades('c. 1880s'), 'c. 1880’s')
})

test('formatDecades leaves other dates alone', () => {
  for (const label of ['1517', 'c. AD 33', '1519–1536', 'AD 325', '1054', '2000', '1960']) {
    assert.equal(formatDecades(label), label)
  }
})
