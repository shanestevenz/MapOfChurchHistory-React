'use client'

import * as React from 'react'
import {
  GitBranchIcon,
  MouseIcon,
  SlidersHorizontalIcon,
  XIcon,
} from 'lucide-react'
import { AdminBar } from '@/components/admin-bar'
import { EventDetailPanel } from '@/components/event-detail-panel'
import { EventDialog } from '@/components/event-dialog'
import { EventEditor } from '@/components/event-editor'
import { SuggestEditDialog } from '@/components/suggest-edit-dialog'
import { SuggestionQueue } from '@/components/suggestion-queue'
import { TimelineFiltersPanel } from '@/components/timeline-filters-panel'
import { TimelineGraph } from '@/components/timeline-graph'
import { useTimeline } from '@/components/timeline-provider'
import { ZoomControl } from '@/components/zoom-control'
import { TimelineGroupManager } from '@/components/timeline-group-manager'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { withPresentDayEndpoints } from '@/lib/present-day-data'
import {
  activeFilterCount,
  applyFilters,
  DEFAULT_FILTERS,
  emptyTraditions,
  lineageOf,
  loadFilters,
  saveFilters,
  type TimelineFilters,
} from '@/lib/timeline-filters'
import { ERAS } from '@/lib/timeline-layout'
import type { TimelineEvent } from '@/lib/timeline-types'
import { cn } from '@/lib/utils'

const PANEL_KEY = 'timeline-filters-open:v1'

