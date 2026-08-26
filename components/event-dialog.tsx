'use client'

import { ArrowRightIcon, FilePenLineIcon, PencilIcon } from 'lucide-react'
import { EventIcon } from '@/components/event-icon'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TRADITION_MAP } from '@/lib/timeline-data'
import { traditionColor } from '@/lib/timeline-layout'
import type { TimelineEvent } from '@/lib/timeline-types'

interface EventDialogProps {
  event: TimelineEvent | null
  open: boolean
  isAdmin: boolean
  onOpenChange: (open: boolean) => void
  onLearnMore: (event: TimelineEvent) => void
  onEdit: (event: TimelineEvent) => void
  onSuggestEdit: (event: TimelineEvent) => void
}

export function EventDialog({
  event,
  open,
  isAdmin,
  onOpenChange,
  onLearnMore,
  onEdit,
  onSuggestEdit,
}: EventDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {event && (
          <>
            <DialogHeader>
              <div className="flex items-start gap-3">
                <span
                  className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-card"
                  style={{ borderColor: traditionColor(event.tradition) }}
                >
                  <EventIcon icon={event.icon} title={event.title} />
                </span>
                <div className="flex flex-col gap-1">
                  <span
                    className="label-caps text-[10px]"
                    style={{ color: traditionColor(event.tradition) }}
                  >
                    {event.dateLabel}
                  </span>
                  <DialogTitle className="font-serif text-xl leading-tight text-balance">
                    {event.title}
                  </DialogTitle>
                </div>
              </div>
              <DialogDescription className="mt-1 leading-relaxed">
                {event.summary}
              </DialogDescription>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Badge variant="secondary">
                  {TRADITION_MAP[event.tradition]?.name ?? event.tradition}
                </Badge>
                {event.keyFigures?.slice(0, 3).map((figure) => (
                  <Badge key={figure} variant="outline">
                    {figure}
                  </Badge>
                ))}
              </div>
            </DialogHeader>
            <DialogFooter>
              {isAdmin ? (
                <Button
                  variant="ghost"
                  onClick={() => onEdit(event)}
                  className="sm:mr-auto"
                >
                  <PencilIcon data-icon="inline-start" />
                  Edit event
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => onSuggestEdit(event)}
                  className="sm:mr-auto"
                >
                  <FilePenLineIcon data-icon="inline-start" />
                  Suggest an edit
                </Button>
              )}
              <DialogClose render={<Button variant="outline" />}>
                Close
              </DialogClose>
              <Button onClick={() => onLearnMore(event)}>
                Learn more
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
