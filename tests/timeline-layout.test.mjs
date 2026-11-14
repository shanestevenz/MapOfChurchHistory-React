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
