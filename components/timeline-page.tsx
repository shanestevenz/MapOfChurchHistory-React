'use client'

import * as React from 'react'
import Link from 'next/link'
import { MapIcon, MouseIcon } from 'lucide-react'
import { AdminBar } from '@/components/admin-bar'
import { EventDetailPanel } from '@/components/event-detail-panel'
import { EventDialog } from '@/components/event-dialog'
import { EventEditor } from '@/components/event-editor'
import { SuggestEditDialog } from '@/components/suggest-edit-dialog'
import { SuggestionQueue } from '@/components/suggestion-queue'
import { TimelineGraph } from '@/components/timeline-graph'
import { TimelineLegend } from '@/components/timeline-legend'
import { useTimeline } from '@/components/timeline-provider'
import { ZoomControl } from '@/components/zoom-control'
import { TimelineGroupManager } from '@/components/timeline-group-manager'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { TimelineEvent, TraditionId } from '@/lib/timeline-types'

export function TimelinePage() {
  const { events, groups, isAdmin, saveEvent, deleteEvent } = useTimeline()

  const [hidden, setHidden] = React.useState<Set<TraditionId>>(new Set())
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

  const counts = React.useMemo(() => {
    const result: Record<string, number> = {}
    for (const event of events) {
      result[event.tradition] = (result[event.tradition] ?? 0) + 1
    }
    return result
  }, [events])

  const span = React.useMemo(() => {
    const years = events.map((event) => event.year)
    return { first: Math.min(...years), last: Math.max(...years) }
  }, [events])

  const toggleTradition = (id: TraditionId) => {
    setHidden((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const openEvent = (event: TimelineEvent) => {
    setSelected(event)
    setDialogOpen(true)
  }

  const openEditor = (event: TimelineEvent | null) => {
    setDialogOpen(false)
    setEditing(event)
    setEditorOpen(true)
  }

  const openSuggest = (event: TimelineEvent) => {
    setDialogOpen(false)
    setPanelOpen(false)
    setSuggesting(event)
    setSuggestOpen(true)
  }

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
              AD {span.first}—{span.last} · {events.length} events
            </span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <p className="hidden items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground 2xl:flex">
            <MouseIcon className="size-3.5" />
            Wheel to zoom · middle-drag to pan
          </p>
          <Separator orientation="vertical" className="hidden h-6 2xl:block" />
          <Button render={<Link href="/maps" />} variant="ghost" size="sm">
            <MapIcon />
            <span className="hidden sm:inline">Maps</span>
          </Button>
          <TimelineLegend
            hidden={hidden}
            counts={counts}
            onToggle={toggleTradition}
            onShowAll={() => setHidden(new Set())}
          />
          <AdminBar
            onAddEvent={() => openEditor(null)}
            onReviewSuggestions={() => setQueueOpen(true)}
            onManageGroups={() => setGroupsOpen(true)}
          />
        </div>
      </header>

      <main className="relative min-h-0 flex-1 p-3 sm:p-4">
        <TimelineGraph
          events={events}
          groups={groups}
          hidden={hidden}
          selectedId={selected?.id ?? null}
          isAdmin={isAdmin}
          zoom={zoom}
          onZoomChange={setZoom}
          onSelect={openEvent}
          onEdit={(event) => openEditor(event)}
        />
        <ZoomControl zoom={zoom} onZoomChange={setZoom} />
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
        events={events}
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
