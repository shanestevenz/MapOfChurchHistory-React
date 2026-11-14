'use client'

import * as React from 'react'
import { ChevronRightIcon, FlagIcon, PencilIcon } from 'lucide-react'
import { EventIcon } from '@/components/event-icon'
import {
  buildLayout,
  COL_WIDTH,
  ERA_BAR,
  GROUP_HEADER,
  NODE_SIZE,
  type PositionedEvent,
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
/** Jumping to an event below this zoom also zooms in, to FOCUS_ZOOM. */
const FOCUS_MIN_ZOOM = 0.75
const FOCUS_ZOOM = 1
/** Length of that zoom-in jump, and how far into it the zoom begins. */
const FLY_DURATION = 1100
const ZOOM_DELAY = 0.15
/** Rendered height of a lane-group header in the gutter, plus a small gap. */
const GROUP_HEADER_TEXT = 24
const TIMELINE_HEADER = ERA_BAR + GROUP_BAR

const clampZoom = (value: number) =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))

/**
 * Horizontal extent of a group in unscaled canvas units: the span of its
 * members when expanded, or one column at its place in time when collapsed.
 */
function groupSpan(
  group: TimelineGroup,
  nodes: PositionedEvent[],
): { left: number; width: number } {
  const members = nodes.filter((node) => node.event.groupId === group.id)
  if (members.length) {
    return {
      left: members[0].x - COL_WIDTH / 2,
      width: members[members.length - 1].x - members[0].x + COL_WIDTH,
    }
  }
  const insertion = nodes.findIndex((node) => node.event.year >= group.startYear)
  const following = insertion >= 0 ? nodes[insertion] : undefined
  const previous =
    insertion === -1
      ? nodes[nodes.length - 1]
      : insertion > 0
        ? nodes[insertion - 1]
        : undefined
  const left =
    previous && following
      ? (previous.x + following.x) / 2 - COL_WIDTH / 2
      : previous
        ? previous.x + COL_WIDTH / 2
        : following
          ? Math.max(0, following.x - COL_WIDTH / 2)
          : 0
  return { left, width: COL_WIDTH }
}

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
  /** Draw "Began here" flags on founding events. */
  showOrigins?: boolean
  /** Hide event-type captions and clamp titles to two lines. */
  compactLabels?: boolean
  /** When set, events outside this set are faded. */
  focusIds?: Set<string> | null
  /** Scroll an event into the middle of the view; a new key re-triggers it. */
  focusRequest?: { id: string; key: number } | null
}

