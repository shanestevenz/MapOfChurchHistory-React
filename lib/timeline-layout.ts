import { TRADITION_MAP, TRADITIONS } from './timeline-data'
import type {
  BranchFrom,
  ColorFamily,
  LaneGroup,
  TimelineEvent,
  TraditionId,
  TraditionOrigin,
} from './timeline-types'
import { parentChurchOf } from './timeline-types'

/** Time runs left to right: one column per event. */
export const COL_WIDTH = 172
/** Each tradition owns a horizontal band. */
export const LANE_HEIGHT = 152
export const NODE_SIZE = 56
/** Half a column keeps the first node centred without adding a blank column. */
export const PAD_LEFT = COL_WIDTH / 2
export const PAD_RIGHT = 140
/**
 * Space above the first lane, so its nodes and "Began here" flags (and nodes
 * enlarged on hover or when zoomed out) don't sit against the header bars.
 */
export const PAD_TOP = 28
/** Height of the era ruler pinned to the top of the canvas. */
export const ERA_BAR = 36

export const FAMILY_COLOR: Record<ColorFamily, string> = {
  gold: 'var(--chart-1)',
  sapphire: 'var(--chart-2)',
  ruby: 'var(--chart-3)',
  emerald: 'var(--chart-4)',
  amethyst: 'var(--chart-5)',
  copper: 'var(--chart-6)',
  // Neutral in every skin: World History is context, not a branch.
  slate: 'var(--muted-foreground)',
}

export function traditionColor(id: TraditionId): string {
  const tradition = TRADITION_MAP[id]
  return FAMILY_COLOR[tradition?.family ?? 'gold']
}

/** Space above a lane group for its header. */
export const GROUP_HEADER = 30
/** Offset from a lane's top edge to its centre line, where nodes sit. */
const LANE_CENTRE = 58

export interface PositionedLane {
  id: TraditionId
  name: string
  blurb: string
  slot: number
  /** Top edge of the lane band, where its name label sits. */
  top: number
  /** Vertical centre of the lane, where its nodes and rail sit. */
  y: number
  color: string
  /** The innermost visual group this lane belongs to, if any. */
  groupId?: string
  /** How many groups enclose this lane, for indenting its label. */
  depth: number
  /** When and where the branch began, for the lane header. */
  origin?: TraditionOrigin
  /** Where the branch begins on the canvas; its rail is drawn from here on. */
  startX: number | null
}

/** Consecutive lanes drawn together under one header, e.g. Other / Adjacent. */
export interface PositionedLaneGroup {
  id: string
  name: string
  blurb: string
  /** Top of the header; the group's lanes follow below it. */
  top: number
  bottom: number
  color: string
  /** Every lane inside the group, including those in nested groups. */
  lanes: TraditionId[]
  /** 0 for a top-level group, 1 for a group inside it, and so on. */
  depth: number
  /** Drawn visibly apart from the rest of the timeline (see LaneGroup). */
  setApart: boolean
}

/** A "began here" flag drawn above the event that starts a movement. */
export interface PositionedOrigin {
  eventId: string
  laneId: TraditionId
  x: number
  y: number
  color: string
  dateLabel: string
  place: string
}

export interface PositionedEvent {
  event: TimelineEvent
  col: number
  x: number
  y: number
  color: string
}

export interface PositionedEdge {
  id: string
  path: string
  color: string
  /** Cross-lane edges are the actual branch points — drawn heavier. */
  isBranch: boolean
}

/**
 * A dashed line from the larger church a person was a member of over to their
 * node on another lane: e.g. from the Undivided Church to Vladimir the Great
 * on the Eastern Orthodox lane, or from Roman Catholicism to Martin Luther.
 */
export interface PositionedAffiliation {
  id: string
  personId: string
  path: string
  color: string
}

/** Half the width of a person node (PERSON_NODE_WIDTH in person-node.tsx). */
const PERSON_HALF_WIDTH = 23

