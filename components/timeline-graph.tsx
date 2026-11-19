'use client'

import * as React from 'react'
import { ChevronRightIcon, FlagIcon, PencilIcon } from 'lucide-react'
import { DateText, formatDecades } from '@/components/date-text'
import { EventIcon } from '@/components/event-icon'
import {
  PERSON_GROUP_WIDTH,
  PERSON_NODE_WIDTH,
  PersonFrame,
  PersonGroupFrame,
  PersonPortrait,
} from '@/components/person-node'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import { TRADITION_MAP } from '@/lib/timeline-data'
import {
  buildLayout,
  COL_WIDTH,
  ERA_BAR,
  LANE_HEIGHT,
  NODE_SIZE,
  type PositionedEvent,
  traditionColor,
} from '@/lib/timeline-layout'
import {
  parentChurchOf,
  type TimelineEvent,
  type TimelineGroup,
  type TraditionId,
} from '@/lib/timeline-types'
import type { EnlargeMode } from '@/lib/timeline-filters'
import { CHURCH_TAG, groupPeople } from '@/lib/timeline-people'
import { cn } from '@/lib/utils'

const KIND_LABEL: Record<TimelineEvent['kind'], string> = {
  event: 'Milestone',
  council: 'Council',
  schism: 'Division',
  reunion: 'Reunion',
  person: 'Person',
}

export const MIN_ZOOM = 0.3
export const MAX_ZOOM = 2
const LANE_GUTTER = 224
const GROUP_BAR = 48
/** Jumping to an event below this zoom also zooms in, to FOCUS_ZOOM. */
const FOCUS_MIN_ZOOM = 0.75
const FOCUS_ZOOM = 1
/** Length of that zoom-in jump, and how far into it the zoom begins. */
const FLY_DURATION = 1100
const ZOOM_DELAY = 0.15
/** Rendered height of a lane-group header in the gutter, plus a small gap. */
const GROUP_HEADER_TEXT = 24
/** Nested groups (e.g. Magisterial Reformation) use a smaller caption. */
const SUBGROUP_HEADER_TEXT = 20
/** Rendered height of a lane label, with and without its "Began…" line. */
const LANE_LABEL_TALL = 44
const LANE_LABEL_SHORT = 28
/** The "Began…" line under lane labels shows from this zoom up. */
const ORIGIN_LINE_ZOOM = 0.55
/** Gutter left padding, and the extra indent per level of lane group. */
const GUTTER_PAD = 12
const GUTTER_INDENT = 12
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
  /** Which nodes grow as you zoom out, and how (see zoomOutScale). */
  enlarge?: NodeEnlargement
  /** The lane-label panel on the left; hiding it slides it out. */
  showLaneLabels?: boolean
  /** Draw runs of people on one lane as a single group node. */
  groupPeople?: boolean
}

export interface NodeEnlargement {
  /** Founding ("Began here") nodes, plus their flags. */
  origins: boolean
  kinds: TimelineEvent['kind'][]
  mode: EnlargeMode
  strength: number
}

/**
 * Below this zoom, canvas lines get progressively thicker (and connectors
 * more opaque) so they don't fade out near the farthest zoom.
 */
const LINE_BOOST_ZOOM = 0.45

/**
 * Rendered height of a "Began here" flag, and its gap above the node: enough
 * to clear the founding node's outer ring (5px) and its 10% hover bump.
 */
const FLAG_HEIGHT = 22
/** How long people take to glide into a group before it replaces them. */
const PEOPLE_GATHER_MS = 220
const FLAG_GAP = 10
/** A grown node (and its flag) stops at least this far below the canvas top. */
const GROW_TOP_MARGIN = 8

/**
 * Left-button drag pans the canvas background and the wheel zooms about the
 * pointer. Interactive controls keep their normal click behavior.
 */
