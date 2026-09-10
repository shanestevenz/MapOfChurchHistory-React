'use client'

import * as React from 'react'
import { PencilIcon, PlusIcon, TrashIcon } from 'lucide-react'
import { toast } from 'sonner'
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
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { TimelineGroup } from '@/lib/timeline-types'

const blankGroup = (): TimelineGroup => ({
  id: '',
  title: '',
  dateLabel: '',
  startYear: 1,
  endYear: 100,
  autoExpandZoom: 1.35,
})

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 64)

export function TimelineGroupManager({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { events, groups, saveGroup, deleteGroup } = useTimeline()
  const [draft, setDraft] = React.useState<TimelineGroup | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    if (!open) setDraft(null)
  }, [open])

  const update = <K extends keyof TimelineGroup>(
    key: K,
    value: TimelineGroup[K],
  ) => setDraft((current) => (current ? { ...current, [key]: value } : null))

  const submit = async () => {
    if (!draft) return
    const title = draft.title.trim()
    const id = draft.id || slugify(title)
    if (!title || !id || !draft.dateLabel.trim()) {
      toast.error('A group needs a title and date label.')
      return
    }
    if (draft.endYear < draft.startYear) {
      toast.error('The ending year must not be earlier than the starting year.')
      return
    }
    if (draft.autoExpandZoom < 0.3 || draft.autoExpandZoom > 2) {
      toast.error('Automatic expansion zoom must be between 30% and 200%.')
      return
    }
    if (!draft.id && groups.some((group) => group.id === id)) {
      toast.error('A group with that title already exists.')
      return
    }

    setIsSaving(true)
    try {
      await saveGroup({
        ...draft,
        id,
        title,
        dateLabel: draft.dateLabel.trim(),
      })
      setDraft(null)
      toast.success('Detail group saved.')
    } catch {
      toast.error('Could not save the detail group. Refresh your session and try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Detail groups</DialogTitle>
          <DialogDescription>
            Create progressive sections here, then assign events from the event
            editor. Grouping never creates timeline parent connections.
          </DialogDescription>
        </DialogHeader>

        {!draft ? (
          <div className="flex flex-col gap-3 py-2">
            {groups.map((group) => {
              const count = events.filter(
                (event) => event.groupId === group.id,
              ).length
              return (
                <div
                  key={group.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card/50 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif">{group.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {group.dateLabel} · {count} event{count === 1 ? '' : 's'} ·
                      expands at {Math.round(group.autoExpandZoom * 100)}%
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${group.title}`}
                    onClick={() => setDraft({ ...group })}
                  >
                    <PencilIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive"
                    aria-label={`Delete ${group.title}`}
                    disabled={isSaving}
                    onClick={async () => {
                      if (!window.confirm(`Delete “${group.title}”? Its events will remain on the main timeline.`)) return
                      setIsSaving(true)
                      try {
                        await deleteGroup(group.id)
                        toast.success('Detail group deleted. Events were kept.')
                      } catch {
                        toast.error('Could not delete the detail group. Refresh your session and try again.')
                      } finally {
                        setIsSaving(false)
                      }
                    }}
                  >
                    <TrashIcon />
                  </Button>
                </div>
              )
            })}
            {groups.length === 0 && (
              <p className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                No progressive detail groups yet.
              </p>
            )}
            <Button className="self-start" onClick={() => setDraft(blankGroup())}>
              <PlusIcon data-icon="inline-start" />
              Add detail group
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="group-title">Title</FieldLabel>
              <Input id="group-title" value={draft.title} onChange={(event) => update('title', event.target.value)} placeholder="Paul's Life & Journeys" />
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="group-date">Displayed date range</FieldLabel>
              <Input id="group-date" value={draft.dateLabel} onChange={(event) => update('dateLabel', event.target.value)} placeholder="c. AD 34–67" />
            </Field>
            <Field>
              <FieldLabel htmlFor="group-start">Starting year</FieldLabel>
              <Input id="group-start" type="number" value={draft.startYear} onChange={(event) => update('startYear', Number(event.target.value))} />
            </Field>
            <Field>
              <FieldLabel htmlFor="group-end">Ending year</FieldLabel>
              <Input id="group-end" type="number" value={draft.endYear} onChange={(event) => update('endYear', Number(event.target.value))} />
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="group-zoom">Automatic expansion zoom</FieldLabel>
              <Input id="group-zoom" type="number" min={30} max={200} step={5} value={Math.round(draft.autoExpandZoom * 100)} onChange={(event) => update('autoExpandZoom', Number(event.target.value) / 100)} />
              <FieldDescription>Percentage between 30 and 200.</FieldDescription>
            </Field>
          </div>
        )}

        <DialogFooter>
          {draft ? (
            <>
              <Button variant="outline" onClick={() => setDraft(null)}>Back</Button>
              <Button onClick={() => void submit()} disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Save group'}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
