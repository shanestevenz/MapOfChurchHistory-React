'use client'

import * as React from 'react'
import { CheckIcon, InboxIcon, LinkIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useTimeline } from '@/components/timeline-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SUGGESTABLE_FIELDS } from '@/lib/timeline-types'
import type { EditSuggestion } from '@/lib/timeline-types'

const FIELD_LABEL = Object.fromEntries(
  SUGGESTABLE_FIELDS.map(({ field, label }) => [field, label]),
)

interface SuggestionQueueProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SuggestionQueue({ open, onOpenChange }: SuggestionQueueProps) {
  const { suggestions, approveSuggestion, declineSuggestion } = useTimeline()

  const pending = suggestions.filter((item) => item.status === 'pending')
  const reviewed = suggestions.filter((item) => item.status !== 'pending')

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-xl">
        <SheetHeader className="gap-1 border-b border-border p-6">
          <SheetTitle className="font-serif text-2xl">
            Suggested edits
          </SheetTitle>
          <SheetDescription>
            Community proposals awaiting curator review. Approving applies the
            change to the timeline immediately.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="pending" className="min-h-0 flex-1 gap-0">
          <div className="px-6 pt-4">
            <TabsList>
              <TabsTrigger value="pending">
                Pending
                {pending.length > 0 && (
                  <Badge variant="secondary">{pending.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="reviewed">
                Reviewed
                {reviewed.length > 0 && (
                  <Badge variant="secondary">{reviewed.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="pending"
            className="min-h-0 flex-1 overflow-y-auto p-6"
          >
            {pending.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <InboxIcon />
                  </EmptyMedia>
                  <EmptyTitle>Nothing to review</EmptyTitle>
                  <EmptyDescription>
                    Visitor suggestions will collect here for approval.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="flex flex-col gap-4">
                {pending.map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    onApprove={() => {
                      approveSuggestion(suggestion.id)
                      toast.success('Suggestion approved and applied.')
                    }}
                    onDecline={() => {
                      declineSuggestion(suggestion.id)
                      toast.success('Suggestion declined.')
                    }}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent
            value="reviewed"
            className="min-h-0 flex-1 overflow-y-auto p-6"
          >
            {reviewed.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>No decisions yet</EmptyTitle>
                  <EmptyDescription>
                    Approved and declined suggestions are kept here as a record.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="flex flex-col gap-4">
                {reviewed.map((suggestion) => (
                  <SuggestionCard key={suggestion.id} suggestion={suggestion} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}

function SuggestionCard({
  suggestion,
  onApprove,
  onDecline,
}: {
  suggestion: EditSuggestion
  onApprove?: () => void
  onDecline?: () => void
}) {
  const isPending = suggestion.status === 'pending'

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border bg-card/60 p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="label-caps text-[9px] text-muted-foreground">
            {suggestion.contributor} ·{' '}
            {new Date(suggestion.createdAt).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
          <h3 className="font-serif text-base leading-tight text-pretty">
            {suggestion.eventTitle}
          </h3>
        </div>
        <Badge
          variant={
            suggestion.status === 'approved'
              ? 'default'
              : suggestion.status === 'declined'
                ? 'outline'
                : 'secondary'
          }
          className="shrink-0 capitalize"
        >
          {suggestion.status}
        </Badge>
      </header>

      <p className="border-l-2 border-primary/40 pl-3 text-sm leading-relaxed text-muted-foreground italic">
        {suggestion.note}
      </p>

      {suggestion.changes.length > 0 && (
        <div className="flex flex-col gap-3">
          {suggestion.changes.map((change) => (
            <div key={change.field} className="flex flex-col gap-1.5">
              <span className="label-caps text-[9px] text-muted-foreground">
                {FIELD_LABEL[change.field] ?? change.field}
              </span>
              <p className="rounded-md bg-destructive/10 px-2.5 py-1.5 text-[13px] leading-relaxed text-foreground/70 line-through decoration-destructive/50">
                {change.before || '—'}
              </p>
              <p className="rounded-md bg-primary/10 px-2.5 py-1.5 text-[13px] leading-relaxed text-foreground">
                {change.after}
              </p>
            </div>
          ))}
        </div>
      )}

      {suggestion.source && (
        <a
          href={suggestion.source.url}
          target="_blank"
          rel="noreferrer noopener"
          className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-xs transition-colors hover:bg-accent"
        >
          <LinkIcon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{suggestion.source.label}</span>
        </a>
      )}

      {isPending && onApprove && onDecline && (
        <>
          <Separator />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onDecline}>
              <XIcon data-icon="inline-start" />
              Decline
            </Button>
            <Button size="sm" onClick={onApprove}>
              <CheckIcon data-icon="inline-start" />
              Approve
            </Button>
          </div>
        </>
      )}
    </article>
  )
}
