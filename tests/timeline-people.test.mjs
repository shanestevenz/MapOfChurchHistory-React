import assert from 'node:assert/strict'
import test from 'node:test'
import { SEED_EVENTS, TRADITION_MAP, TRADITIONS } from '../lib/timeline-data.ts'
import { applyFilters, DEFAULT_FILTERS } from '../lib/timeline-filters.ts'
import { buildLayout, COL_WIDTH } from '../lib/timeline-layout.ts'
import {
  birthYearOf,
  buildPersonIndex,
  CHURCH_TAG,
  churchesOf,
  churchTagLabel,
  eventsFeaturing,
  groupConflicts,
  groupPeople,
  lifespanOf,
  nameKey,
  PERSON_TYPES,
} from '../lib/timeline-people.ts'
import { withPresentDayEndpoints } from '../lib/present-day-data.ts'

const people = SEED_EVENTS.filter((event) => event.kind === 'person')
const historical = SEED_EVENTS.filter((event) => event.kind !== 'person')

test('every lane has at least a few people', () => {
  for (const tradition of TRADITIONS) {
    const count = people.filter((person) => person.tradition === tradition.id).length
    assert.ok(count >= 3, `${tradition.id} has only ${count} people`)
  }
})

test('people are well formed', () => {
  const ids = new Set(SEED_EVENTS.map((event) => event.id))
  assert.equal(ids.size, SEED_EVENTS.length, 'event ids are unique')
  const types = new Set(PERSON_TYPES.map((type) => type.id))
  for (const person of people) {
    assert.ok(person.person, `${person.id} has person details`)
    assert.ok(person.person.role.trim(), `${person.id} has a role`)
    assert.ok(types.has(person.person.type), `${person.id} has a known type`)
    assert.deepEqual(person.parents, [], `${person.id} grows out of nothing`)
    assert.ok(!(person.person.affiliation && person.person.formerly), `${person.id} both belongs to and left a church`)
    if (person.person.formerly) {
      assert.ok(TRADITION_MAP[person.person.formerly], `${person.id} former church exists`)
      assert.notEqual(person.person.formerly, person.tradition)
    }
    if (person.person.affiliation) {
      assert.ok(TRADITION_MAP[person.person.affiliation], `${person.id} affiliation exists`)
      assert.notEqual(person.person.affiliation, person.tradition)
    }
  }
})

test('popes are kept to a handful', () => {
  const popes = people.filter((person) => /^Pope /.test(person.title))
  assert.ok(popes.length <= 8, `${popes.length} popes is too many`)
})

test('name keys ignore honorifics and accents but keep ordinals', () => {
  assert.equal(nameKey('Pope Leo I'), nameKey('Leo I'))
  assert.equal(nameKey('St. Augustine'), nameKey('Augustine'))
  assert.equal(nameKey('Karol Wojtyła'), nameKey('Karol Wojtyla'))
  assert.notEqual(nameKey('Gregory I'), nameKey('Gregory VII'))
})

test('key-figure tags on events find the matching person', () => {
  const index = buildPersonIndex(SEED_EVENTS)
  const cases = {
    'Martin Luther': 'person-luther',
    'Pope Leo I': 'person-leo-i',
    'Gregory I': 'person-gregory-i',
    'Gregory VII': 'person-gregory-vii',
    'Constantine I': 'person-constantine',
    'Augustine': 'person-augustine',
    'John Smyth': 'person-smyth',
    'Pope Innocent III': 'person-innocent-iii',
    'Innocent III': 'person-innocent-iii',
  }
  for (const [tag, id] of Object.entries(cases)) {
    assert.equal(index.get(nameKey(tag))?.id, id, tag)
  }
})

test('a person lists the events that name them', () => {
  const luther = people.find((person) => person.id === 'person-luther')
  const featured = eventsFeaturing(luther, SEED_EVENTS).map((event) => event.id)
  assert.ok(featured.includes('ninety-five-theses'))
  assert.ok(!featured.includes(luther.id))
})

