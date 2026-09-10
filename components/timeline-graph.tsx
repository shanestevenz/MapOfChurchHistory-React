'use client'

import * as React from 'react'
import { ChevronRightIcon, PencilIcon } from 'lucide-react'
import { EventIcon } from '@/components/event-icon'
import {
  buildLayout,
  COL_WIDTH,
  ERA_BAR,
  laneTop,
  NODE_SIZE,
} from '@/lib/timeline-layout'
import type { TimelineEvent, TimelineGroup, TraditionId } from '@/lib/timeline-types'
import { cn } from '@/lib/utils'

const KIND_LABEL: Record<TimelineEvent['kind'], string> = {
  event: 'Milestone',
  council: 'Council',
  schism: 'Division',
  reunion: 'Reunion',
}

export const MIN_ZOOM = 0.3
export const MAX_ZOOM = 2
const LANE_GUTTER = 200
const GROUP_BAR = 48
const TIMELINE_HEADER = ERA_BAR + GROUP_BAR

const clampZoom = (value: number) =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))

interface TimelineGraphProps {
  events: TimelineEvent[]
  groups: TimelineGroup[]
  hidden: Set<TraditionId>
  selectedId: string | null
  isAdmin: boolean
  zoom: number
  onZoomChange: (zoom: number) => void
  onSelect: (event: TimelineEvent) => void
  onEdit: (event: TimelineEvent) => void
}

/**
 * Middle-button drag pans the canvas and the wheel zooms about the pointer.
 * Native listeners are used so the browser's own middle-click autoscroll and
 * default wheel scrolling never take over.
 */