export interface Era {
  label: string
  /** Display range for the era ruler and tooltips, e.g. "313–600". */
  dates: string
  from: number
  to: number
  left: number
  right: number
}

/**
 * from/to decide which events fall in each era; `dates` is the conventional
 * range shown to people (shared boundary years, "today" for the open end).
 */
export const ERAS: { label: string; dates: string; from: number; to: number }[] = [
  { label: 'Apostolic', dates: 'AD 33–312', from: -1, to: 312 },
  { label: 'Imperial', dates: '313–600', from: 313, to: 600 },
  { label: 'Medieval', dates: '600–1450', from: 601, to: 1450 },
  { label: 'Reformation', dates: '1450–1700', from: 1451, to: 1700 },
  { label: 'Modern', dates: '1700–today', from: 1701, to: 3000 },
]

/**
 * Orders events by year, but never places a child before one of its parents.
 * Each event gets its own column, so the horizontal axis is sequence, not scale.
 */
function orderEvents(events: TimelineEvent[]): TimelineEvent[] {
  const pending = [...events].sort((a, b) => a.year - b.year)
  const present = new Set(events.map((event) => event.id))
  const placed = new Set<string>()
  const ordered: TimelineEvent[] = []

  while (pending.length > 0) {
    const index = pending.findIndex((event) =>
      event.parents.every((parent) => !present.has(parent) || placed.has(parent)),
    )
    // A cycle would leave nothing ready; fall back to year order.
    const next = pending.splice(index === -1 ? 0 : index, 1)[0]
    placed.add(next.id)
    ordered.push(next)
  }

  return ordered
}

/**
 * People and World History nodes are context rather than links in the tree:
 * they never branch, so they can share a column with whatever else is
 * happening at that point, as long as their own lane is free there.
 */
export function isContextNode(event: TimelineEvent): boolean {
  return event.kind === 'person' || Boolean(TRADITION_MAP[event.tradition]?.continuous)
}

/** Both events branch from exactly the same (non-empty) set of parents. */
function sameParents(a: TimelineEvent, b: TimelineEvent): boolean {
  if (a.parents.length === 0 || a.parents.length !== b.parents.length) return false
  return a.parents.every((parent) => b.parents.includes(parent))
}

function edgePath(from: PositionedEvent, to: PositionedEvent): string {
  const radius = NODE_SIZE / 2 + 5
  const x1 = from.x + radius
  const x2 = to.x - radius
  if (from.y === to.y) return `M ${x1} ${from.y} L ${x2} ${to.y}`
  const dx = Math.max(x2 - x1, 28)
  return `M ${x1} ${from.y} C ${x1 + dx * 0.5} ${from.y} ${x2 - dx * 0.5} ${to.y} ${x2} ${to.y}`
}

/**
 * A new branch's dotted line. Rather than reaching back to the parent node,
 * which may be centuries earlier, it leaves the parent's rail at the moment
 * the branch began: halfway between the child's column and the one before it
 * (where no node sits), then curves in to the child. The parent's rail always
 * exists there, since the parent is drawn in an earlier column.
 */
function branchPath(parentY: number, to: PositionedEvent): string {
  const x1 = to.x - COL_WIDTH / 2
  const x2 = to.x - (NODE_SIZE / 2 + 5)
  const dx = x2 - x1
  return `M ${x1} ${parentY} C ${x1 + dx * 0.5} ${parentY} ${x2 - dx * 0.5} ${to.y} ${x2} ${to.y}`
}

/** Where an event's branch line leaves a given parent (see TimelineEvent.branchFrom). */
export function branchStart(event: TimelineEvent, parent: TimelineEvent): BranchFrom {
  return event.branchFrom ?? (parent.kind === 'schism' ? 'node' : 'date')
}