test('people can be hidden entirely or by type', () => {
  const none = applyFilters(SEED_EVENTS, { ...DEFAULT_FILTERS, showPeople: false })
  assert.equal(none.filter((event) => event.kind === 'person').length, 0)
  assert.equal(none.length, historical.length)

  const noPopes = applyFilters(SEED_EVENTS, {
    ...DEFAULT_FILTERS,
    hiddenPersonTypes: ['church-leader'],
  })
  assert.ok(!noPopes.some((event) => event.person?.type === 'church-leader'))
  assert.ok(noPopes.some((event) => event.person?.type === 'theologian'))
})

test('people never become a branch’s present-day parent', () => {
  for (const endpoint of withPresentDayEndpoints(SEED_EVENTS).filter((event) => event.presentDay)) {
    for (const parent of endpoint.parents) {
      const event = SEED_EVENTS.find((candidate) => candidate.id === parent)
      assert.notEqual(event?.kind, 'person', `${endpoint.id} grows out of ${parent}`)
    }
  }
})

test('people share columns where their lane is free, so they add few columns', () => {
  const without = buildLayout(historical)
  const withPeople = buildLayout(SEED_EVENTS)
  const columns = (layout) => new Set(layout.nodes.map((node) => node.col)).size
  // Far fewer new columns than people.
  assert.ok(columns(withPeople) - columns(without) < people.length * 0.75)
  // No two nodes ever share a lane within a column.
  const seen = new Set()
  for (const node of withPeople.nodes) {
    const key = `${node.col}:${node.event.tradition}`
    assert.ok(!seen.has(key), `two nodes at ${key}`)
    seen.add(key)
  }
  // People sit in time order: nothing earlier-drawn is later than them, and
  // nothing later-drawn is earlier (bar events held back behind a parent).
  const byId = new Map(SEED_EVENTS.map((event) => [event.id, event]))
  const heldBack = (event) =>
    event.parents.some((parent) => (byId.get(parent)?.year ?? -Infinity) > event.year)
  for (const node of withPeople.nodes.filter((item) => item.event.kind === 'person')) {
    for (const other of withPeople.nodes) {
      if (other.event.presentDay || heldBack(other.event)) continue
      if (other.col < node.col) {
        assert.ok(other.event.year <= node.event.year, `${node.event.id} drawn after ${other.event.id}`)
      } else if (other.col > node.col) {
        assert.ok(other.event.year >= node.event.year, `${node.event.id} drawn before ${other.event.id}`)
      }
    }
  }
})

test('people do not move where a branch begins', () => {
  const without = buildLayout(historical)
  const withPeople = buildLayout(SEED_EVENTS)
  // Jan Hus (1415) sits on the Lutheran lane before 1517; the rail must still
  // start at the Ninety-five Theses.
  const start = (layout, id) => {
    const lane = layout.lanes.find((item) => item.id === id)
    const node = layout.nodes.find((item) => item.event.id === 'ninety-five-theses')
    return { lane: lane.startX, theses: node.x }
  }
  for (const layout of [without, withPeople]) {
    const { lane, theses } = start(layout, 'protestant')
    assert.equal(lane, theses)
  }
})

test('World History is the top lane, one continuous grey rail', () => {
  const world = TRADITIONS.find((tradition) => tradition.id === 'world')
  assert.equal(world.lane, 0)
  assert.equal(world.family, 'slate')
  const { lanes } = buildLayout(SEED_EVENTS)
  assert.equal(lanes[0].id, 'world')
  assert.equal(lanes[0].startX, 0)
  assert.equal(lanes[0].color, 'var(--muted-foreground)')
})

