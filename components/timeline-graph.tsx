'use client'

import * as React from 'react'
import { PencilIcon } from 'lucide-react'
import { EventIcon } from '@/components/event-icon'
import {
  buildLayout,
  COL_WIDTH,
  ERA_BAR,
  laneTop,
  NODE_SIZE,
} from '@/lib/timeline-layout'
import type { TimelineEvent, TraditionId } from '@/lib/timeline-types'
import { cn } from '@/lib/utils'

const KIND_LABEL: Record<TimelineEvent['kind'], string> = {
  event: 'Milestone',
  council: 'Council',
  schism: 'Division',
  reunion: 'Reunion',
}

export const MIN_ZOOM = 0.3
export const MAX_ZOOM = 2

const clampZoom = (value: number) =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))

interface TimelineGraphProps {
  events: TimelineEvent[]
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

  // Listeners are attached once, so the live zoom is read through refs.
  const zoomRef = React.useRef(zoom)
  const onZoomChangeRef = React.useRef(onZoomChange)
  zoomRef.current = zoom
  onZoomChangeRef.current = onZoomChange

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

      const current = zoomRef.current
      const next = clampZoom(current * Math.exp(-event.deltaY * 0.0016))
      if (next === current) return

      const rect = el.getBoundingClientRect()
      const pointerX = event.clientX - rect.left
      const pointerY = event.clientY - rect.top

      // Content coordinate under the cursor, in unscaled canvas units.
      const contentX = (el.scrollLeft + pointerX) / current
      const contentY = (el.scrollTop + pointerY - ERA_BAR) / current

      onZoomChangeRef.current(next)

      // Re-anchor after React commits the new scale.
      requestAnimationFrame(() => {
        el.scrollLeft = contentX * next - pointerX
        el.scrollTop = contentY * next + ERA_BAR - pointerY
      })
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
      stop()
    }
  }, [ref])

  return isPanning
}

export function TimelineGraph({
  events,
  hidden,
  selectedId,
  isAdmin,
  zoom,
  onZoomChange,
  onSelect,
  onEdit,
}: TimelineGraphProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const isPanning = useCanvasGestures(scrollRef, zoom, onZoomChange)

  const layout = React.useMemo(() => buildLayout(events, hidden), [events, hidden])
  const { nodes, edges, eras, lanes, width, height } = layout

  const scaledWidth = width * zoom
  const scaledHeight = height * zoom

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
        className="relative"
        style={{ width: scaledWidth, height: scaledHeight + ERA_BAR }}
      >
        {/* Era ruler stays pinned and keeps a constant height as you zoom. */}
        <div
          className="sticky top-0 z-20 border-b border-border bg-card/85 backdrop-blur"
          style={{ width: scaledWidth, height: ERA_BAR }}
        >
          {eras.map((era) => (
            <div
              key={era.label}
              className="absolute inset-y-0 flex items-center border-l border-border/70 pl-3"
              style={{
                left: era.left * zoom,
                width: (era.right - era.left) * zoom,
              }}
            >
              <span className="label-caps text-[10px] whitespace-nowrap text-muted-foreground">
                {era.label}
              </span>
            </div>
          ))}
        </div>

        <div
          className="relative"
          style={{ width: scaledWidth, height: scaledHeight }}
        >
          {/* Geometry and nodes scale together. */}
          <div
            className="absolute top-0 left-0 origin-top-left"
            style={{ width, height, transform: `scale(${zoom})` }}
          >
            <svg
              className="absolute inset-0"
              width={width}
              height={height}
              aria-hidden="true"
            >
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

              {edges.map((edge) => {
                const [fromId, toId] = edge.id.split('->')
                const isActive = selectedId === fromId || selectedId === toId
                return (
                  <path
                    key={edge.id}
                    d={edge.path}
                    fill="none"
                    stroke={edge.color}
                    strokeWidth={edge.isBranch ? 2.5 : 1.75}
                    strokeLinecap="round"
                    opacity={isActive ? 1 : 0.42}
                  />
                )
              })}
            </svg>

            {nodes.map(({ event, x, y, color }) => {
              const isSelected = selectedId === event.id
              return (
                <div
                  key={event.id}
                  className="absolute flex flex-col items-center"
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

          {/* Branch names ride the left edge and stay legible at any zoom. */}
          {lanes.map((lane) => (
            <div
              key={lane.id}
              className="pointer-events-none absolute z-10 flex"
              style={{ top: laneTop(lane.slot) * zoom + 8, width: scaledWidth }}
            >
              <span
                className="label-caps sticky left-3 flex items-center gap-2 rounded-full bg-secondary/90 px-2.5 py-1 text-[10px] whitespace-nowrap text-muted-foreground backdrop-blur"
                title={lane.blurb}
              >
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: lane.color }}
                />
                {lane.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
