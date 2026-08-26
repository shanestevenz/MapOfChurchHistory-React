'use client'

import {
  ExternalLinkIcon,
  FilePenLineIcon,
  GitBranchIcon,
} from 'lucide-react'
import { EventIcon } from '@/components/event-icon'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { TRADITION_MAP } from '@/lib/timeline-data'
import { traditionColor } from '@/lib/timeline-layout'
import type { TimelineEvent } from '@/lib/timeline-types'

interface EventDetailPanelProps {
  event: TimelineEvent | null
  events: TimelineEvent[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onNavigate: (event: TimelineEvent) => void
  onSuggestEdit: (event: TimelineEvent) => void
}

export function EventDetailPanel({
  event,
  events,
  open,
  onOpenChange,
  onNavigate,
  onSuggestEdit,
}: EventDetailPanelProps) {
  const parents = event
    ? events.filter((candidate) => event.parents.includes(candidate.id))
    : []
  const children = event
    ? events.filter((candidate) => candidate.parents.includes(event.id))
    : []
  const color = event ? traditionColor(event.tradition) : undefined

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto sm:max-w-lg"
      >
        {event && (
          <>
            <SheetHeader className="gap-3 border-b border-border p-6">
              <div className="flex items-start gap-3">
                <span
                  className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-card"
                  style={{ borderColor: color }}
                >
                  <EventIcon icon={event.icon} title={event.title} />
                </span>
                <div className="flex flex-col gap-1 pr-8">
                  <span className="label-caps text-[10px]" style={{ color }}>
                    {event.dateLabel}
                  </span>
                  <SheetTitle className="font-serif text-2xl leading-tight text-balance">
                    {event.title}
                  </SheetTitle>
                </div>
              </div>
              <SheetDescription className="leading-relaxed">
                {event.summary}
              </SheetDescription>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary">
                  {TRADITION_MAP[event.tradition]?.name ?? event.tradition}
                </Badge>
                {event.keyFigures?.map((figure) => (
                  <Badge key={figure} variant="outline">
                    {figure}
                  </Badge>
                ))}
              </div>
            </SheetHeader>

            <div className="flex flex-col gap-6 p-6">
              <div className="flex flex-col gap-4">
                {event.detail
                  .split('\n\n')
                  .filter(Boolean)
                  .map((paragraph, index) => (
                    <p
                      key={index}
                      className="font-serif text-[15px] leading-relaxed text-foreground/85"
                    >
                      {paragraph}
                    </p>
                  ))}
              </div>

              {(parents.length > 0 || children.length > 0) && (
                <>
                  <Separator />
                  <div className="flex flex-col gap-3">
                    <h3 className="label-caps flex items-center gap-2 text-[10px] text-muted-foreground">
                      <GitBranchIcon className="size-3.5" />
                      Connected on the timeline
                    </h3>
                    <div className="flex flex-col gap-2">
                      {parents.map((parent) => (
                        <ConnectionRow
                          key={parent.id}
                          label="Grows out of"
                          event={parent}
                          onNavigate={onNavigate}
                        />
                      ))}
                      {children.map((child) => (
                        <ConnectionRow
                          key={child.id}
                          label="Leads to"
                          event={child}
                          onNavigate={onNavigate}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {event.links && event.links.length > 0 && (
                <>
                  <Separator />
                  <div className="flex flex-col gap-3">
                    <h3 className="label-caps text-[10px] text-muted-foreground">
                      Places to learn more
                    </h3>
                    <div className="flex flex-col gap-2">
                      {event.links.map((link) => (
                        <a
                          key={link.url}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/60 px-3 py-2.5 text-sm transition-colors hover:border-primary/50 hover:bg-accent"
                        >
                          <span className="text-pretty">{link.label}</span>
                          <ExternalLinkIcon className="size-4 shrink-0 text-muted-foreground" />
                        </a>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />
              <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-border p-4">
                <h3 className="label-caps text-[10px] text-muted-foreground">
                  Spotted a problem?
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Anyone can propose a correction. Curators review every
                  suggestion before it appears here.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSuggestEdit(event)}
                >
                  <FilePenLineIcon data-icon="inline-start" />
                  Suggest an edit
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function ConnectionRow({
  label,
  event,
  onNavigate,
}: {
  label: string
  event: TimelineEvent
  onNavigate: (event: TimelineEvent) => void
}) {
  return (
    <Button
      variant="outline"
      onClick={() => onNavigate(event)}
      className="h-auto justify-start gap-3 px-3 py-2.5 text-left"
    >
      <span
        className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border"
        style={{ borderColor: traditionColor(event.tradition) }}
      >
        <EventIcon icon={event.icon} title={event.title} className="size-4" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="label-caps text-[9px] text-muted-foreground">
          {label} · {event.dateLabel}
        </span>
        <span className="truncate font-serif text-sm">{event.title}</span>
      </span>
    </Button>
  )
}