test('only curated groups are drawn as one node, never hiding a landmark', () => {
  const drawn = groupPeople(SEED_EVENTS)
  const groupsDrawn = drawn.filter((event) => event.personGroup)
  // For now, only the early Church Fathers are grouped.
  assert.deepEqual(groupsDrawn.map((group) => group.title), ['Early Church Fathers'])
  const fathers = groupsDrawn[0].personGroup.map((member) => member.id)
  assert.deepEqual(fathers, [
    'person-polycarp',
    'person-justin-martyr',
    'person-irenaeus',
    'person-tertullian',
    'person-origen',
  ])
  // Ignatius (c. 35 – c. 108) lived through the Council of Jerusalem (c. 50),
  // so he is drawn on his own despite belonging to the group.
  const ignatius = SEED_EVENTS.find((event) => event.id === 'person-ignatius-of-antioch')
  assert.equal(ignatius.person.group, 'Early Church Fathers')
  assert.deepEqual(groupConflicts(ignatius, SEED_EVENTS).map((event) => event.id), ['jerusalem-council'])
  assert.ok(drawn.some((event) => event.id === ignatius.id))
  // Nobody is lost or drawn twice.
  const members = groupsDrawn.flatMap((group) => group.personGroup)
  assert.equal(drawn.length - groupsDrawn.length + members.length, SEED_EVENTS.length)
})

test('a group splits where its combined lifetimes would span a landmark', () => {
  const lane = 'undivided'
  const make = (id, dateLabel, year) => ({
    id, year, dateLabel, title: id, tradition: lane, parents: [], kind: 'person',
    icon: { type: 'lucide', name: 'User' }, summary: '', detail: '', keyFigures: [], links: [],
    person: { role: 'x', type: 'theologian', group: 'G' },
  })
  const landmark = { ...make('landmark', '300', 300), kind: 'council', person: undefined }
  const events = [
    make('a', '100–150', 140), make('b', '160–220', 200),
    landmark,
    make('c', '320–360', 340), make('d', '330–390', 380),
    make('e', '250–330', 320), // lived through the landmark
  ]
  const groupsDrawn = groupPeople(events).filter((event) => event.personGroup)
  assert.deepEqual(
    groupsDrawn.map((group) => group.personGroup.map((member) => member.id)),
    [['a', 'b'], ['c', 'd']],
  )
})

test('lifespans are read from date labels', () => {
  const span = (dateLabel, year = 0) => lifespanOf({ dateLabel, year })
  assert.deepEqual(span('354–430'), [354, 430])
  assert.deepEqual(span('c. 155 – c. 220'), [155, 220])
  assert.deepEqual(span('c. 5 – c. 64/67'), [5, 67])
  assert.deepEqual(span('c. 4 BC – c. AD 30'), [-4, 30])
  assert.deepEqual(span('d. c. 64'), [4, 64])
})

test('Jesus and the apostles are not drawn as people', () => {
  for (const id of ['person-jesus', 'person-peter', 'person-paul']) {
    assert.ok(!SEED_EVENTS.some((event) => event.id === id), id)
  }
})

test('every person has a region', () => {
  for (const person of people) {
    assert.ok(person.person.region?.trim(), `${person.id} has no region`)
  }
})

test('people get a line from the larger church they belonged to or left', () => {
  const { affiliations, lanes, nodes } = buildLayout(SEED_EVENTS)
  const church = (person) => person.person.affiliation ?? person.person.formerly
  // A line needs its church's rail to exist where it leaves it: someone born
  // before their church's branch began (Conrad Grebel) gets the tag only.
  const railExists = (person) => {
    const node = nodes.find((item) => item.event.id === person.id)
    const lane = lanes.find((item) => item.id === church(person))
    return lane.startX !== null && node.x - COL_WIDTH / 2 >= lane.startX
  }
  const expected = people
    .filter((person) => church(person) && railExists(person))
    .map((person) => person.id)
    .sort()
  assert.deepEqual(affiliations.map((link) => link.personId).sort(), expected)
  for (const id of ['person-grebel', 'person-francis-david']) {
    assert.ok(!affiliations.some((link) => link.personId === id), `${id} has no line from nowhere`)
  }
  assert.ok(affiliations.some((link) => link.personId === 'person-luther'))
  for (const link of affiliations) {
    const node = nodes.find((item) => item.event.id === link.personId)
    const lane = lanes.find((item) => item.id === church(node.event))
    // Starts on that church's rail and ends level with the person.
    assert.equal(link.path.split(' ')[2], String(lane.y), link.personId)
    assert.ok(link.path.endsWith(` ${node.y}`))
  }
})