function useCanvasGestures(
  ref: React.RefObject<HTMLDivElement | null>,
  zoom: number,
  onZoomChange: (zoom: number) => void,
) {
  const [isPanning, setIsPanning] = React.useState(false)
  const [renderedZoom, setRenderedZoom] = React.useState(zoom)

  // The requested zoom and the zoom currently drawn are deliberately separate:
  // wheel notches update the target, while one animation loop eases the canvas
  // toward it. This also coalesces high-frequency trackpad events.
  const renderedZoomRef = React.useRef(zoom)
  const targetZoomRef = React.useRef(zoom)
  const onZoomChangeRef = React.useRef(onZoomChange)
  onZoomChangeRef.current = onZoomChange
  const animationRef = React.useRef<number | null>(null)
  const anchorRef = React.useRef<{
    contentX: number
    contentY: number
    pointerX: number
    pointerY: number
  } | null>(null)

  const animate = React.useCallback(() => {
    if (animationRef.current !== null) return

    const tick = () => {
      const current = renderedZoomRef.current
      const target = targetZoomRef.current
      const difference = target - current
      const next = Math.abs(difference) < 0.001 ? target : current + difference * 0.24

      renderedZoomRef.current = next
      setRenderedZoom(next)

      if (next === target) {
        animationRef.current = null
        return
      }
      animationRef.current = requestAnimationFrame(tick)
    }

    animationRef.current = requestAnimationFrame(tick)
  }, [])

  // Keep the chosen canvas point stationary as each eased scale is committed.
  React.useLayoutEffect(() => {
    const el = ref.current
    const anchor = anchorRef.current
    if (!el || !anchor) return
    el.scrollLeft =
      LANE_GUTTER + anchor.contentX * renderedZoom - anchor.pointerX
    el.scrollTop =
      anchor.contentY * renderedZoom + TIMELINE_HEADER - anchor.pointerY
  }, [ref, renderedZoom])

  // Zoom-control buttons use the centre of the visible canvas as their anchor.
  React.useEffect(() => {
    if (Math.abs(zoom - targetZoomRef.current) < 0.0001) return
    const el = ref.current
    if (!el) return
    const current = renderedZoomRef.current
    const pointerX = el.clientWidth / 2
    const pointerY = el.clientHeight / 2
    anchorRef.current = {
      contentX: (el.scrollLeft + pointerX - LANE_GUTTER) / current,
      contentY: (el.scrollTop + pointerY - TIMELINE_HEADER) / current,
      pointerX,
      pointerY,
    }
    targetZoomRef.current = clampZoom(zoom)
    animate()
  }, [animate, ref, zoom])

  React.useEffect(() => {
    const el = ref.current
    if (!el) return

    let active = false
    let originX = 0
    let originY = 0
    let startLeft = 0
    let startTop = 0

    const onMove = (event: MouseEvent) => {
      if (!active) return
      event.preventDefault()
      el.scrollLeft = startLeft - (event.clientX - originX)
      el.scrollTop = startTop - (event.clientY - originY)
    }

    const stop = () => {
      if (!active) return
      active = false
      setIsPanning(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', stop)
    }

    const onDown = (event: MouseEvent) => {
      if (event.button !== 1) return
      // Suppresses the OS autoscroll cursor and middle-click paste.
      event.preventDefault()
      active = true
      setIsPanning(true)
      originX = event.clientX
      originY = event.clientY
      startLeft = el.scrollLeft
      startTop = el.scrollTop
      window.addEventListener('mousemove', onMove, { passive: false })
      window.addEventListener('mouseup', stop)
    }

    // Middle-click on a link or button would otherwise open a tab.
    const onAuxClick = (event: MouseEvent) => {
      if (event.button === 1) event.preventDefault()
    }

    const onWheel = (event: WheelEvent) => {
      // Shift+wheel keeps a conventional sideways scroll available.
      if (event.shiftKey) return
      event.preventDefault()

      const current = renderedZoomRef.current
      const target = targetZoomRef.current
      // deltaMode makes line- and page-based mouse wheels behave like pixel
      // trackpads, then the exponential keeps zoom speed resolution-independent.
      const delta =
        event.deltaY *
        (event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? 16
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? el.clientHeight
            : 1)
      const next = clampZoom(target * Math.exp(-delta * 0.0012))
      if (next === target) return

      const rect = el.getBoundingClientRect()
      const pointerX = event.clientX - rect.left
      const pointerY = event.clientY - rect.top

      // Content coordinate under the cursor, in unscaled canvas units.
      anchorRef.current = {
        contentX: (el.scrollLeft + pointerX - LANE_GUTTER) / current,
        contentY: (el.scrollTop + pointerY - TIMELINE_HEADER) / current,
        pointerX,
        pointerY,
      }

      targetZoomRef.current = next
      onZoomChangeRef.current(next)
      animate()
    }

    el.addEventListener('mousedown', onDown)
    el.addEventListener('auxclick', onAuxClick)
    el.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('blur', stop)

    return () => {
      el.removeEventListener('mousedown', onDown)
      el.removeEventListener('auxclick', onAuxClick)
      el.removeEventListener('wheel', onWheel)
      window.removeEventListener('blur', stop)
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current)
      stop()
    }
  }, [animate, ref])

  return { isPanning, renderedZoom }
}