export function buildLayout(
  events: TimelineEvent[],
  hidden: Set<TraditionId> = new Set(),
) {
  // An event whose tradition has no lane (e.g. stale data after a lane was
  // renamed) is left out rather than drawn in whichever lane happens to be
  // first, which would misrepresent its history.
  const visible = events.filter(
    (event) => !hidden.has(event.tradition) && event.tradition in TRADITION_MAP,
  )
  const ordered = orderEvents(visible)

  // One lane per tradition; hidden branches collapse rather than leaving a
  // gap. Traditions sharing a lane group sit together under a group header.
  const lanes: PositionedLane[] = []
  const groups: PositionedLaneGroup[] = []
  // Groups currently open, outermost first.
  let open: PositionedLaneGroup[] = []
  let top = PAD_TOP
  for (const tradition of [...TRADITIONS].sort((a, b) => a.lane - b.lane)) {
    if (hidden.has(tradition.id)) continue

    // The tradition's group chain, outermost first.
    const chain: LaneGroup[] = []
    for (let group = tradition.laneGroup; group; group = group.parent) {
      chain.unshift(group)
    }
    // Keep the groups this lane shares with the previous one; close the rest.
    let shared = 0
    while (
      shared < open.length &&
      shared < chain.length &&
      open[shared].id === chain[shared].id
    ) {
      shared++
    }
    open = open.slice(0, shared)
    // Open any new groups, each with header space above its lanes.
    for (const group of chain.slice(shared)) {
      const positioned: PositionedLaneGroup = {
        id: group.id,
        name: group.name,
        blurb: group.blurb,
        top,
        bottom: top,
        color: group.color ?? traditionColor(tradition.id),
        lanes: [],
        depth: open.length,
        setApart: Boolean(group.setApart),
      }
      groups.push(positioned)
      open.push(positioned)
      top += GROUP_HEADER
    }

    lanes.push({
      id: tradition.id,
      name: tradition.name,
      blurb: tradition.blurb,
      slot: lanes.length,
      top,
      y: top + LANE_CENTRE,
      color: traditionColor(tradition.id),
      groupId: open.at(-1)?.id,
      depth: open.length,
      origin: tradition.origins[0],
      startX: null,
    })
    top += LANE_HEIGHT
    for (const group of open) {
      group.lanes.push(tradition.id)
      group.bottom = top
    }
  }
  const laneOf = new Map(lanes.map((lane) => [lane.id, lane]))

  // Each event normally gets its own column. Branches born together share
  // one: events in the same year with exactly the same parents, in different
  // lanes (e.g. Eastern Orthodoxy and Roman Catholicism, both from the 1054
  // schism), are drawn one above the other. Context nodes (people and World
  // History) join the latest column whenever their lane is free in it, so
  // turning people on adds columns only where a lane is crowded. Because
  // events are in year order, this never puts a node before an earlier one.
  const columnOf = new Map<string, number>()
  let column = -1
  let current: TimelineEvent[] = []
  for (const event of ordered) {
    if (event.presentDay) continue
    const laneFree = current.every((other) => other.tradition !== event.tradition)
    const sharesColumn =
      current.length > 0 &&
      laneFree &&
      (isContextNode(event) ||
        current
          .filter((other) => !isContextNode(other))
          .every(
            (other) => other.year === event.year && sameParents(other, event),
          ))
    if (!sharesColumn) {
      column += 1
      current = []
    }
    current.push(event)
    columnOf.set(event.id, column)
  }

  // All generated present-day endpoints share one final column. This makes
  // every living branch visibly continue to the same point in time instead of
  // staggering "today" nodes across unrelated sequential columns.
  const historicalCount = column + 1
  const nodes: PositionedEvent[] = ordered.map((event) => {
    const col = event.presentDay ? historicalCount : columnOf.get(event.id)!
    return {
      event,
      col,
      x: PAD_LEFT + col * COL_WIDTH,
      y: laneOf.get(event.tradition)!.y,
      color: traditionColor(event.tradition),
    }
  })

  const byId = new Map(nodes.map((node) => [node.event.id, node]))

  // Origin markers show when and where each branch began. If the configured
  // event is missing, the lane's earliest historical event stands in.
  const origins: PositionedOrigin[] = []
  for (const lane of lanes) {
    const tradition = TRADITION_MAP[lane.id]
    // A continuous lane (World History) is one solid rail end to end.
    if (tradition.continuous) {
      lane.startX = 0
      continue
    }
    // People don't start a branch: Augustine on the Undivided lane, or Jan
    // Hus drawn ahead of the Lutheran branch, leave the rail where it was.
    const laneNodes = nodes.filter(
      (node) =>
        node.event.tradition === lane.id &&
        !node.event.presentDay &&
        node.event.kind !== 'person',
    )
    if (laneNodes.length === 0) continue
    lane.startX = laneNodes[0].x

    tradition.origins.forEach((origin, index) => {
      const node =
        byId.get(origin.eventId) ?? (index === 0 ? laneNodes[0] : undefined)
      if (!node || node.event.tradition !== lane.id) return
      if (index === 0) lane.startX = Math.min(lane.startX ?? node.x, node.x)
      origins.push({
        eventId: node.event.id,
        laneId: lane.id,
        x: node.x,
        y: node.y,
        color: lane.color,
        dateLabel: origin.dateLabel,
        place: origin.place,
      })
    })
  }

  const edges: PositionedEdge[] = []
  for (const node of nodes) {
    for (const parentId of node.event.parents) {
      const parent = byId.get(parentId)
      if (!parent) continue
      edges.push({
        id: `${parentId}->${node.event.id}`,
        path:
          parent.y === node.y || branchStart(node.event, parent.event) === 'node'
            ? edgePath(parent, node)
            : branchPath(parent.y, node),
        color: node.color,
        isBranch: parent.y !== node.y,
      })
    }
  }

  // Each line leaves the home branch's rail halfway between columns (where no
  // node sits) and curves in to the person's side, like a branch edge.
  const affiliations: PositionedAffiliation[] = []
  for (const node of nodes) {
    const home = parentChurchOf(node.event)
    if (!home) continue
    const lane = laneOf.get(home)
    if (!lane) continue
    const x1 = node.x - COL_WIDTH / 2
    // People are placed by birth, which can come before their church's
    // branch begins (Conrad Grebel, born 1498, later joined the Reformed in
    // Zürich). There is no rail there yet, so no line: the tag still says it.
    if (lane.startX === null || x1 < lane.startX) continue
    const x2 = node.x - PERSON_HALF_WIDTH - 4
    const dx = x2 - x1
    affiliations.push({
      id: `affiliation:${node.event.id}`,
      personId: node.event.id,
      path: `M ${x1} ${lane.y} C ${x1 + dx * 0.5} ${lane.y} ${x2 - dx * 0.5} ${node.y} ${x2} ${node.y}`,
      color: lane.color,
    })
  }

  const columnCount = nodes.length > 0
    ? Math.max(...nodes.map((node) => node.col)) + 1
    : 0
  const width = PAD_LEFT + columnCount * COL_WIDTH + PAD_RIGHT

  const eras: Era[] = []
  for (const era of ERAS) {
    const cols = nodes.filter(
      (node) => node.event.year >= era.from && node.event.year <= era.to,
    )
    if (cols.length === 0) continue
    const first = cols[0]
    const last = cols[cols.length - 1]
    eras.push({
      label: era.label,
      dates: era.dates,
      from: era.from,
      to: era.to,
      left: first.x - COL_WIDTH / 2,
      right: last.x + COL_WIDTH / 2,
    })
  }

  return {
    nodes,
    edges,
    affiliations,
    eras,
    lanes,
    laneGroups: groups,
    origins,
    width,
    height: Math.max(top, LANE_HEIGHT),
  }
}
