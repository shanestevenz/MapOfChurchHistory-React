'use client'

import * as React from 'react'
import { SendIcon } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  TurnstileWidget,
  type TurnstileWidgetHandle,
} from '@/components/turnstile-widget'
import { useTimeline } from '@/components/timeline-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  SUGGESTABLE_FIELDS,
  type SuggestionChange,
  type TimelineEvent,
} from '@/lib/timeline-types'

interface SuggestEditDialogProps {
  event: TimelineEvent | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Draft = Record<string, string>

const draftFrom = (event: TimelineEvent | null): Draft => ({
  title: event?.title ?? '',
  dateLabel: event?.dateLabel ?? '',
  summary: event?.summary ?? '',
  detail: event?.detail ?? '',
})

/**
 * Wikipedia-style contribution flow: any visitor may propose wording changes
 * with an edit summary and a citation, but nothing lands until a curator
 * approves it in the review queue.
 */
export function SuggestEditDialog({
  event,
  open,
  onOpenChange,
}: SuggestEditDialogProps) {
  const { submitSuggestion } = useTimeline()

  const [draft, setDraft] = React.useState<Draft>(() => draftFrom(event))
  const [contributor, setContributor] = React.useState('')
  const [note, setNote] = React.useState('')
  const [sourceLabel, setSourceLabel] = React.useState('')
  const [sourceUrl, setSourceUrl] = React.useState('')
  const [showNoteError, setShowNoteError] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [turnstileToken, setTurnstileToken] = React.useState('')
  const turnstileRef = React.useRef<TurnstileWidgetHandle>(null)
  const turnstileRequired = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)

  // Reset the form whenever a different event is opened for suggestions.
  React.useEffect(() => {
    if (!open) return
    setDraft(draftFrom(event))
    setNote('')
    setSourceLabel('')
    setSourceUrl('')
    setShowNoteError(false)
    setIsSubmitting(false)
    setTurnstileToken('')
  }, [open, event])

  const changes: SuggestionChange[] = React.useMemo(() => {
    if (!event) return []
    return SUGGESTABLE_FIELDS.map(({ field }) => ({
      field,
      before: event[field],
      after: draft[field]?.trim() ?? '',
    })).filter((change) => change.after && change.after !== change.before)
  }, [draft, event])

  const hasSource = sourceUrl.trim().length > 0
  const canSubmit = changes.length > 0 || hasSource

  const submit = async () => {
    if (!event || !canSubmit) return
    if (!note.trim()) {
      setShowNoteError(true)
      return
    }

    setIsSubmitting(true)
    try {
      await submitSuggestion(
        {
          eventId: event.id,
          eventTitle: event.title,
          contributor: contributor.trim() || 'Anonymous',
          note: note.trim(),
          changes,
          source: hasSource
            ? {
                label: sourceLabel.trim() || sourceUrl.trim(),
                url: sourceUrl.trim(),
              }
            : undefined,
        },
        turnstileToken,
      )

      onOpenChange(false)
      toast.success('Suggestion submitted for review.', {
        description: 'A curator will review it before it appears publicly.',
      })
    } catch (error) {
      turnstileRef.current?.reset()
      toast.error('Could not submit the suggestion.', {
        description: error instanceof Error && error.message.includes('too many')
          ? 'Too many submissions were received. Please wait and try again later.'
          : 'Check the form and your connection, then try again.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] gap-0 overflow-y-auto sm:max-w-2xl">
        {event && (
          <>
            <DialogHeader>
              <DialogTitle className="font-serif text-xl">
                Suggest an edit
              </DialogTitle>
              <DialogDescription>
                {'Proposing changes to '}
                <span className="text-foreground">{event.title}</span>
                {
                  '. Edit the text below, say why, and a curator will review it. Nothing is published directly.'
                }
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-6 py-4">
              <FieldGroup>
                {SUGGESTABLE_FIELDS.map(({ field, label, multiline }) => {
                  const changed =
                    draft[field]?.trim() !== event[field] &&
                    draft[field]?.trim().length > 0
                  return (
                    <Field key={field}>
                      <FieldLabel htmlFor={`suggest-${field}`}>
                        {label}
                        {changed && (
                          <span className="label-caps ml-2 text-[9px] text-primary">
                            Changed
                          </span>
                        )}
                      </FieldLabel>
                      {multiline ? (
                        <Textarea
                          id={`suggest-${field}`}
                          rows={field === 'detail' ? 8 : 3}
                          value={draft[field]}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, [field]: e.target.value }))
                          }
                        />
                      ) : (
                        <Input
                          id={`suggest-${field}`}
                          value={draft[field]}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, [field]: e.target.value }))
                          }
                        />
                      )}
                    </Field>
                  )
                })}
              </FieldGroup>

              <Separator />

              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="suggest-source-url">
                    Supporting source
                  </FieldLabel>
                  <Input
                    id="suggest-source-url"
                    type="url"
                    placeholder="https://…"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                  />
                  <FieldDescription>
                    Optional. Added to the event&apos;s reading list if
                    approved.
                  </FieldDescription>
                </Field>

                {hasSource && (
                  <Field>
                    <FieldLabel htmlFor="suggest-source-label">
                      Source title
                    </FieldLabel>
                    <Input
                      id="suggest-source-label"
                      placeholder="Britannica — Council of Nicaea"
                      value={sourceLabel}
                      onChange={(e) => setSourceLabel(e.target.value)}
                    />
                  </Field>
                )}

                <Field>
                  <FieldLabel htmlFor="suggest-contributor">
                    Your name
                  </FieldLabel>
                  <Input
                    id="suggest-contributor"
                    placeholder="Anonymous"
                    value={contributor}
                    onChange={(e) => setContributor(e.target.value)}
                  />
                </Field>

                <Field data-invalid={showNoteError || undefined}>
                  <FieldLabel htmlFor="suggest-note">Edit summary</FieldLabel>
                  <Textarea
                    id="suggest-note"
                    rows={3}
                    aria-invalid={showNoteError || undefined}
                    placeholder="Corrected the date and clarified who convened the council."
                    value={note}
                    onChange={(e) => {
                      setNote(e.target.value)
                      setShowNoteError(false)
                    }}
                  />
                  <FieldDescription>
                    {showNoteError
                      ? 'Please explain your change so a curator can review it.'
                      : 'Required. Briefly explain what you changed and why.'}
                  </FieldDescription>
                </Field>
              </FieldGroup>

              <div className="flex flex-col gap-2">
                <TurnstileWidget
                  ref={turnstileRef}
                  action="suggestion"
                  onTokenChange={setTurnstileToken}
                />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Submissions are protected against automated abuse. See the{' '}
                  <Link href="/privacy" className="underline underline-offset-2">
                    privacy notice
                  </Link>
                  .
                </p>
              </div>
            </div>

            <DialogFooter className="border-t border-border pt-4">
              <span className="label-caps mr-auto self-center text-[10px] text-muted-foreground">
                {changes.length === 0 && !hasSource
                  ? 'No changes yet'
                  : `${changes.length} field${changes.length === 1 ? '' : 's'} changed${hasSource ? ' · 1 source' : ''}`}
              </span>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => void submit()}
                disabled={!canSubmit || isSubmitting || (turnstileRequired && !turnstileToken)}
              >
                <SendIcon data-icon="inline-start" />
                {isSubmitting ? 'Submitting…' : 'Submit for review'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