export function TimelineGraph({
  events,
  groups,
  hidden,
  selectedId,
  isAdmin,
  zoom,
  onZoomChange,
  onSelect,
  onEdit,
}: TimelineGraphProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const { isPanning, renderedZoom } = useCanvasGestures(
    scrollRef,
    zoom,
    onZoomChange,
  )

  const [groupOverrides, setGroupOverrides] = React.useState<
    Record<string, boolean>
  >({})
  const [isLayoutAnimating, setIsLayoutAnimating] = React.useState(false)
  const layoutAnimationRef = React.useRef<number | null>(null)
  const [collapsingGroups, setCollapsingGroups] = React.useState<Set<string>>(
    new Set(),
  )
  const collapseTimersRef = React.useRef<Map<string, number>>(new Map())
  const startLayoutAnimation = React.useCallback(() => {
    setIsLayoutAnimating(true)
    if (layoutAnimationRef.current !== null) {
      window.clearTimeout(layoutAnimationRef.current)
    }
    layoutAnimationRef.current = window.setTimeout(() => {
      setIsLayoutAnimating(false)
      layoutAnimationRef.current = null
    }, 380)
  }, [])
  const expandedGroups = React.useMemo(
    () =>
      new Set(
        groups.filter(
          (group) =>
            groupOverrides[group.id] ?? renderedZoom >= group.autoExpandZoom,
        ).map((group) => group.id),
      ),
    [groupOverrides, groups, renderedZoom],
  )
  const visibleEvents = React.useMemo(
    () =>
      events.filter(
        (event) => !event.groupId || expandedGroups.has(event.groupId),
      ),
    [events, expandedGroups],
  )
  React.useEffect(
    () => () => {
      if (layoutAnimationRef.current !== null) {
        window.clearTimeout(layoutAnimationRef.current)
      }
      for (const timer of collapseTimersRef.current.values()) {
        window.clearTimeout(timer)
      }
    },
    [],
  )
  const layout = React.useMemo(
    () => buildLayout(visibleEvents, hidden),
    [hidden, visibleEvents],
  )
  const { nodes, edges, eras, lanes, width, height } = layout

  const scaledWidth = width * renderedZoom
  const scaledHeight = height * renderedZoom
  const totalWidth = LANE_GUTTER + scaledWidth

  // Open on the trunk rather than an empty lane at the top of the canvas.
  const firstY = nodes[0]?.y
  const didCenter = React.useRef(false)
  React.useEffect(() => {
    const el = scrollRef.current
    if (!el || didCenter.current || firstY === undefined) return
    didCenter.current = true
    el.scrollTop = Math.max(0, firstY - el.clientHeight / 2)
  }, [firstY])

  return (
    <div
      ref={scrollRef}
      className={cn(
        'no-scrollbar relative h-full overflow-auto rounded-xl border border-border bg-card/40',
        isPanning && 'cursor-grabbing select-none',
      )}
    >
      <div
        className={cn(
          'relative',
          isLayoutAnimating &&
            'transition-[width,height] duration-[350ms] ease-in-out',
        )}
        style={{ width: totalWidth, height: scaledHeight + TIMELINE_HEADER }}
      >
        {/* Era ruler stays pinned and keeps a constant height as you zoom. */}
        <div
          className={cn(
            'sticky top-0 z-20 border-b border-border bg-card/85 backdrop-blur',
            isLayoutAnimating &&
              'transition-[width] duration-[350ms] ease-in-out',
          )}
          style={{ width: totalWidth, height: ERA_BAR }}
        >
          <div
            className="sticky left-0 z-10 h-full border-r border-border bg-card/95"
            style={{ width: LANE_GUTTER }}
          />
          {eras.map((era) => (
            <div
              key={era.label}
              className={cn(
                'absolute inset-y-0 flex items-center border-l border-border/70 pl-3',
                isLayoutAnimating &&
                  'transition-[left,width] duration-[350ms] ease-in-out',
              )}
              style={{
                left: LANE_GUTTER + era.left * renderedZoom,
                width: (era.right - era.left) * renderedZoom,
              }}
            >
              <span className="label-caps text-[10px] whitespace-nowrap text-muted-foreground">
                {era.label}
              </span>
            </div>
          ))}
        </div>

        {/* Groups organize optional detail without creating parent edges. */}
        <div
          className={cn(
            'sticky z-20 border-b border-border bg-card/90 backdrop-blur',
            isLayoutAnimating &&
              'transition-[width] duration-[350ms] ease-in-out',
          )}
          style={{ top: ERA_BAR, width: totalWidth, height: GROUP_BAR }}
        >
          <div
            className="sticky left-0 z-10 h-full border-r border-border bg-card/95"
            style={{ width: LANE_GUTTER }}
          />
          {groups.map((group) => {
            const members = nodes.filter(
              (node) => node.event.groupId === group.id,
            )
            const insertion = nodes.findIndex(
              (node) => node.event.year >= group.startYear,
            )
            const following = insertion >= 0 ? nodes[insertion] : undefined
            const previous =
              insertion === -1
                ? nodes[nodes.length - 1]
                : insertion > 0
                  ? nodes[insertion - 1]
                  : undefined
            const isExpanded = expandedGroups.has(group.id)
            const left = members.length
              ? members[0].x - COL_WIDTH / 2
              : previous && following
                ? (previous.x + following.x) / 2 - COL_WIDTH / 2
                : previous
                  ? previous.x + COL_WIDTH / 2
                  : following
                    ? Math.max(0, following.x - COL_WIDTH / 2)
                    : 0
            const groupWidth = members.length
              ? members[members.length - 1].x - members[0].x + COL_WIDTH
              : COL_WIDTH
            const count = events.filter(
              (event) => event.groupId === group.id,
            ).length

            return (
              <button
                key={group.id}
                type="button"
                aria-expanded={isExpanded}
                onClick={() => {
                  if (collapsingGroups.has(group.id)) return
                  if (isExpanded) {
                    setCollapsingGroups((current) =>
                      new Set(current).add(group.id),
                    )
                    const timer = window.setTimeout(() => {
                      startLayoutAnimation()
                      setGroupOverrides((current) => ({
                        ...current,
                        [group.id]: false,
                      }))
                      setCollapsingGroups((current) => {
                        const next = new Set(current)
                        next.delete(group.id)
                        return next
                      })
                      collapseTimersRef.current.delete(group.id)
                    }, 240)
                    collapseTimersRef.current.set(group.id, timer)
                    return
                  }
                  startLayoutAnimation()
                  setGroupOverrides((current) => ({
                    ...current,
                    [group.id]: true,
                  }))
                }}
                className={cn(
                  'absolute top-1.5 flex h-9 items-center gap-2 overflow-hidden rounded-md border px-3 text-left transition-[background-color,border-color] duration-200 hover:bg-primary/15 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                  isLayoutAnimating &&
                    'transition-[left,width,background-color,border-color] duration-[350ms] ease-in-out',
                  isExpanded
                    ? 'border-primary/45 bg-primary/18'
                    : 'border-primary/25 bg-primary/8',
                )}
                style={{
                  left: LANE_GUTTER + left * renderedZoom,
                  width: Math.max(168, groupWidth * renderedZoom),
                }}
                title={`${isExpanded ? 'Collapse' : 'Expand'} ${group.title}`}
              >
                <ChevronRightIcon
                  className={cn(
                    'size-3.5 shrink-0 transition-transform duration-200',
                    isExpanded && 'rotate-90',
                  )}
                />
                <span className="min-w-0 truncate font-serif text-xs">
                  {group.title}
                </span>
                <span className="label-caps ml-auto shrink-0 text-[9px] text-muted-foreground">
                  {group.dateLabel} · {count}
                </span>
              </button>
            )
          })}
        </div>

        <div
          className={cn(
            'relative',
            isLayoutAnimating &&
              'transition-[width,height] duration-[350ms] ease-in-out',
          )}
          style={{ width: totalWidth, height: scaledHeight }}
        >
          <div
            className="sticky left-0 z-20 h-full border-r border-border bg-card/95 backdrop-blur"
            style={{ width: LANE_GUTTER }}
          >
            {lanes.map((lane) => (
              <span
                key={lane.id}
                className="label-caps pointer-events-none absolute left-3 flex items-center gap-2 rounded-full bg-secondary/90 px-2.5 py-1 text-[10px] whitespace-nowrap text-muted-foreground"
                style={{ top: laneTop(lane.slot) * renderedZoom + 8 }}
                title={lane.blurb}
              >
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: lane.color }}
                />
                {lane.name}
              </span>
            ))}
          </div>

          {/* Geometry and nodes scale together. */}
          <div
            className="absolute top-0 origin-top-left"
            style={{
              left: LANE_GUTTER,
              width,
              height,
              transform: `scale(${renderedZoom})`,
            }}
          >
            {/* This shares the node transform so it cannot lag during zoom. */}
            {groups.map((group) => {
              const members = nodes.filter(
                (node) => node.event.groupId === group.id,
              )
              if (members.length === 0) return null

              return (
                <div
                  key={group.id}
                  className={cn(
                    'pointer-events-none absolute inset-y-0 border-x border-primary/25 bg-linear-to-r from-primary/5 via-primary/10 to-primary/5',
                    collapsingGroups.has(group.id)
                      ? 'detail-group-collapse'
                      : 'detail-group-reveal',
                  )}
                  style={{
                    left: members[0].x - COL_WIDTH / 2,
                    width:
                      members[members.length - 1].x -
                      members[0].x +
                      COL_WIDTH,
                  }}
                  aria-hidden="true"
                />
              )
            })}

            {/* Draw grid and node connecting lines */}
            <svg
              className={cn(
                'absolute inset-0 transition-opacity duration-200',
                isLayoutAnimating && 'opacity-45',
              )}
              width={width}
              height={height}
              aria-hidden="true"
            >
              {/* Draw horizontal dotted grid lines */}
              {lanes.map((lane) => (
                <line
                  key={lane.id}
                  x1={0}
                  y1={lane.y}
                  x2={width}
                  y2={lane.y}
                  stroke="currentColor"
                  className="text-border"
                  strokeWidth={1}
                  strokeDasharray="2 8"
                />
              ))}

              {/* Draw vertical solid era lines */}
              {eras.map((era) => (
                <line
                  key={era.label}
                  x1={era.left}
                  y1={0}
                  x2={era.left}
                  y2={height}
                  stroke="currentColor"
                  className="text-border"
                  strokeWidth={1}
                />
              ))}

              {/* Draw lines connecting nodes */}
              {edges.map((edge) => {
                const [fromId, toId] = edge.id.split('->')
                const isActive = selectedId === fromId || selectedId === toId // Highlight edges connected to the selected node
                return (
                  <path
                    key={edge.id}
                    d={edge.path}
                    fill="none"
                    stroke={edge.color}
                    strokeWidth={edge.isBranch ? 3 : 1.75} // Thicker stroke for branch edges
                    strokeLinecap="round"
                    strokeDasharray={edge.isBranch ? "2 8" : "none"} // dotted stroke for branch edges
                    opacity={isActive ? 1 : 0.42}
                  />
                )
              })}
            </svg>

            {/* Draw event nodes */}
            {nodes.map(({ event, x, y, color }) => {
              const isSelected = selectedId === event.id
              return (
                <div
                  key={event.id}
                  className={cn(
                    'absolute flex flex-col items-center',
                    isLayoutAnimating &&
                      'transition-[left,top] duration-[350ms] ease-in-out',
                    event.groupId &&
                      isLayoutAnimating &&
                      'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-75 motion-safe:duration-[350ms]',
                    event.groupId &&
                      collapsingGroups.has(event.groupId) &&
                      'detail-node-collapse',
                  )}
                  style={{
                    left: x - COL_WIDTH / 2,
                    top: y - NODE_SIZE / 2,
                    width: COL_WIDTH,
                  }}
                >
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => onSelect(event)}
                      aria-label={`${event.title}, ${event.dateLabel}`}
                      className={cn(
                        'group relative flex items-center justify-center rounded-full border-2 bg-card text-foreground transition-transform duration-150 outline-none hover:scale-110 focus-visible:ring-3 focus-visible:ring-ring/50',
                        isSelected && 'scale-110',
                      )}
                      style={{
                        width: NODE_SIZE,
                        height: NODE_SIZE,
                        borderColor: color,
                        boxShadow: isSelected
                          ? `0 0 0 5px color-mix(in oklab, ${color} 22%, transparent)`
                          : undefined,
                      }}
                    >
                      {event.icon.type === 'image' ? (
                        <span className="size-full overflow-hidden rounded-full p-0.5">
                          <EventIcon icon={event.icon} title={event.title} />
                        </span>
                      ) : (
                        <EventIcon
                          icon={event.icon}
                          title={event.title}
                          className="size-5"
                        />
                      )}
                      {event.kind === 'schism' && (
                        <span
                          className="absolute -right-0.5 -bottom-0.5 size-2.5 rotate-45 rounded-[1px]"
                          style={{ backgroundColor: color }}
                        />
                      )}
                    </button>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => onEdit(event)}
                        aria-label={`Edit ${event.title}`}
                        className="absolute -top-1 -right-1 flex size-6 items-center justify-center rounded-full border border-border bg-secondary text-secondary-foreground transition-colors hover:bg-accent"
                      >
                        <PencilIcon className="size-3" />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelect(event)}
                    className="mt-2 flex w-full flex-col items-center gap-0.5 px-2 text-center outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <span className="label-caps text-[10px]" style={{ color }}>
                      {event.dateLabel}
                    </span>
                    <span
                      className={cn(
                        'font-serif text-[13px] leading-snug text-pretty text-foreground/90',
                        isSelected && 'text-foreground',
                      )}
                    >
                      {event.title}
                    </span>
                    <span className="label-caps text-[9px] text-muted-foreground/70">
                      {KIND_LABEL[event.kind]}
                    </span>
                  </button>
                </div>
              )
            })}
          </div>

        </div>
      </div>
    </div>
  )
}