/**
 * Left-button drag pans the canvas background and the wheel zooms about the
 * pointer. Interactive controls keep their normal click behavior.
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

  // A scripted "fly to" (see flyTo below). Any user zoom or pan cancels it.
  const flightRef = React.useRef<number | null>(null)
  const cancelFlight = React.useCallback(() => {
    if (flightRef.current !== null) cancelAnimationFrame(flightRef.current)
    flightRef.current = null
  }, [])

  const animate = React.useCallback(() => {
    cancelFlight()
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
  }, [cancelFlight])

  // The zoom the DOM is actually drawn at. renderedZoomRef runs one step ahead
  // (it is set before React commits the frame), so reading scroll positions
  // against it would mix two zoom levels and make the canvas jump.
  const committedZoomRef = React.useRef(zoom)

  // Keep the chosen canvas point stationary as each eased scale is committed.
  React.useLayoutEffect(() => {
    committedZoomRef.current = renderedZoom
    const el = ref.current
    const anchor = anchorRef.current
    if (!el || !anchor) return
    el.scrollLeft =
      LANE_GUTTER + anchor.contentX * renderedZoom - anchor.pointerX
    el.scrollTop =
      anchor.contentY * renderedZoom + TIMELINE_HEADER - anchor.pointerY
  }, [ref, renderedZoom])

  /**
   * Zooms to `toZoom` while carrying a canvas point from wherever it is on
   * screen to the middle of the view, as one eased motion. Scrolling first
   * and zooming after would fight: zoom frames re-set the scroll position.
   */
  const flyTo = React.useCallback(
    (contentX: number, contentY: number, toZoom: number, duration = FLY_DURATION) => {
      const el = ref.current
      if (!el) return
      cancelFlight()
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }

      const fromZoom = committedZoomRef.current
      const target = clampZoom(toZoom)
      const startX = LANE_GUTTER + contentX * fromZoom - el.scrollLeft
      const startY = contentY * fromZoom + TIMELINE_HEADER - el.scrollTop
      const endX = LANE_GUTTER + (el.clientWidth - LANE_GUTTER) / 2
      const endY = TIMELINE_HEADER + (el.clientHeight - TIMELINE_HEADER) / 2

      // Record the destination first so the zoom prop echoing back from the
      // parent is recognised as already handled, not a new request.
      targetZoomRef.current = target
      onZoomChangeRef.current(target)

      const startedAt = performance.now()
      const step = (now: number) => {
        const t = Math.min(1, (now - startedAt) / duration)
        // Movement: ease in and out.
        const move = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
        // Zoom: starts a beat after the movement and builds gently, so the
        // view drifts toward the event before it grows.
        const zt = Math.min(1, Math.max(0, (t - ZOOM_DELAY) / (1 - ZOOM_DELAY)))
        const zoomEase = (1 - Math.cos(Math.PI * zt)) / 2
        // Interpolate zoom geometrically so it feels even at every scale.
        const nextZoom = fromZoom * (target / fromZoom) ** zoomEase
        anchorRef.current = {
          contentX,
          contentY,
          pointerX: startX + (endX - startX) * move,
          pointerY: startY + (endY - startY) * move,
        }
        renderedZoomRef.current = nextZoom
        setRenderedZoom(nextZoom)
        flightRef.current = t < 1 ? requestAnimationFrame(step) : null
      }
      flightRef.current = requestAnimationFrame(step)
    },
    [cancelFlight, ref],
  )

  // Zoom-control buttons use the centre of the visible canvas as their anchor.
  React.useEffect(() => {
    if (Math.abs(zoom - targetZoomRef.current) < 0.0001) return
    const el = ref.current
    if (!el) return
    const current = committedZoomRef.current
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
      if (event.button !== 0) return
      const target = event.target
      if (
        target instanceof Element &&
        target.closest(
          'button, a, input, textarea, select, [role="button"], [contenteditable="true"]',
        )
      ) {
        return
      }

      // Keep background drags from selecting labels or starting native drags.
      event.preventDefault()
      cancelFlight()
      active = true
      setIsPanning(true)
      originX = event.clientX
      originY = event.clientY
      startLeft = el.scrollLeft
      startTop = el.scrollTop
      window.addEventListener('mousemove', onMove, { passive: false })
      window.addEventListener('mouseup', stop)
    }

    const onWheel = (event: WheelEvent) => {
      // Shift+wheel keeps a conventional sideways scroll available.
      if (event.shiftKey) return
      event.preventDefault()

      const current = committedZoomRef.current
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
    el.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('blur', stop)

    return () => {
      el.removeEventListener('mousedown', onDown)
      el.removeEventListener('wheel', onWheel)
      window.removeEventListener('blur', stop)
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current)
      cancelFlight()
      stop()
    }
  }, [animate, cancelFlight, ref])

  return { isPanning, renderedZoom, anchorRef, flyTo }
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
  showOrigins = true,
  compactLabels = false,
  focusIds = null,
  focusRequest = null,
}: TimelineGraphProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const { isPanning, renderedZoom, anchorRef, flyTo } = useCanvasGestures(
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
  // Groups the zoom level has opened. This is state rather than derived from
  // the zoom alone, because a group only opens or closes on zoom while it is
  // on screen — changing one off screen would shift what the reader is
  // looking at without showing why.
  const [autoExpanded, setAutoExpanded] = React.useState<Set<string>>(
    () => new Set(),
  )
  const expandedGroups = React.useMemo(
    () =>
      new Set(
        groups
          .filter(
            (group) => groupOverrides[group.id] ?? autoExpanded.has(group.id),
          )
          .map((group) => group.id),
      ),
    [autoExpanded, groupOverrides, groups],
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
  const { nodes, edges, eras, lanes, laneGroups, origins, width, height } =
    layout

  // Latest values for the scroll listener, which outlives individual renders.
  const syncInputsRef = React.useRef({ groups, nodes, renderedZoom })
  syncInputsRef.current = { groups, nodes, renderedZoom }

  /** Opens or closes on-screen groups whose zoom threshold has been crossed. */
  const syncAutoExpanded = React.useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const { groups, nodes, renderedZoom } = syncInputsRef.current
    // Visible canvas range in unscaled units; the sticky lane gutter covers
    // the left edge of the scroll area.
    const viewLeft = el.scrollLeft / renderedZoom
    const viewRight =
      (el.scrollLeft + el.clientWidth - LANE_GUTTER) / renderedZoom

    setAutoExpanded((current) => {
      let next: Set<string> | null = null
      for (const group of groups) {
        const isOpen = current.has(group.id)
        // Close a little below the opening threshold so easing or a small
        // wheel movement near it cannot flip the group back and forth.
        const wants =
          renderedZoom >= group.autoExpandZoom * (isOpen ? 0.9 : 1)
        if (wants === isOpen) continue
        const { left, width: span } = groupSpan(group, nodes)
        if (left + span < viewLeft || left > viewRight) continue
        next ??= new Set(current)
        if (wants) next.add(group.id)
        else next.delete(group.id)
      }
      return next ?? current
    })
  }, [])

  // A layout effect, so a threshold crossing re-lays out before the frame is
  // painted instead of showing one frame of the old layout first.
  React.useLayoutEffect(() => {
    syncAutoExpanded()
  }, [groups, nodes, renderedZoom, syncAutoExpanded])

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    let frame: number | null = null
    const onScroll = () => {
      if (frame !== null) return
      frame = requestAnimationFrame(() => {
        frame = null
        syncAutoExpanded()
      })
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      if (frame !== null) cancelAnimationFrame(frame)
    }
  }, [syncAutoExpanded])

  // When zoom opens or closes a group, columns are inserted or removed and
  // everything after them moves. Shift the scroll position (and the zoom
  // anchor) by however far the event under the cursor moved, so it stays put.
  const previousLayoutRef = React.useRef({ nodes, autoExpanded })
  React.useLayoutEffect(() => {
    const previous = previousLayoutRef.current
    previousLayoutRef.current = { nodes, autoExpanded }
    if (previous.autoExpanded === autoExpanded || previous.nodes === nodes) {
      return
    }
    const el = scrollRef.current
    if (!el || previous.nodes.length === 0) return

    const anchor = anchorRef.current
    const focusX =
      anchor?.contentX ??
      (el.scrollLeft + (el.clientWidth - LANE_GUTTER) / 2) / renderedZoom
    const nextX = new Map(nodes.map((node) => [node.event.id, node.x]))
    let reference: { from: number; to: number } | null = null
    for (const node of previous.nodes) {
      const to = nextX.get(node.event.id)
      if (to === undefined) continue
      if (
        !reference ||
        Math.abs(node.x - focusX) < Math.abs(reference.from - focusX)
      ) {
        reference = { from: node.x, to }
      }
    }
    if (!reference) return
    const shift = reference.to - reference.from
    if (shift === 0) return
    el.scrollLeft += shift * renderedZoom
    if (anchor) anchor.contentX += shift
  }, [anchorRef, autoExpanded, nodes, renderedZoom])
  const originIds = React.useMemo(
    () => new Set(origins.map((origin) => origin.eventId)),
    [origins],
  )

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

  // Briefly ring the event a jump lands on, so the eye can find it.
  const [flashId, setFlashId] = React.useState<string | null>(null)
  const flashTimerRef = React.useRef<number | null>(null)
  React.useEffect(
    () => () => {
      if (flashTimerRef.current !== null) {
        window.clearTimeout(flashTimerRef.current)
      }
    },
    [],
  )

  /** Smoothly centres a node in the view and highlights it. */
  const scrollToNode = React.useCallback(
    (node: PositionedEvent) => {
      const el = scrollRef.current
      if (!el) return
      if (flashTimerRef.current !== null) {
        window.clearTimeout(flashTimerRef.current)
      }
      setFlashId(null)
      const flash = () => {
        setFlashId(node.event.id)
        flashTimerRef.current = window.setTimeout(() => setFlashId(null), 1400)
      }

      // Too far out to make the event out: zoom in while bringing it to the
      // middle, then highlight it once the motion ends.
      if (renderedZoom < FOCUS_MIN_ZOOM) {
        const duration = FLY_DURATION
        flyTo(node.x, node.y, FOCUS_ZOOM, duration)
        flashTimerRef.current = window.setTimeout(flash, duration + 50)
        return
      }

      // The zoom anchor belongs to the last wheel gesture; drop it so the
      // next zoom frame does not pull the view back.
      anchorRef.current = null
      el.scrollTo({
        left: Math.max(
          0,
          node.x * renderedZoom - (el.clientWidth - LANE_GUTTER) / 2,
        ),
        // Centre within the area below the sticky era and group bars.
        top: Math.max(
          0,
          node.y * renderedZoom - (el.clientHeight - TIMELINE_HEADER) / 2,
        ),
        behavior: 'smooth',
      })
      // Long smooth scrolls can take a second; start the highlight when the
      // scroll settles so it is seen, with a fallback if no scroll happens
      // (already in view) or scrollend is unsupported.
      let started = false
      const start = () => {
        if (started) return
        started = true
        el.removeEventListener('scrollend', start)
        flash()
      }
      el.addEventListener('scrollend', start, { once: true })
      flashTimerRef.current = window.setTimeout(start, 1200)
    },
    [anchorRef, flyTo, renderedZoom],
  )

  /**
   * Screen offset below which a group's lane labels and bracket start: the
   * reserved header space at normal zoom, but never less than the header's
   * own unscaled height, so they cannot overlap it when zoomed far out.
   */
  const groupLabelFloor = (groupTop: number) =>
    Math.max(
      (groupTop + GROUP_HEADER) * renderedZoom,
      groupTop * renderedZoom + 6 + GROUP_HEADER_TEXT,
    )

  /** First event (in timeline order) among the given lanes. */
  const jumpToLanes = (laneIds: TraditionId[]) => {
    const first = nodes.find((node) =>
      laneIds.includes(node.event.tradition),
    )
    if (first) scrollToNode(first)
  }

  // Jump to a requested event, opening its detail group first if needed.
  const handledFocusRef = React.useRef<number | null>(null)
  React.useEffect(() => {
    if (!focusRequest || handledFocusRef.current === focusRequest.key) return
    const el = scrollRef.current
    if (!el) return
    const node = nodes.find((item) => item.event.id === focusRequest.id)
    if (!node) {
      const groupId = events.find(
        (event) => event.id === focusRequest.id,
      )?.groupId
      if (groupId && !expandedGroups.has(groupId)) {
        setGroupOverrides((current) => ({ ...current, [groupId]: true }))
      }
      return
    }
    handledFocusRef.current = focusRequest.key
    scrollToNode(node)
  }, [events, expandedGroups, focusRequest, nodes, scrollToNode])

  return (
    <div
      ref={scrollRef}
      className={cn(
        'no-scrollbar relative h-full cursor-grab overflow-auto rounded-xl border border-border bg-card/40',
        isPanning && 'cursor-grabbing select-none [&_*]:cursor-grabbing',
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
            const isExpanded = expandedGroups.has(group.id)
            const { left, width: groupWidth } = groupSpan(group, nodes)
            const count = events.filter(
              (event) => event.groupId === group.id,
            ).length
            // Filters can remove every event in a group; drop its button too.
            if (count === 0) return null

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
                  'absolute top-1.5 flex h-9 cursor-default items-center gap-2 overflow-hidden rounded-md border px-3 text-left transition-[background-color,border-color] duration-200 hover:bg-primary/15 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
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
            {/* Lane groups: a header above, and a bracket beside their lanes. */}
            {laneGroups.map((group) => (
              <React.Fragment key={group.id}>
                <button
                  type="button"
                  onClick={() => jumpToLanes(group.lanes)}
                  title={`${group.blurb} Click to jump to its first event.`}
                  className="label-caps absolute right-3 left-3 flex cursor-pointer items-center gap-2 overflow-hidden rounded-md px-1 py-0.5 text-left text-[10px] font-semibold tracking-wider whitespace-nowrap text-foreground/80 transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  style={{ top: group.top * renderedZoom + 6 }}
                >
                  <span className="truncate">{group.name}</span>
                  <span
                    className="h-px flex-1"
                    style={{ backgroundColor: `color-mix(in oklab, ${group.color} 45%, transparent)` }}
                  />
                </button>
                <span
                  className="pointer-events-none absolute left-3.5 w-px"
                  style={(() => {
                    const top = groupLabelFloor(group.top)
                    return {
                      top,
                      height: Math.max(0, group.bottom * renderedZoom - 8 - top),
                      backgroundColor: `color-mix(in oklab, ${group.color} 45%, transparent)`,
                    }
                  })()}
                  aria-hidden="true"
                />
              </React.Fragment>
            ))}

            {lanes.map((lane) => (
              <div
                key={lane.id}
                className={cn(
                  'absolute right-3 flex flex-col items-start gap-1',
                  // Lanes in a group are indented past the group's bracket.
                  lane.groupId ? 'left-6' : 'left-3',
                )}
                style={{
                  top: Math.max(
                    lane.top * renderedZoom + 8,
                    // Keep a group's first label clear of the group header,
                    // whose text does not shrink with the zoom.
                    lane.groupId
                      ? groupLabelFloor(
                          laneGroups.find((group) => group.id === lane.groupId)
                            ?.top ?? 0,
                        )
                      : 0,
                  ),
                }}
              >
                <button
                  type="button"
                  onClick={() => jumpToLanes([lane.id])}
                  title={`${lane.blurb} Click to jump to its first event.`}
                  className="label-caps flex max-w-full cursor-pointer items-center gap-2 rounded-full bg-secondary/90 px-2.5 py-1 text-[10px] whitespace-nowrap text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <span
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: lane.color }}
                  />
                  <span className="truncate">{lane.name}</span>
                </button>
                {lane.origin && renderedZoom >= 0.55 && (
                  <span className="flex max-w-full items-center gap-1 pl-2.5 text-[10px] text-muted-foreground/80">
                    <FlagIcon
                      className="size-2.5 shrink-0"
                      style={{ color: lane.color }}
                      aria-hidden="true"
                    />
                    <span className="truncate">
                      Began {lane.origin.dateLabel} · {lane.origin.place}
                    </span>
                  </span>
                )}
              </div>
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
            {/* Grouped lanes share a faint band so they read as one family. */}
            {laneGroups.map((group) => (
              <div
                key={group.id}
                className="pointer-events-none absolute inset-x-0 rounded-sm border-t"
                style={{
                  top: group.top + 4,
                  height: group.bottom - group.top - 8,
                  borderColor: `color-mix(in oklab, ${group.color} 35%, transparent)`,
                  backgroundColor: `color-mix(in oklab, ${group.color} 4%, transparent)`,
                }}
                aria-hidden="true"
              />
            ))}

            {nodes.some((node) => node.event.presentDay) && (
              <div
                className="pointer-events-none absolute inset-y-0 border-x border-primary/20 bg-linear-to-r from-primary/3 via-primary/10 to-primary/3"
                style={(() => {
                  // A shared lane can push "today" nodes into a second column.
                  const xs = nodes
                    .filter((node) => node.event.presentDay)
                    .map((node) => node.x)
                  return {
                    left: Math.min(...xs) - COL_WIDTH / 2,
                    width: Math.max(...xs) - Math.min(...xs) + COL_WIDTH,
                  }
                })()}
                aria-hidden="true"
              />
            )}

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
              {/* Each lane is dotted before its branch existed and a faint
                  solid rail in its own colour from the point it began. */}
              {lanes.map((lane) => {
                const startX = lane.startX ?? width
                return (
                  <g key={lane.id}>
                    <line
                      x1={0}
                      y1={lane.y}
                      x2={startX}
                      y2={lane.y}
                      stroke="currentColor"
                      className="text-border"
                      strokeWidth={1}
                      strokeDasharray="2 8"
                    />
                    {lane.startX !== null && (
                      <line
                        x1={startX}
                        y1={lane.y}
                        x2={width}
                        y2={lane.y}
                        stroke={lane.color}
                        strokeWidth={6}
                        strokeLinecap="round"
                        opacity={0.12}
                      />
                    )}
                  </g>
                )
              })}

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
                const isFocused =
                  !focusIds || (focusIds.has(fromId) && focusIds.has(toId))
                return (
                  <path
                    key={edge.id}
                    d={edge.path}
                    fill="none"
                    stroke={edge.color}
                    strokeWidth={edge.isBranch ? 3 : 1.75} // Thicker stroke for branch edges
                    strokeLinecap="round"
                    strokeDasharray={edge.isBranch ? "2 8" : "none"} // dotted stroke for branch edges
                    opacity={isFocused ? (isActive || focusIds ? 1 : 0.42) : 0.08}
                  />
                )
              })}
            </svg>

            {/* "Began here" flags mark when and where each branch started. */}
            {showOrigins && origins.map((origin) => (
              <div
                key={`origin-${origin.eventId}`}
                className={cn(
                  'pointer-events-none absolute flex items-center gap-1 rounded-full border bg-card px-2 py-0.5 text-[10px] leading-4 whitespace-nowrap shadow-sm transition-opacity duration-200',
                  focusIds && !focusIds.has(origin.eventId) && 'opacity-15',
                  // Centred over the node, except where that would run off
                  // the start of the canvas.
                  origin.x >= COL_WIDTH && '-translate-x-1/2',
                )}
                style={{
                  left: origin.x >= COL_WIDTH ? origin.x : origin.x - NODE_SIZE / 2,
                  top: origin.y - NODE_SIZE / 2 - 26,
                  borderColor: `color-mix(in oklab, ${origin.color} 55%, transparent)`,
                }}
                aria-hidden="true"
              >
                <FlagIcon
                  className="size-2.5 shrink-0"
                  style={{ color: origin.color }}
                />
                <span className="label-caps" style={{ color: origin.color }}>
                  Began {origin.dateLabel}
                </span>
                <span className="text-muted-foreground">· {origin.place}</span>
              </div>
            ))}

            {/* Draw event nodes */}
            {nodes.map(({ event, x, y, color }) => {
              const isSelected = selectedId === event.id
              const isOrigin = showOrigins && originIds.has(event.id)
              const isFaded = focusIds !== null && !focusIds.has(event.id)
              return (
                <div
                  key={event.id}
                  className={cn(
                    'absolute flex flex-col items-center transition-opacity duration-200',
                    isFaded && 'opacity-20 hover:opacity-70',
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
                        'group relative flex cursor-default items-center justify-center rounded-full border-2 bg-card text-foreground transition-transform duration-150 outline-none hover:scale-110 focus-visible:ring-3 focus-visible:ring-ring/50',
                        event.presentDay && 'border-[3px] bg-primary/10',
                        isSelected && 'scale-110',
                        flashId === event.id && 'scale-125',
                      )}
                      style={{
                        width: NODE_SIZE,
                        height: NODE_SIZE,
                        borderColor: color,
                        boxShadow: flashId === event.id
                          ? `0 0 0 6px color-mix(in oklab, ${color} 45%, transparent), 0 0 24px 6px color-mix(in oklab, ${color} 35%, transparent)`
                          : isSelected
                          ? `0 0 0 5px color-mix(in oklab, ${color} 22%, transparent)`
                          : event.presentDay
                            ? `0 0 0 4px color-mix(in oklab, ${color} 16%, transparent)`
                            : isOrigin
                              ? `0 0 0 3px var(--card), 0 0 0 5px ${color}`
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

                    {isAdmin && !event.presentDay && (
                      <button
                        type="button"
                        onClick={() => onEdit(event)}
                        aria-label={`Edit ${event.title}`}
                        className="absolute -top-1 -right-1 flex size-6 cursor-default items-center justify-center rounded-full border border-border bg-secondary text-secondary-foreground transition-colors hover:bg-accent"
                      >
                        <PencilIcon className="size-3" />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelect(event)}
                    className="mt-2 flex w-full cursor-default flex-col items-center gap-0.5 px-2 text-center outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <span className="label-caps text-[10px]" style={{ color }}>
                      {event.dateLabel}
                    </span>
                    <span
                      className={cn(
                        'font-serif text-[13px] leading-snug text-pretty text-foreground/90',
                        compactLabels && 'line-clamp-2',
                        isSelected && 'text-foreground',
                      )}
                      title={compactLabels ? event.title : undefined}
                    >
                      {event.title}
                    </span>
                    {!compactLabels && (
                      <span className="label-caps text-[9px] text-muted-foreground/70">
                        {event.presentDay ? 'Today' : KIND_LABEL[event.kind]}
                      </span>
                    )}
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
