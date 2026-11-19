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
    new Set(['radical', 'baptist', 'quaker']),
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

test('branch lines leave a schism from its node, other parents from the rail at the founding date', async () => {
  const { SEED_EVENTS } = await import('../lib/timeline-data.ts')
  const { buildLayout, branchStart, COL_WIDTH } = await import('../lib/timeline-layout.ts')
  const { edges, nodes } = buildLayout(SEED_EVENTS)
  const nodeOf = (id) => nodes.find((node) => node.event.id === id)
  const startX = (edge) => Number(edge.path.split(' ')[1])
  let schisms = 0
  let dated = 0
  for (const edge of edges.filter((item) => item.isBranch)) {
    const [parentId, childId] = edge.id.split('->')
    const parent = nodeOf(parentId)
    const child = nodeOf(childId)
    if (branchStart(child.event, parent.event) === 'node') {
      schisms += parent.event.kind === 'schism' ? 1 : 0
      assert.ok(startX(edge) > parent.x, `${edge.id} starts at the parent node`)
      assert.ok(startX(edge) < parent.x + COL_WIDTH / 2)
    } else {
      dated += 1
      assert.equal(startX(edge), child.x - COL_WIDTH / 2, `${edge.id} starts at the founding date`)
    }
  }
  assert.ok(schisms > 0 && dated > 0)
  // The 1054 schism's two churches come from the schism node itself.
  assert.equal(branchStart(nodeOf('eastern-orthodoxy').event, nodeOf('great-schism')?.event ?? { kind: 'schism' }), 'node')
  // An explicit setting wins.
  assert.equal(branchStart({ branchFrom: 'date' }, { kind: 'schism' }), 'date')
  assert.equal(branchStart({ branchFrom: 'node' }, { kind: 'event' }), 'node')
})
