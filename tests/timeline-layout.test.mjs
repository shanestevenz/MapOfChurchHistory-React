import assert from 'node:assert/strict'
import test from 'node:test'
import { TRADITIONS } from '../lib/timeline-data.ts'
import { buildLayout } from '../lib/timeline-layout.ts'

const chainOf = (tradition) => {
  const chain = []
  for (let group = tradition.laneGroup; group; group = group.parent) {
    chain.unshift(group.id)
  }
  return chain
}

test('each lane group occupies one unbroken run of lanes', () => {
  const ordered = [...TRADITIONS].sort((a, b) => a.lane - b.lane)
  const closed = new Set()
  let previous = []
  for (const tradition of ordered) {
    const chain = chainOf(tradition)
    for (const id of previous) {
      if (!chain.includes(id)) closed.add(id)
    }
    for (const id of chain) {
      assert.ok(
        !closed.has(id),
        `${tradition.id} reopens group "${id}"; move its lane next to the rest of that group`,
      )
    }
    previous = chain
  }
})

test('nested groups are laid out inside their parent', () => {
  const { laneGroups, lanes } = buildLayout([])
  const protestant = laneGroups.find((group) => group.id === 'protestant-family')
  const magisterial = laneGroups.find(
    (group) => group.id === 'magisterial-reformation',
  )
  assert.equal(protestant.depth, 0)
  assert.equal(magisterial.depth, 1)
  assert.ok(magisterial.top > protestant.top)
  assert.ok(magisterial.bottom <= protestant.bottom)
  assert.ok(protestant.lanes.includes('protestant'))
  assert.ok(protestant.lanes.includes('restoration'))

  const lutheran = lanes.find((lane) => lane.id === 'protestant')
  assert.equal(lutheran.depth, 2)
  assert.equal(lutheran.groupId, 'magisterial-reformation')
})

test('a group with every lane hidden disappears', () => {
  const { laneGroups } = buildLayout(
    [],
    new Set(['radical', 'baptist']),
  )
  assert.equal(
    laneGroups.some((group) => group.id === 'radical-free-church'),
    false,
  )
  assert.ok(laneGroups.some((group) => group.id === 'protestant-family'))
})

const event = (id, year, tradition, parents = []) => ({
  id,
  year,
  dateLabel: String(year),
  title: id,
  tradition,
  parents,
  kind: 'event',
  icon: { type: 'lucide', name: 'Church' },
  summary: '',
  detail: '',
})

test('branches born from the same event in the same year share a column', async () => {
  const { SEED_EVENTS } = await import('../lib/timeline-data.ts')
  const { nodes } = buildLayout(SEED_EVENTS)
  const at = (id) => nodes.find((node) => node.event.id === id)
  assert.equal(at('eastern-orthodoxy').x, at('roman-catholicism').x)
  assert.ok(at('great-schism').x < at('eastern-orthodoxy').x)
})

test('other events keep a column of their own', () => {
  const { nodes } = buildLayout([
    event('root', 100, 'undivided'),
    // Same year and lane-distinct, but different parents: separate columns.
    event('a', 200, 'orthodox', ['root']),
    event('b', 200, 'catholic', []),
    // Same parents and year, but the same lane: separate columns.
    event('c', 300, 'catholic', ['a']),
    event('d', 300, 'catholic', ['a']),
  ])
  const cols = Object.fromEntries(nodes.map((node) => [node.event.id, node.col]))
  assert.notEqual(cols.a, cols.b)
  assert.notEqual(cols.c, cols.d)
  assert.equal(new Set(Object.values(cols)).size, 5)
})