export function TimelinePage() {
  const { events, groups, isAdmin, saveEvent, deleteEvent } = useTimeline()

  const [filters, setFilters] =
    React.useState<TimelineFilters>(DEFAULT_FILTERS)
  const [filtersOpen, setFiltersOpen] = React.useState(false)
  const [panelAnimates, setPanelAnimates] = React.useState(false)
  const [focusRequest, setFocusRequest] = React.useState<{
    id: string
    key: number
  } | null>(null)
  const [selected, setSelected] = React.useState<TimelineEvent | null>(null)
  const [zoom, setZoom] = React.useState(1)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [panelOpen, setPanelOpen] = React.useState(false)
  const [editorOpen, setEditorOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<TimelineEvent | null>(null)
  const [suggestOpen, setSuggestOpen] = React.useState(false)
  const [suggesting, setSuggesting] = React.useState<TimelineEvent | null>(null)
  const [queueOpen, setQueueOpen] = React.useState(false)
  const [groupsOpen, setGroupsOpen] = React.useState(false)

  const displayedEvents = React.useMemo(
    () => withPresentDayEndpoints(events),
    [events],
  )

  // Restore saved filters after mount so server and client markup match.
  const restoredRef = React.useRef(false)
  React.useEffect(() => {
    let open: boolean | null = null
    try {
      const saved = window.localStorage.getItem(PANEL_KEY)
      if (saved !== null) open = saved === '1'
    } catch {
      // Storage can be blocked; fall back to the default below.
    }
    // First visit: open the panel only where there is room beside the map.
    setFilters(loadFilters())
    setFiltersOpen(open ?? window.matchMedia('(min-width: 1280px)').matches)
    restoredRef.current = true
    // Only animate the panel after its saved state is in place, so a
    // returning visitor doesn't watch it slide in on every page load.
    const frame = requestAnimationFrame(() => setPanelAnimates(true))
    return () => cancelAnimationFrame(frame)
  }, [])
  React.useEffect(() => {
    if (restoredRef.current) saveFilters(filters)
  }, [filters])

  const setPanelVisible = (open: boolean) => {
    setFiltersOpen(open)
    try {
      window.localStorage.setItem(PANEL_KEY, open ? '1' : '0')
    } catch {
      // Not remembering the panel state is harmless.
    }
  }

  const filteredEvents = React.useMemo(
    () => applyFilters(displayedEvents, filters),
    [displayedEvents, filters],
  )
  const hiddenLanes = React.useMemo(() => {
    const result = new Set(filters.hiddenTraditions)
    if (filters.hideEmptyLanes) {
      for (const id of emptyTraditions(filteredEvents)) result.add(id)
    }
    return result
  }, [filteredEvents, filters.hiddenTraditions, filters.hideEmptyLanes])
  const shownCount = filteredEvents.filter((event) => !event.presentDay).length

  const focusedEvent =
    filters.focusLineage && selected
      ? (filteredEvents.find((event) => event.id === selected.id) ?? null)
      : null
  const focusIds = React.useMemo(
    () => (focusedEvent ? lineageOf(filteredEvents, focusedEvent.id) : null),
    [filteredEvents, focusedEvent],
  )

  /** Reveals an event (loosening any filter that hides it) and scrolls to it. */
  const jumpTo = (event: TimelineEvent) => {
    const era = ERAS.find(
      (item) => event.year >= item.from && event.year <= item.to,
    )
    setFilters((current) => ({
      ...current,
      hiddenTraditions: current.hiddenTraditions.filter(
        (id) => id !== event.tradition,
      ),
      hiddenKinds: current.hiddenKinds.filter((kind) => kind !== event.kind),
      hiddenEras: current.hiddenEras.filter((label) => label !== era?.label),
      showPresentDay: current.showPresentDay || Boolean(event.presentDay),
    }))
    setSelected(event)
    setFocusRequest({ id: event.id, key: Date.now() })
    if (!window.matchMedia('(min-width: 768px)').matches) {
      setPanelVisible(false)
    }
  }

  const counts = React.useMemo(() => {
    const result: Record<string, number> = {}
    for (const event of events) {
      result[event.tradition] = (result[event.tradition] ?? 0) + 1
    }
    return result
  }, [events])

  const span = React.useMemo(() => {
    const years = events.map((event) => event.year)
    return { first: Math.min(...years) }
  }, [events])

  const openEvent = (event: TimelineEvent) => {
    setSelected(event)
    setDialogOpen(true)
  }

  const openEditor = (event: TimelineEvent | null) => {
    if (event?.presentDay) return
    setDialogOpen(false)
    setEditing(event)
    setEditorOpen(true)
  }

  const openSuggest = (event: TimelineEvent) => {
    if (event.presentDay) return
    setDialogOpen(false)
    setPanelOpen(false)
    setSuggesting(event)
    setSuggestOpen(true)
  }

  const activeCount = activeFilterCount(filters)

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-card/60 px-4 backdrop-blur sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src="/site-logo.png"
            alt=""
            width={36}
            height={36}
            className="size-9 shrink-0 object-contain"
          />
          {/* Baseline-align the title and its meta, then optically centre the pair against the mark. */}
          <div className="flex min-w-0 items-baseline gap-3">
            <h1 className="truncate font-serif text-2xl leading-none">
              Map of Church History
            </h1>
            <span className="label-caps hidden text-[10px] whitespace-nowrap text-muted-foreground sm:inline">
              AD {span.first}—Present · {events.length} historical events
            </span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <p className="hidden items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground 2xl:flex">
            <MouseIcon className="size-3.5" />
            Wheel to zoom · left-drag to pan
          </p>
          <Separator orientation="vertical" className="hidden h-6 2xl:block" />
          <Button
            variant={filtersOpen ? 'secondary' : 'ghost'}
            size="sm"
            aria-expanded={filtersOpen}
            aria-controls="timeline-filters"
            onClick={() => setPanelVisible(!filtersOpen)}
          >
            <SlidersHorizontalIcon data-icon="inline-start" />
            Filters
            {activeCount > 0 && (
              <span className="ml-0.5 rounded-full bg-primary px-1.5 text-[10px] leading-4 font-medium text-primary-foreground tabular-nums">
                {activeCount}
              </span>
            )}
          </Button>
          <AdminBar
            onAddEvent={() => openEditor(null)}
            onReviewSuggestions={() => setQueueOpen(true)}
            onManageGroups={() => setGroupsOpen(true)}
          />
        </div>
      </header>

      {/* No flex gap: the panel carries its own spacing so it can close to zero width. */}
      <main className="relative flex min-h-0 flex-1 overflow-hidden p-3 sm:p-4">
        <div className="relative min-w-0 flex-1">
          {filters.focusLineage && (
            <div className="pointer-events-none absolute inset-x-0 top-[96px] z-30 flex justify-center px-4">
              <div className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full border border-border bg-card/95 py-1 pr-1 pl-3 text-xs shadow-lg backdrop-blur">
                <GitBranchIcon className="size-3.5 shrink-0 text-primary" />
                <span className="truncate">
                  {focusedEvent ? (
                    <>
                      Lineage of{' '}
                      <span className="font-medium">{focusedEvent.title}</span>
                    </>
                  ) : (
                    'Select an event to trace its lineage'
                  )}
                </span>
                {focusedEvent ? (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Clear lineage focus"
                    onClick={() => setSelected(null)}
                  >
                    <XIcon />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() =>
                      setFilters((current) => ({
                        ...current,
                        focusLineage: false,
                      }))
                    }
                  >
                    Turn off
                  </Button>
                )}
              </div>
            </div>
          )}

          <TimelineGraph
            events={filteredEvents}
            groups={groups}
            hidden={hiddenLanes}
            showOrigins={filters.showOrigins}
            compactLabels={filters.compactLabels}
            focusIds={focusIds}
            focusRequest={focusRequest}
            selectedId={selected?.id ?? null}
            isAdmin={isAdmin}
            zoom={zoom}
            onZoomChange={setZoom}
            onSelect={openEvent}
            onEdit={(event) => openEditor(event)}
          />
          <ZoomControl zoom={zoom} onZoomChange={setZoom} />
        </div>

        {/* Stays mounted so it can slide both ways; inert while closed. */}
        <aside
          id="timeline-filters"
          aria-label="Timeline filters"
          aria-hidden={!filtersOpen}
          inert={!filtersOpen}
          className={cn(
            'shrink-0 duration-300 ease-out motion-reduce:transition-none',
            // Narrow screens: slides in over the map from the right edge.
            'absolute inset-y-3 right-3 z-30 w-80 max-w-[calc(100%-1.5rem)] transition-[translate,opacity]',
            // Wider screens: docks beside the map, its width opening so the
            // map narrows smoothly instead of jumping.
            'md:static md:z-auto md:max-w-none md:overflow-hidden md:transition-[width,opacity]',
            filtersOpen
              ? 'translate-x-0 opacity-100 md:w-84'
              : 'pointer-events-none translate-x-[calc(100%+1rem)] opacity-0 md:w-0 md:translate-x-0',
            !panelAnimates && 'transition-none md:transition-none',
          )}
        >
          <div
            className={cn(
              'h-full overflow-hidden rounded-xl border border-border bg-card shadow-xl md:ml-4 md:w-80 md:shadow-none',
              'transition-[translate] duration-300 ease-out motion-reduce:transition-none',
              filtersOpen ? 'md:translate-x-0' : 'md:translate-x-12',
              !panelAnimates && 'transition-none',
            )}
          >
            <TimelineFiltersPanel
              filters={filters}
              onChange={setFilters}
              events={displayedEvents}
              counts={counts}
              shownCount={shownCount}
              onJump={jumpTo}
              onClose={() => setPanelVisible(false)}
            />
          </div>
        </aside>
      </main>

      <EventDialog
        event={selected}
        open={dialogOpen}
        isAdmin={isAdmin}
        onOpenChange={setDialogOpen}
        onLearnMore={(event) => {
          setSelected(event)
          setDialogOpen(false)
          setPanelOpen(true)
        }}
        onEdit={(event) => openEditor(event)}
        onSuggestEdit={openSuggest}
      />

      <EventDetailPanel
        event={selected}
        events={displayedEvents}
        open={panelOpen}
        onOpenChange={setPanelOpen}
        onNavigate={(event) => setSelected(event)}
        onSuggestEdit={openSuggest}
      />

      <EventEditor
        event={editing}
        events={events}
        groups={groups}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSave={saveEvent}
        onDelete={deleteEvent}
      />

      <SuggestEditDialog
        event={suggesting}
        open={suggestOpen}
        onOpenChange={setSuggestOpen}
      />

      <SuggestionQueue open={queueOpen} onOpenChange={setQueueOpen} />
      <TimelineGroupManager open={groupsOpen} onOpenChange={setGroupsOpen} />
    </div>
  )
}