function useCanvasGestures(
  ref: React.RefObject<HTMLDivElement | null>,
  zoom: number,
  onZoomChange: (zoom: number) => void,
  /** Current width of the lane-label gutter (0 while it is hidden). */
  gutterRef: React.RefObject<number>,
) {
  const [isPanning, setIsPanning] = React.useState(false)
  const [renderedZoom, setRenderedZoom] = React.useState(zoom)
  // Bumped when a pan stops a zoom mid-animation, so the gesture still settles.
  const [zoomStops, setZoomStops] = React.useState(0)

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
      gutterRef.current + anchor.contentX * renderedZoom - anchor.pointerX
    el.scrollTop =
      anchor.contentY * renderedZoom + TIMELINE_HEADER - anchor.pointerY
  }, [gutterRef, ref, renderedZoom])

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
      const startX = gutterRef.current + contentX * fromZoom - el.scrollLeft
      const startY = contentY * fromZoom + TIMELINE_HEADER - el.scrollTop
      const endX = gutterRef.current + (el.clientWidth - gutterRef.current) / 2
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
    [cancelFlight, gutterRef, ref],
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
      contentX: (el.scrollLeft + pointerX - gutterRef.current) / current,
      contentY: (el.scrollTop + pointerY - TIMELINE_HEADER) / current,
      pointerX,
      pointerY,
    }
    targetZoomRef.current = clampZoom(zoom)
    animate()
  }, [animate, gutterRef, ref, zoom])

  React.useEffect(() => {
    const el = ref.current
    if (!el) return

    // Ends a zoom that is still easing, at the zoom it has reached: the
    // remaining animation frames would otherwise re-set the scroll position to
    // the zoom anchor and fight the user's own pan (the view "jumping").
    const stopZoom = () => {
      anchorRef.current = null
      if (animationRef.current === null) return
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
      targetZoomRef.current = renderedZoomRef.current
      setZoomStops((count) => count + 1)
    }

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
      stopZoom()
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
      // Shift+wheel keeps a conventional sideways scroll available, and so
      // does a mostly sideways trackpad swipe. Either way the user is now
      // moving the view, so stop any zoom still easing towards its anchor.
      if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        stopZoom()
        return
      }
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
        contentX: (el.scrollLeft + pointerX - gutterRef.current) / current,
        contentY: (el.scrollTop + pointerY - TIMELINE_HEADER) / current,
        pointerX,
        pointerY,
      }

      targetZoomRef.current = next
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
  }, [animate, cancelFlight, gutterRef, ref])

  return { isPanning, renderedZoom, anchorRef, flyTo, targetZoomRef, onZoomChangeRef, zoomStops }
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
  enlarge,
  showLaneLabels = true,
  groupPeople: groupPeopleOn = true,
}: TimelineGraphProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  // The lane-label gutter's width: everything left of the canvas.
  const gutter = showLaneLabels ? LANE_GUTTER : 0
  const gutterRef = React.useRef(gutter)
  gutterRef.current = gutter
  const { isPanning, renderedZoom, anchorRef, flyTo, targetZoomRef, onZoomChangeRef, zoomStops } = useCanvasGestures(
    scrollRef,
    zoom,
    onZoomChange,
    gutterRef,
  )

  const [groupOverrides, setGroupOverrides] = React.useState<
    Record<string, boolean>
  >({})
  const [isLayoutAnimating, setIsLayoutAnimating] = React.useState(false)
  const layoutAnimationRef = React.useRef<number | null>(null)
  // Showing or hiding the gutter slides it and the canvas with the same
  // transitions as a layout change. The flag is set during render so it lands
  // in the same commit as the new width; a CSS transition only runs if it is
  // in place when the value changes. The effect below then clears it.
  const [prevShowLaneLabels, setPrevShowLaneLabels] = React.useState(showLaneLabels)
  if (showLaneLabels !== prevShowLaneLabels) {
    setPrevShowLaneLabels(showLaneLabels)
    setIsLayoutAnimating(true)
  }
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
  const isFirstGutterRender = React.useRef(true)
  React.useEffect(() => {
    if (isFirstGutterRender.current) {
      isFirstGutterRender.current = false
      return
    }
    startLayoutAnimation()
  }, [showLaneLabels, startLayoutAnimation])
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
  /** Opens a detail group, animating its columns in (group bar and canvas "+"). */
  const expandGroup = React.useCallback(
    (groupId: string) => {
      startLayoutAnimation()
      setGroupOverrides((current) => ({ ...current, [groupId]: true }))
    },
    [startLayoutAnimation],
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
  // Runs of people on a lane become one group node (see groupPeople).
  // Whether people are drawn grouped. It trails the setting so toggling can
  // animate: spreading out starts at once, with members gliding out of their
  // group (spreadFrom); grouping first glides members into the group's first
  // member and fades them (gatherTo), then swaps in the group node.
  const [groupedOn, setGroupedOn] = React.useState(groupPeopleOn)
  const [prevGroupSetting, setPrevGroupSetting] = React.useState(groupPeopleOn)
  const [spreadFrom, setSpreadFrom] = React.useState<Map<string, number> | null>(null)
  const [gatherTo, setGatherTo] = React.useState<Map<string, number> | null>(null)
  const drawnEvents = React.useMemo(
    () => (groupedOn ? groupPeople(visibleEvents) : visibleEvents),
    [groupedOn, visibleEvents],
  )
  const layout = React.useMemo(
    () => buildLayout(drawnEvents, hidden),
    [hidden, drawnEvents],
  )
  /** The group node whose list of people is open. */
  const [openGroup, setOpenGroup] = React.useState<string | null>(null)

  // Set during render (like the gutter toggle) so the new layout and the
  // transition flag land in the same commit.
  if (groupPeopleOn !== prevGroupSetting) {
    setPrevGroupSetting(groupPeopleOn)
    setOpenGroup(null)
    if (!groupPeopleOn) {
      // Each member starts where its group node was.
      const from = new Map<string, number>()
      for (const node of layout.nodes) {
        for (const member of node.event.personGroup?.slice(1) ?? []) {
          from.set(member.id, node.x)
        }
      }
      setGatherTo(null)
      setSpreadFrom(from)
      setGroupedOn(false)
      setIsLayoutAnimating(true)
    } else {
      // Each member glides to the first member of the group it will join.
      const xOf = new Map(layout.nodes.map((node) => [node.event.id, node.x]))
      const to = new Map<string, number>()
      for (const group of groupPeople(visibleEvents)) {
        const [first, ...rest] = group.personGroup ?? []
        const firstX = first && xOf.get(first.id)
        if (firstX === undefined) continue
        for (const member of rest) {
          const x = xOf.get(member.id)
          if (x !== undefined) to.set(member.id, firstX - x)
        }
      }
      setSpreadFrom(null)
      setGatherTo(to)
    }
  }
  // Grouping, second step: once members have gathered, swap in group nodes.
  React.useEffect(() => {
    if (!gatherTo) return
    const timer = window.setTimeout(() => {
      startLayoutAnimation()
      setGroupedOn(true)
      setGatherTo(null)
    }, PEOPLE_GATHER_MS)
    return () => window.clearTimeout(timer)
  }, [gatherTo, startLayoutAnimation])
  // Spreading out: let the layout animation finish, then forget the offsets.
  React.useEffect(() => {
    if (!spreadFrom) return
    startLayoutAnimation()
    const timer = window.setTimeout(() => setSpreadFrom(null), 400)
    return () => window.clearTimeout(timer)
  }, [spreadFrom, startLayoutAnimation])
  const { nodes, edges, affiliations, eras, lanes, laneGroups, origins, width, height } =
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
      (el.scrollLeft + el.clientWidth - gutterRef.current) / renderedZoom

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
      (el.scrollLeft + (el.clientWidth - gutterRef.current) / 2) / renderedZoom
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
  // The zoom at which the last gesture came to rest. The canvas is always
  // drawn with a GPU transform of the live zoom and never re-laid out (CSS
  // zoom re-laid out every element when a gesture ended: a long stall on slow
  // machines). --z, which enlarged nodes and line weights derive from, follows
  // this settled value rather than every frame: changing it restyles every
  // element on the canvas, which was most of the cost of each zoom frame.
  const [settledZoom, setSettledZoom] = React.useState(zoom)

  // While the zoom is changing, mark the canvas so node size changes aren't
  // animated (an enlarged node's size follows the zoom every frame, and a
  // transition would make it trail behind). Cleared shortly after the last
  // frame, so hover in/out animates smoothly the rest of the time. Set on the
  // DOM directly so it costs no re-render.
  React.useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    // Mark the canvas only while the zoom is actually moving. Re-marking it
    // when the settle itself re-renders (the page receiving the final zoom)
    // switched transitions off at the very moment enlarged nodes take their
    // new size, so they snapped instead of easing into it.
    // Settle only once the animation has reached its target, so slow frames
    // can't end a gesture early.
    if (Math.abs(renderedZoom - targetZoomRef.current) > 0.0005) {
      el.dataset.zooming = ''
      return
    }
    const timer = window.setTimeout(() => {
      delete el.dataset.zooming
      setSettledZoom(renderedZoom)
      // Report the zoom once per gesture, not per wheel notch: every report
      // re-renders the whole page.
      if (Math.abs(zoom - targetZoomRef.current) > 0.0001) {
        onZoomChangeRef.current(targetZoomRef.current)
      }
    }, 120)
    return () => window.clearTimeout(timer)
  }, [onZoomChangeRef, renderedZoom, targetZoomRef, zoom, zoomStops])

  const originIds = React.useMemo(
    () => new Set(origins.map((origin) => origin.eventId)),
    [origins],
  )

  // Chosen nodes are counter-scaled against the canvas zoom so they stay
  // readable when zoomed out: CSS computes --grow-auto from --z (see the
  // canvas below), matching zoomOutScale. The strength is the exponent.
  const enlargeStrength = enlarge ? Math.min(1, Math.max(0, enlarge.strength)) : 0

  // Node click handlers with a stable identity, so the memoised canvas
  // content doesn't re-render whenever the page passes new closures.
  const onSelectRef = React.useRef(onSelect)
  onSelectRef.current = onSelect
  const onEditRef = React.useRef(onEdit)
  onEditRef.current = onEdit
  const selectEvent = React.useCallback((event: TimelineEvent) => onSelectRef.current(event), [])
  const editEvent = React.useCallback((event: TimelineEvent) => onEditRef.current(event), [])

  const scaledWidth = width * renderedZoom
  const scaledHeight = height * renderedZoom
  const totalWidth = gutter + scaledWidth
  // Gutter and header corner cells: width (and border) animate with layout
  // changes, including showing or hiding the labels.
  const gutterTransition =
    isLayoutAnimating && 'transition-[width,border-color] duration-[350ms] ease-in-out'
  const gutterStyle: React.CSSProperties = {
    width: gutter,
    borderColor: showLaneLabels ? 'var(--border)' : 'transparent',
  }

  // Open on the trunk rather than an empty lane at the top of the canvas.
  // A layout effect, so the scroll lands in the hydration commit itself. The
  // server-rendered page still first paints at the top, so on a slow device
  // the canvas visibly jumps when hydration finishes.
  // data-ready marks that moment: the canvas is in its settled position and
  // interactive (tests wait for it before measuring or clicking).
  const firstY = nodes[0]?.y
  const didCenter = React.useRef(false)
  React.useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el || didCenter.current || firstY === undefined) return
    didCenter.current = true
    el.scrollTop = Math.max(0, firstY - el.clientHeight / 2)
    el.dataset.ready = ''
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
          node.x * renderedZoom - (el.clientWidth - gutterRef.current) / 2,
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
   * Screen positions for the gutter's group headers and lane labels. Each
   * sits at its natural place, but never above the bottom of the item before
   * it: header and label text does not shrink with the zoom while the space
   * between lanes does, so far out they would otherwise overlap.
   */
  const gutterTops = React.useMemo(() => {
    const labelHeight =
      renderedZoom >= ORIGIN_LINE_ZOOM ? LANE_LABEL_TALL : LANE_LABEL_SHORT
    const items = [
      ...laneGroups.map((group) => ({
        key: `group:${group.id}`,
        top: group.top,
        order: group.depth,
        offset: 6,
        height: group.depth === 0 ? GROUP_HEADER_TEXT : SUBGROUP_HEADER_TEXT,
      })),
      ...lanes.map((lane) => ({
        key: `lane:${lane.id}`,
        top: lane.top,
        order: 100,
        offset: 8,
        height: labelHeight,
      })),
    ].sort((a, b) => a.top - b.top || a.order - b.order)

    const tops = new Map<string, number>()
    let floor = -Infinity
    for (const item of items) {
      const y = Math.max(item.top * renderedZoom + item.offset, floor)
      tops.set(item.key, y)
      floor = y + item.height
    }
    return tops
  }, [laneGroups, lanes, renderedZoom])

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
    // A person drawn inside a group node: go to the group.
    const node = nodes.find(
      (item) =>
        item.event.id === focusRequest.id ||
        item.event.personGroup?.some((member) => member.id === focusRequest.id),
    )
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

  // Everything drawn inside the canvas, in unscaled canvas units. Memoised so
  // zoom frames (which only change the canvas transform and --z) do not
  // re-render every node: zoom-dependent sizes are CSS expressions of --z.
  const enlargeOrigins = enlarge?.origins ?? false
  const enlargeKinds = enlarge?.kinds
  const enlargeMode = enlarge?.mode
  const zoomedOut = settledZoom < 1
  const canvasContent = React.useMemo(() => {
    const isEnlarged = (event: TimelineEvent) =>
      (enlargeOrigins && originIds.has(event.id)) ||
      Boolean(enlargeKinds?.includes(event.kind))
    const originByEvent = new Map(origins.map((origin) => [origin.eventId, origin]))
    // Lines are drawn in canvas units and thin out with the zoom, which only
    // gets too faint near the farthest zoom. Below LINE_BOOST_ZOOM, widths,
    // dot patterns and edge opacity scale up together by LINE_BOOST_ZOOM /
    // zoom (1.5x at 30%); above it, lines are exactly as designed. CSS from
    // --z, so zooming re-renders nothing.
    const boost = `max(1, calc(${LINE_BOOST_ZOOM} / var(--z)))`
    // Values may be numbers or CSS variables: each skin (app/themes.css)
    // sets its own line weights, dash patterns and opacity.
    const boostedPx = (canvasPx: number | string) => `calc(${canvasPx} * 1px * ${boost})`
    const boostedDashes = (on: number | string, off: number | string) =>
      `${boostedPx(on)} ${boostedPx(off)}`
    const boostedOpacity = (opacity: number | string) => `min(1, calc(${opacity} * ${boost}))`

    // Background bands, sorted top to bottom. Each stretches up to meet the
    // band above, so header rows that belong to an untinted parent group
    // (the "Protestant" row above Magisterial Reformation) don't leave a gap.
    const bandsTopDown = [
      ...laneGroups
        .filter(
          (group) =>
            !laneGroups.some(
              (other) =>
                other.depth === group.depth + 1 &&
                other.top >= group.top &&
                other.bottom <= group.bottom,
            ),
        )
        .map((group) => ({ key: group.id, top: group.top, bottom: group.bottom, color: group.color, setApart: group.setApart })),
      ...lanes
        .filter((lane) => !lane.groupId)
        .map((lane) => ({ key: `lane-${lane.id}`, top: lane.top, bottom: lane.top + LANE_HEIGHT, color: lane.color, setApart: false })),
    ].sort((a, b) => a.top - b.top)
    const bands = bandsTopDown.map((band, index) =>
      index > 0 && band.top > bandsTopDown[index - 1].bottom
        ? { ...band, top: bandsTopDown[index - 1].bottom }
        : band,
    )
    return (
      <>
            {/* Faint background bands, edge to edge with no border (a border
                read as another lane line). Each innermost group gets one in its
                colour; a group that contains subgroups, like Protestant, leaves
                the tint to them so tints don't stack. A lane outside any group
                (Undivided Church) gets its own band in its lane colour. */}
            {bands.map((band) => (
              <div
                key={band.key}
                className={cn(
                  'tl-band pointer-events-none absolute inset-x-0',
                  // Movements outside the Nicene creeds: a plain grey band
                  // in every skin (see .tl-band-apart in themes.css).
                  band.setApart && 'tl-band-apart',
                )}
                style={{
                  top: band.top,
                  height: band.bottom - band.top,
                  ...(band.setApart
                    ? {}
                    : { backgroundColor: `color-mix(in oklab, ${band.color} var(--tl-band-tint), transparent)` }),
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
                      style={{
                        strokeWidth: boostedPx(1),
                        strokeDasharray: boostedDashes('var(--tl-lane-dash)', 'var(--tl-lane-gap)'),
                      }}
                    />
                    {lane.startX !== null && (
                      <line
                        x1={startX}
                        y1={lane.y}
                        x2={width}
                        y2={lane.y}
                        stroke={lane.color}
                        className="tl-rail"
                        style={{
                          strokeWidth: boostedPx('var(--tl-rail-w)'),
                          opacity: 'var(--tl-rail-opacity)',
                        }}
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
                    className="tl-edge"
                    // Branch edges are thicker and dotted.
                    style={{
                      ...(edge.isBranch
                        ? {
                            strokeWidth: boostedPx('var(--tl-branch-w)'),
                            strokeDasharray: boostedDashes('var(--tl-branch-dash)', 'var(--tl-branch-gap)'),
                          }
                        : { strokeWidth: boostedPx('var(--tl-edge-w)') }),
                      // Only the resting opacity is boosted; highlighted and
                      // faded-out edges keep theirs.
                      opacity: isFocused
                        ? isActive || focusIds
                          ? 1
                          : boostedOpacity('var(--tl-edge-opacity)')
                        : 0.08,
                    }}
                  />
                )
              })}

              {/* Dashed lines from the larger church a person belonged to
                  (or left) over to them on another lane. */}
              {affiliations.map((link) => {
                const isActive = selectedId === link.personId
                const isFocused = !focusIds || focusIds.has(link.personId)
                return (
                  <path
                    key={link.id}
                    d={link.path}
                    fill="none"
                    stroke={link.color}
                    className="tl-edge tl-affiliation"
                    style={{
                      strokeWidth: boostedPx('var(--tl-edge-w)'),
                      strokeDasharray: boostedDashes('3', '4'),
                      opacity: isFocused
                        ? isActive
                          ? 1
                          : `calc(${boostedOpacity('var(--tl-edge-opacity)')} * 0.8)`
                        : 0.08,
                    }}
                  />
                )
              })}
            </svg>

            {/* A "+" where each collapsed detail group would open, on the lane
                most of its events belong to. It sits between two columns (the
                group's insertion point), so it never covers a node. */}
            {groups.map((group) => {
              if (expandedGroups.has(group.id)) return null
              const members = events.filter((event) => event.groupId === group.id)
              if (members.length === 0) return null
              const tally = new Map<string, number>()
              for (const member of members) {
                tally.set(member.tradition, (tally.get(member.tradition) ?? 0) + 1)
              }
              const lane = [...tally.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([tradition]) => lanes.find((item) => item.id === tradition))
                .find(Boolean)
              if (!lane) return null
              const { left, width: span } = groupSpan(group, nodes)
              const label = `Show ${members.length} event${members.length === 1 ? '' : 's'}: ${group.title}`
              return (
                <button
                  key={`expand-${group.id}`}
                  type="button"
                  onClick={() => expandGroup(group.id)}
                  aria-label={label}
                  title={label}
                  className="group/plus absolute z-20 block cursor-pointer rounded-full p-0 text-primary drop-shadow-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none motion-safe:animate-in motion-safe:fade-in-0"
                  style={
                    {
                      left: left + span / 2,
                      top: lane.y,
                      // Shrinks less than the canvas when zoomed out, so it
                      // stays findable. Sized in layout rather than with a
                      // scale transform: a transform enlarges an already
                      // shrunk raster, which is what made it blurry.
                      '--plus': 'max(1, pow(calc(1 / var(--z)), 0.6))',
                      width: 'calc(24px * var(--plus))',
                      height: 'calc(24px * var(--plus))',
                      marginLeft: 'calc(-12px * var(--plus))',
                      marginTop: 'calc(-12px * var(--plus))',
                    } as React.CSSProperties
                  }
                >
                  {/* Circle and plus share one drawing, so the plus is always
                      centred whatever the zoom does to pixel rounding. */}
                  <svg viewBox="0 0 24 24" className="block size-full" aria-hidden="true">
                    <circle
                      cx="12"
                      cy="12"
                      r="11"
                      pathLength={48}
                      strokeDasharray="2.5 1.5"
                      className="fill-card stroke-current opacity-90 transition-[fill] group-hover/plus:fill-[color-mix(in_oklab,var(--primary)_15%,var(--card))] group-hover/plus:[stroke-dasharray:none]"
                      strokeWidth={1.25}
                    />
                    <path
                      d="M12 8v8M8 12h8"
                      className="stroke-current"
                      strokeWidth={2}
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                </button>
              )
            })}

            {/* Draw event nodes. A node that starts a branch carries its
                "Began here" flag inside it, so anything that scales the node
                (hover, focus, zoomed-out enlarging) scales the flag with it. */}
            {nodes.map(({ event, x, y, color }) => {
              const members = event.personGroup
              const isSelected = members
                ? members.some((member) => member.id === selectedId)
                : selectedId === event.id
              const origin = showOrigins ? originByEvent.get(event.id) : undefined
              const isOrigin = Boolean(origin)
              const isFaded =
                focusIds !== null &&
                !(members ?? [event]).some((member) => focusIds.has(member.id))
              const onNodeClick = () =>
                members ? setOpenGroup(event.id) : selectEvent(event)
              const enlarged = isEnlarged(event)
              const scaleNode = enlarged && enlargeMode === 'node'
              const scaleText = enlarged && enlargeMode === 'text'
              // Resting size: enlarged nodes follow --grow-auto. Hovering (or
              // focusing) restores a node to its 100% on-screen size (1 / zoom),
              // or keeps its enlarged size if bigger. All in CSS from --z, so
              // zooming re-renders nothing here.
              // Nodes grow about their circle's centre, unless that would push
              // the node (or its flag) above the top of the canvas, under the
              // header bars: then the origin moves up just enough that the
              // grown node stops TOP_MARGIN inside. For a point `above` px over
              // the box top, scaled by S about origin oy, that needs
              //   oy <= (boxTop - margin - above * S) / (S - 1).
              const boxTop = y - NODE_SIZE / 2
              const above = origin ? FLAG_HEIGHT + FLAG_GAP : 8
              const growOrigin = (scale: string) =>
                `50% min(${NODE_SIZE / 2}px, calc((${boxTop - GROW_TOP_MARGIN}px - ${above}px * ${scale}) / max(${scale} - 1, 0.001)))`
              const hoverScale = 'max(var(--rest, 1), calc(1 / var(--z)))'
              const nodeVars = {
                ...(scaleNode ? { '--rest': 'var(--grow-auto)' } : {}),
                '--rest-origin': growOrigin('var(--rest, 1)'),
                '--hover-origin': growOrigin(hoverScale),
              } as React.CSSProperties
              // Spreading out: start at the old group node and glide out.
              // Grouping: glide into the group's first member and fade.
              const spreadX = spreadFrom?.get(event.id)
              const gatherX = gatherTo?.get(event.id)
              return (
                <div
                  // A group node keeps its first member's key, so toggling
                  // grouping slides that one element rather than replacing it.
                  key={members ? members[0].id : event.id}
                  className={cn(
                    // The box itself never takes the pointer: once scaled up it
                    // would cover neighbouring nodes. Only the circle, edit
                    // button and label do (pointer-events-auto below), and only
                    // the circle or edit button (.node-hit) triggers the grow.
                    'group/node pointer-events-none absolute flex flex-col items-center',
                    '[scale:var(--rest,none)] [transform-origin:var(--rest-origin)]',
                    'has-[.node-hit:hover]:z-30 has-[:focus-visible]:z-30',
                    'has-[.node-hit:hover]:[scale:max(var(--rest,1),calc(1/var(--z)))] has-[.node-hit:hover]:[transform-origin:var(--hover-origin)]',
                    'has-[:focus-visible]:[scale:max(var(--rest,1),calc(1/var(--z)))] has-[:focus-visible]:[transform-origin:var(--hover-origin)]',
                    // Ease in and out on hover, but not while the zoom is
                    // changing (data-zooming on the canvas), or enlarged
                    // nodes would trail behind the zoom.
                    'transition-[scale,opacity,transform-origin] duration-300 ease-out [[data-zooming]_&]:transition-opacity',
                    enlarged && 'z-10',
                    isFaded && 'opacity-20 hover:opacity-70',
                    isLayoutAnimating &&
                      'transition-[left,top] duration-[350ms] ease-in-out',
                    event.groupId &&
                      isLayoutAnimating &&
                      'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-75 motion-safe:duration-[350ms]',
                    event.groupId &&
                      collapsingGroups.has(event.groupId) &&
                      'detail-node-collapse',
                    spreadX !== undefined && 'person-spread',
                    gatherX !== undefined && 'person-gather',
                  )}
                  style={{
                    left: x - COL_WIDTH / 2,
                    top: y - NODE_SIZE / 2,
                    width: COL_WIDTH,
                    ...nodeVars,
                    ...(spreadX !== undefined
                      ? { '--spread-from': `${spreadX - x}px` }
                      : {}),
                    ...(gatherX !== undefined
                      ? { '--gather-to': `${gatherX}px` }
                      : {}),
                  } as React.CSSProperties}
                >
                  {origin && (
                    <div
                      className={cn(
                        'tl-flag pointer-events-none absolute flex items-center gap-1 rounded-full border bg-card px-2 py-0.5 text-[10px] leading-4 whitespace-nowrap shadow-sm',
                        // Centred over the circle, except where that would run
                        // off the start of the canvas.
                        x >= COL_WIDTH && '-translate-x-1/2',
                        // Text-only enlarging leaves the node unscaled, so the
                        // flag grows on its own; on hover the whole node grows
                        // instead, so this drops to avoid scaling it twice.
                        enlargeOrigins &&
                          enlargeMode === 'text' &&
                          '[scale:var(--grow-auto)] transition-[scale] duration-300 ease-out [[data-zooming]_&]:transition-none group-has-[.node-hit:hover]/node:[scale:none] group-has-[:focus-visible]/node:[scale:none]',
                      )}
                      style={{
                        // Just above the circle (whose top is this box's top).
                        top: -(FLAG_HEIGHT + FLAG_GAP),
                        left: x >= COL_WIDTH ? '50%' : COL_WIDTH / 2 - NODE_SIZE / 2,
                        transformOrigin: x >= COL_WIDTH ? 'bottom center' : 'bottom left',
                        borderColor: `color-mix(in oklab, ${origin.color} 55%, transparent)`,
                        '--flag-color': origin.color,
                      } as React.CSSProperties}
                      aria-hidden="true"
                    >
                      <FlagIcon
                        className="size-2.5 shrink-0"
                        style={{ color: origin.color }}
                      />
                      <span className="label-caps" style={{ color: origin.color }}>
                        Began <DateText value={origin.dateLabel} />
                      </span>
                      <span className="text-muted-foreground">· {origin.place}</span>
                    </div>
                  )}
                  <div className="relative">
                    {members ? (
                    <Popover
                      open={openGroup === event.id}
                      onOpenChange={(open) => setOpenGroup(open ? event.id : null)}
                    >
                      <PopoverTrigger
                        render={
                          <button
                            type="button"
                            aria-label={`${event.title}, ${members.length} people, ${event.dateLabel}: ${event.summary}`}
                            className={cn(
                              // Several people in a row on this lane, drawn as
                              // one group portrait; opens a list of them.
                              'tl-person node-hit pointer-events-auto relative block cursor-default transition-transform duration-150 outline-none hover:scale-110',
                              isSelected && 'scale-110',
                              flashId === event.id && 'scale-125',
                            )}
                            data-selected={isSelected || undefined}
                            data-flash={flashId === event.id || undefined}
                            style={{
                              width: PERSON_GROUP_WIDTH,
                              height: NODE_SIZE,
                              '--node-color': color,
                            } as React.CSSProperties}
                          />
                        }
                      >
                        <PersonGroupFrame />
                        <span
                          className="absolute -right-1.5 -bottom-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-card px-1 text-[10px] leading-none font-semibold text-card tabular-nums"
                          style={{ backgroundColor: color }}
                        >
                          {members.length}
                        </span>
                      </PopoverTrigger>
                      <PopoverContent side="bottom" className="w-80 gap-1 p-1.5">
                        <PopoverHeader className="px-2 pt-1.5 pb-1">
                          <PopoverTitle className="font-serif text-base">
                            {event.title}
                          </PopoverTitle>
                          <PopoverDescription className="text-xs">
                            {members.length} people ·{' '}
                            {TRADITION_MAP[event.tradition]?.name}. Turn off
                            &ldquo;Group people&rdquo; in Filters to draw each one.
                          </PopoverDescription>
                        </PopoverHeader>
                        <ul className="flex max-h-80 flex-col overflow-y-auto">
                          {members.map((member) => (
                            <li key={member.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenGroup(null)
                                  selectEvent(member)
                                }}
                                className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left outline-none hover:bg-accent focus-visible:bg-accent"
                              >
                                <PersonPortrait
                                  icon={member.icon}
                                  title={member.title}
                                  color={color}
                                  className="h-8 w-[26px]"
                                />
                                <span className="flex min-w-0 flex-col">
                                  <span className="truncate font-serif text-sm text-foreground">
                                    {member.title}
                                  </span>
                                  <span className="truncate text-xs text-muted-foreground">
                                    <DateText value={member.dateLabel} /> · {member.person?.role}
                                  </span>
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </PopoverContent>
                    </Popover>
                    ) : event.person ? (
                    <button
                      type="button"
                      onClick={() => selectEvent(event)}
                      aria-label={`${event.title}, ${event.person.role}, ${event.dateLabel}`}
                      className={cn(
                        // A person: a bust in an arched frame (see PersonFrame),
                        // styled per skin by .tl-person in app/themes.css.
                        'tl-person node-hit pointer-events-auto relative block cursor-default transition-transform duration-150 outline-none hover:scale-110',
                        isSelected && 'scale-110',
                        flashId === event.id && 'scale-125',
                      )}
                      data-selected={isSelected || undefined}
                      data-flash={flashId === event.id || undefined}
                      style={{
                        width: PERSON_NODE_WIDTH,
                        height: NODE_SIZE,
                        '--node-color': color,
                      } as React.CSSProperties}
                    >
                      <PersonFrame icon={event.icon} title={event.title} />
                      {/* Drawn on another branch's lane: a pip in the colour
                          of the branch the person belongs to. */}
                      {parentChurchOf(event) && (
                          <span
                            className="absolute -right-1 -bottom-0.5 size-3 rounded-full border-2 border-card"
                            style={{ backgroundColor: traditionColor(parentChurchOf(event)!) }}
                            title={CHURCH_TAG[parentChurchOf(event)!]}
                          />
                        )}
                    </button>
                    ) : (
                    <button
                      type="button"
                      onClick={() => selectEvent(event)}
                      aria-label={`${event.title}, ${event.dateLabel}`}
                      className={cn(
                        // Colours, rim and state rings come from the skin
                        // (.tl-node in app/themes.css).
                        'tl-node node-hit group pointer-events-auto relative flex cursor-default items-center justify-center rounded-full border-2 bg-card text-foreground transition-transform duration-150 outline-none hover:scale-110',
                        event.presentDay && 'border-[3px] bg-primary/10',
                        isSelected && 'scale-110',
                        flashId === event.id && 'scale-125',
                      )}
                      data-origin={isOrigin || undefined}
                      data-present={event.presentDay || undefined}
                      data-selected={isSelected || undefined}
                      data-flash={flashId === event.id || undefined}
                      style={{
                        width: NODE_SIZE,
                        height: NODE_SIZE,
                        '--node-color': color,
                      } as React.CSSProperties}
                    >
                      {event.icon.type === 'image' ? (
                        <span className="size-full overflow-hidden rounded-full p-0.5">
                          <EventIcon icon={event.icon} title={event.title} />
                        </span>
                      ) : (
                        // The icon fills the whole circle, inset to a 20px
                        // glyph by padding, rather than being a 20px box
                        // centred in it. Settled zooms lay the canvas out
                        // with CSS zoom, where the browser snaps each box to
                        // whole pixels on its own: a separate icon box could
                        // land a pixel off the circle's centre, an error that
                        // enlarging and hovering then magnify. Sharing the
                        // circle's box keeps them snapped together.
                        <EventIcon
                          icon={event.icon}
                          title={event.title}
                          className="absolute inset-0 size-full p-[calc(50%-10px)]"
                        />
                      )}
                      {event.kind === 'schism' && (
                        <span
                          className="absolute -right-0.5 -bottom-0.5 size-2.5 rotate-45 rounded-[1px]"
                          style={{ backgroundColor: color }}
                        />
                      )}
                    </button>
                    )}

                    {isAdmin && !event.presentDay && !members && (
                      <button
                        type="button"
                        onClick={() => editEvent(event)}
                        aria-label={`Edit ${event.title}`}
                        className="node-hit pointer-events-auto absolute -top-1 -right-1 flex size-6 cursor-default items-center justify-center rounded-full border border-border bg-secondary text-secondary-foreground transition-colors hover:bg-accent"
                      >
                        <PencilIcon className="size-3" />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={onNodeClick}
                    className={cn(
                      'pointer-events-auto mt-2 flex w-full cursor-default flex-col items-center gap-0.5 px-2 text-center outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                      // While the node is enlarged by hover, its (much bigger)
                      // label lets the pointer through to neighbouring nodes.
                      zoomedOut && 'group-has-[.node-hit:hover]/node:pointer-events-none',
                      // Enlarged text gets a backing so it reads over lines and neighbours.
                      scaleText && zoomedOut && 'rounded-md bg-card/85 py-0.5',
                      // Text-only growth; on hover the whole node grows instead,
                      // so drop this to avoid scaling the text twice.
                      scaleText &&
                        'origin-top [scale:var(--grow-auto)] transition-[scale] duration-300 ease-out [[data-zooming]_&]:transition-none group-has-[.node-hit:hover]/node:[scale:none] group-has-[:focus-visible]/node:[scale:none]',
                      // A hovered node far zoomed out also gets a readable backing.
                      zoomedOut &&
                        'group-has-[.node-hit:hover]/node:rounded-md group-has-[.node-hit:hover]/node:bg-card/90',
                    )}
                  >
                    <span className="label-caps text-[10px]" style={{ color }}>
                      <DateText value={event.dateLabel} />
                    </span>
                    <span
                      className={cn(
                        'tl-title font-serif text-[13px] leading-snug text-pretty text-foreground/90',
                        compactLabels && 'line-clamp-2',
                        isSelected && 'text-foreground',
                      )}
                      title={compactLabels ? event.title : undefined}
                    >
                      {event.title}
                    </span>
                    {!compactLabels && (
                      <span className="label-caps text-[9px] text-muted-foreground/70">
                        {event.presentDay
                          ? 'Today'
                          : members
                            ? `${members.length} people`
                            : (event.person?.role ?? KIND_LABEL[event.kind])}
                      </span>
                    )}
                  </button>
                </div>
              )
            })}
      </>
    )
  }, [
    events,
    expandGroup,
    expandedGroups,
    openGroup,
    spreadFrom,
    gatherTo,
    collapsingGroups,
    compactLabels,
    edges,
    affiliations,
    editEvent,
    enlargeKinds,
    enlargeMode,
    enlargeOrigins,
    eras,
    flashId,
    focusIds,
    groups,
    height,
    isAdmin,
    isLayoutAnimating,
    laneGroups,
    lanes,
    nodes,
    originIds,
    origins,
    selectEvent,
    selectedId,
    showOrigins,
    width,
    zoomedOut,
  ])


  return (
    <div
      ref={scrollRef}
      className={cn(
        'tl-canvas no-scrollbar relative h-full cursor-grab overflow-auto rounded-xl border border-border',
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
            className={cn(
              'sticky left-0 z-10 h-full border-r bg-card/95',
              gutterTransition,
            )}
            style={gutterStyle}
          />
          {eras.map((era) => (
            <div
              key={era.label}
              className={cn(
                // Name and dates share one line; when the dates don't fit they
                // wrap to a second line that sits below the clipped bar, so
                // they disappear whole instead of being cut off mid-number.
                'absolute inset-y-0 flex flex-wrap content-start items-baseline gap-x-2 gap-y-6 overflow-hidden border-l border-border/70 pt-[11px] pr-2 pl-3',
                isLayoutAnimating &&
                  'transition-[left,width] duration-[350ms] ease-in-out',
              )}
              style={{
                left: gutter + era.left * renderedZoom,
                width: (era.right - era.left) * renderedZoom,
              }}
              title={`${era.label}, ${era.dates}`}
            >
              <span className="tl-era-label label-caps shrink-0 text-[10px] whitespace-nowrap text-muted-foreground">
                {era.label}
              </span>
              <span className="text-[10px] whitespace-nowrap text-muted-foreground/70 tabular-nums">
                {era.dates}
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
            className={cn(
              'sticky left-0 z-10 h-full border-r bg-card/95',
              gutterTransition,
            )}
            style={gutterStyle}
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
                  expandGroup(group.id)
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
                  left: gutter + left * renderedZoom,
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
                  <DateText value={group.dateLabel} /> · {count}
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
            className={cn(
              'sticky left-0 z-20 h-full overflow-hidden border-r bg-card/95 backdrop-blur',
              gutterTransition,
            )}
            style={gutterStyle}
          >
          {/* Full width and pinned to the right edge, so as the gutter
              narrows its contents slide out instead of squashing. */}
          <div
            className="absolute inset-y-0 right-0"
            style={{ width: LANE_GUTTER }}
            inert={!showLaneLabels}
            aria-hidden={!showLaneLabels || undefined}
          >
            {/* Top-level groups: an uppercase header with a rule, and a
                bracket beside their lanes. Nested groups are only a quiet
                sentence-case caption in line with their lanes, so the
                Protestant subgroups don't stack brackets and rules. */}
            {laneGroups.map((group) => {
              const headerTop = gutterTops.get(`group:${group.id}`) ?? 0
              const tint = `color-mix(in oklab, ${group.color} 45%, transparent)`
              if (group.depth > 0) {
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => jumpToLanes(group.lanes)}
                    title={`${group.blurb} Click to jump to its first event.`}
                    className="absolute right-3 cursor-pointer truncate rounded-md px-1 py-0.5 text-left text-[11px] leading-4 font-medium text-muted-foreground/90 transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    style={{
                      top: headerTop,
                      left: GUTTER_PAD + GUTTER_INDENT,
                    }}
                  >
                    {group.name}
                  </button>
                )
              }
              const bracketTop = headerTop + GROUP_HEADER_TEXT
              return (
                <React.Fragment key={group.id}>
                  {/* The canvas band, continued behind the lane labels. */}
                  {group.setApart && (
                    <div
                      className="tl-band-apart pointer-events-none absolute inset-x-0"
                      style={{
                        top: headerTop - 6,
                        height: Math.max(0, group.bottom * renderedZoom - (headerTop - 6)),
                      }}
                      aria-hidden="true"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => jumpToLanes(group.lanes)}
                    title={`${group.blurb} Click to jump to its first event.`}
                    className="label-caps absolute right-3 flex cursor-pointer items-center gap-2 overflow-hidden rounded-md px-1 py-0.5 text-left text-[10px] font-semibold tracking-wider whitespace-nowrap text-foreground/85 transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    style={{
                      top: headerTop,
                      left: GUTTER_PAD,
                    }}
                  >
                    <span className="truncate">{group.name}</span>
                    <span
                      className="h-px min-w-3 flex-1"
                      style={{ backgroundColor: tint }}
                    />
                  </button>
                  <span
                    className="pointer-events-none absolute w-px"
                    style={{
                      top: bracketTop,
                      left: GUTTER_PAD + 2,
                      height: Math.max(
                        0,
                        group.bottom * renderedZoom - 8 - bracketTop,
                      ),
                      backgroundColor: tint,
                    }}
                    aria-hidden="true"
                  />
                </React.Fragment>
              )
            })}

            {lanes.map((lane) => (
              <div
                key={lane.id}
                className="absolute right-3 flex flex-col items-start gap-1"
                style={{
                  top: gutterTops.get(`lane:${lane.id}`) ?? 0,
                  // One indent past the top-level bracket, however deeply the
                  // lane is nested; subgroup captions share this indent.
                  left: GUTTER_PAD + Math.min(lane.depth, 1) * GUTTER_INDENT,
                }}
              >
                <button
                  type="button"
                  onClick={() => jumpToLanes([lane.id])}
                  title={`${lane.blurb}${lane.origin ? ` Began ${formatDecades(lane.origin.dateLabel)} in ${lane.origin.place}.` : ''} Click to jump to its first event.`}
                  className="label-caps flex max-w-full cursor-pointer items-center gap-2 rounded-full bg-secondary/90 px-2.5 py-1 text-[10px] whitespace-nowrap text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <span
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: lane.color }}
                  />
                  <span className="truncate">{lane.name}</span>
                </button>
                {lane.origin && renderedZoom >= ORIGIN_LINE_ZOOM && (
                  <span className="flex max-w-full items-center gap-1 pl-2.5 text-[10px] text-muted-foreground/80">
                    <FlagIcon
                      className="size-2.5 shrink-0"
                      style={{ color: lane.color }}
                      aria-hidden="true"
                    />
                    <span className="truncate">Began <DateText value={lane.origin.dateLabel} /></span>
                  </span>
                )}
              </div>
            ))}
          </div>
          </div>

          {/* Geometry and nodes scale together with one GPU transform, so
              zooming never re-lays out the canvas. While a gesture runs the
              canvas is a cached bitmap (will-change, see globals.css) and may
              look soft; when it settles the browser repaints it at the new
              scale. The wrapper is sized to the scaled canvas and clips the
              unscaled layout box, which would otherwise stretch the
              scrollable area. */}
          {/* isolate: a stacking context of its own, so nothing on the canvas
              (enlarged flags, hovered nodes) can draw over the label gutter. */}
          <div
            className={cn(
              'absolute top-0 isolate overflow-clip',
              isLayoutAnimating && 'transition-[left] duration-[350ms] ease-in-out',
            )}
            style={{ left: gutter, width: scaledWidth, height: scaledHeight }}
          >
          <div
            className="tl-paper relative"
            style={{
              width,
              height,
              transform: `scale(${renderedZoom})`,
              transformOrigin: '0 0',
              // The settled zoom, and the enlarged-node scale derived from it
              // (zoomOutScale in CSS: max(1, (1 / zoom) ^ strength)).
              '--z': String(settledZoom),
              '--grow-auto': `max(1, pow(calc(1 / var(--z)), ${enlargeStrength}))`,
            } as React.CSSProperties}
          >
            {canvasContent}
          </div>
          </div>

        </div>
      </div>
    </div>
  )
}
