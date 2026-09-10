import { TRADITION_MAP, TRADITIONS } from './timeline-data'
import type { ColorFamily, TimelineEvent, TraditionId } from './timeline-types'

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
}

export function traditionColor(id: TraditionId): string {
  const tradition = TRADITION_MAP[id]
  return FAMILY_COLOR[tradition?.family ?? 'gold']
}

/** Top edge of a lane band, where its name label sits. */
export function laneTop(slot: number): number {
  return slot * LANE_HEIGHT
}

/** Vertical centre of a lane, where its nodes and rail sit. */
export function laneY(slot: number): number {
  return slot * LANE_HEIGHT + 58
}

export interface PositionedLane {
  id: TraditionId
  name: string
  blurb: string
  slot: number
  y: number
  color: string
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

const ERAS: { label: string; from: number; to: number }[] = [
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
  const visible = events.filter((event) => !hidden.has(event.tradition))
  const ordered = orderEvents(visible)

  // Hidden branches collapse their band rather than leaving a gap.
  const lanes: PositionedLane[] = [...TRADITIONS]
    .sort((a, b) => a.lane - b.lane)
    .filter((tradition) => !hidden.has(tradition.id))
    .map((tradition, slot) => ({
      id: tradition.id,
      name: tradition.name,
      blurb: tradition.blurb,
      slot,
      y: laneY(slot),
      color: traditionColor(tradition.id),
    }))

  const slotOf = new Map(lanes.map((lane) => [lane.id, lane.slot]))

  const nodes: PositionedEvent[] = ordered.map((event, col) => ({
    event,
    col,
    x: PAD_LEFT + col * COL_WIDTH,
    y: laneY(slotOf.get(event.tradition) ?? 0),
    color: traditionColor(event.tradition),
  }))

  const byId = new Map(nodes.map((node) => [node.event.id, node]))

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

  const width = PAD_LEFT + nodes.length * COL_WIDTH + PAD_RIGHT

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
    width,
    height: Math.max(lanes.length, 1) * LANE_HEIGHT,
  }
}