test('people are tagged with the churches they were part of', () => {
  const byId = (id) => people.find((person) => person.id === id)
  const tags = (id) => churchesOf(byId(id)).map((church) => CHURCH_TAG[church])
  assert.deepEqual(tags('person-sattler'), ['Catholic', 'Anabaptist'])
  assert.deepEqual(tags('person-luther'), ['Catholic', 'Lutheran'])
  // Forerunners aren't tagged with the later branch they are drawn on.
  assert.deepEqual(tags('person-wycliffe'), ['Catholic'])
  assert.deepEqual(tags('person-hus'), ['Catholic'])
  assert.deepEqual(tags('person-vladimir'), ['Undivided Church'])
  // Still members of their church, and part of the lane's movement too.
  assert.deepEqual(tags('person-edwards'), ['Reformed', 'Evangelical'])
  assert.deepEqual(tags('person-john-wesley'), ['Anglican', 'Methodist'])
  // World History is context, not a church.
  assert.deepEqual(tags('person-galileo'), ['Catholic'])
  assert.deepEqual(tags('person-muhammad'), [])
  assert.deepEqual(tags('person-augustine'), ['Undivided Church'])
})

test('persecution is its own field, for martyrs as well as the condemned', () => {
  const byId = (id) => people.find((person) => person.id === id)
  assert.match(byId('person-luther').person.persecution, /Excommunicated/)
  assert.match(byId('person-hus').person.persecution, /heretic/)
  assert.match(byId('person-polycarp').person.persecution, /Burned/)
  assert.match(byId('person-bonhoeffer').person.persecution, /hanged/)
  assert.ok(people.every((person) => !('condemned' in person.person)))
})


test('people are placed by birth year when it is known', () => {
  for (const person of people) {
    const born = birthYearOf(person)
    if (born !== null) assert.equal(person.year, born, person.id)
  }
  assert.equal(birthYearOf({ dateLabel: '354–430', year: 0 }), 354)
  assert.equal(birthYearOf({ dateLabel: 'c. 4 BC – c. AD 30', year: 0 }), -4)
  assert.equal(birthYearOf({ dateLabel: 'b. 1940', year: 0 }), 1940)
  assert.equal(birthYearOf({ dateLabel: 'd. 454', year: 0 }), null)
  // So Luther comes before the Ninety-five Theses, not after.
  const { nodes } = buildLayout(SEED_EVENTS)
  const col = (id) => nodes.find((node) => node.event.id === id).col
  assert.ok(col('person-luther') < col('ninety-five-theses'))
})

test('peace-church people are tagged with their movement, not just the lane', () => {
  const byId = (id) => people.find((person) => person.id === id)
  const tags = (id) => churchesOf(byId(id)).map((church) => churchTagLabel(byId(id), church))
  assert.deepEqual(tags('person-george-fox'), ['Quaker'])
  assert.deepEqual(tags('person-ann-lee'), ['Shaker'])
  assert.deepEqual(tags('person-menno'), ['Catholic', 'Mennonite'])
  assert.deepEqual(tags('person-alexander-mack'), ['Reformed', 'Brethren'])
  assert.deepEqual(tags('person-sattler'), ['Catholic', 'Anabaptist'])
  // The Quakers are not Anabaptists: their beginning grows out of English
  // Puritanism (the Reformed branch), not out of the Anabaptist line.
  const quakers = SEED_EVENTS.find((event) => event.id === 'quakers-founded')
  assert.deepEqual(quakers.parents, ['westminster'])
})
