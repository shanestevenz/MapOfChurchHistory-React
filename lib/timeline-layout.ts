import { TRADITION_MAP, TRADITIONS } from './timeline-data'
import type {
  ColorFamily,
  TimelineEvent,
  TraditionId,
  TraditionOrigin,
} from './timeline-types'

/** Time runs left to right: one column per event. */
export const COL_WIDTH = 172
/** Each tradition owns a horizontal band. */
export const LANE_HEIGHT = 152
export const NODE_SIZE = 56
/** Half a column keeps the first node centred without adding a blank column. */
export const PAD_LEFT = COL_WIDTH / 2
export const PAD_RIGHT = 140
/** Height of the era ruler pinned to the top of the canvas. */
export const ERA_BAR = 36

export const FAMILY_COLOR: Record<ColorFamily, string> = {
  gold: 'var(--chart-1)',
  sapphire: 'var(--chart-2)',
  ruby: 'var(--chart-3)',
  emerald: 'var(--chart-4)',
  amethyst: 'var(--chart-5)',
  copper: 'var(--chart-6)',
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
  /** The visual group this lane belongs to, if any. */
  groupId?: string
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
  lanes: TraditionId[]
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

export interface Era {
  label: string
  from: number
  to: number
  left: number
  right: number
}

export const ERAS: { label: string; from: number; to: number }[] = [
  { label: 'Apostolic', from: -1, to: 312 },
  { label: 'Imperial', from: 313, to: 600 },
  { label: 'Medieval', from: 601, to: 1450 },
  { label: 'Reformation', from: 1451, to: 1700 },
  { label: 'Modern', from: 1701, to: 3000 },
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

function edgePath(from: PositionedEvent, to: PositionedEvent): string {
  const radius = NODE_SIZE / 2 + 5
  const x1 = from.x + radius
  const x2 = to.x - radius
  if (from.y === to.y) return `M ${x1} ${from.y} L ${x2} ${to.y}`
  const dx = Math.max(x2 - x1, 28)
  return `M ${x1} ${from.y} C ${x1 + dx * 0.5} ${from.y} ${x2 - dx * 0.5} ${to.y} ${x2} ${to.y}`
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
  let top = 0
  for (const tradition of [...TRADITIONS].sort((a, b) => a.lane - b.lane)) {
    if (hidden.has(tradition.id)) continue
    const group = tradition.laneGroup
    let current = group && groups.at(-1)?.id === group.id ? groups.at(-1) : undefined
    if (group && !current) {
      current = {
        id: group.id,
        name: group.name,
        blurb: group.blurb,
        top,
        bottom: top,
        color: traditionColor(tradition.id),
        lanes: [],
      }
      groups.push(current)
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
      groupId: group?.id,
      origin: tradition.origins[0],
      startX: null,
    })
    top += LANE_HEIGHT
    if (current) {
      current.lanes.push(tradition.id)
      current.bottom = top
    }
  }
  const laneOf = new Map(lanes.map((lane) => [lane.id, lane]))

  // All generated present-day endpoints share one final column. This makes
  // every living branch visibly continue to the same point in time instead of
  // staggering "today" nodes across unrelated sequential columns.
  const historicalCount = ordered.filter((event) => !event.presentDay).length
  let historicalColumn = 0
  const nodes: PositionedEvent[] = ordered.map((event) => {
    const col = event.presentDay ? historicalCount : historicalColumn++
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
    const laneNodes = nodes.filter(
      (node) => node.event.tradition === lane.id && !node.event.presentDay,
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
        path: edgePath(parent, node),
        color: node.color,
        isBranch: parent.y !== node.y,
      })
    }
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
      from: era.from,
      to: era.to,
      left: first.x - COL_WIDTH / 2,
      right: last.x + COL_WIDTH / 2,
    })
  }

  return {
    nodes,
    edges,
    eras,
    lanes,
    laneGroups: groups,
    origins,
    width,
    height: Math.max(top, LANE_HEIGHT),
  }
}
