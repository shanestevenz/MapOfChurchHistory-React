'use client'

import * as React from 'react'
import { PlusIcon, TrashIcon, UploadIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { EventIcon } from '@/components/event-icon'
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
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { TRADITIONS } from '@/lib/timeline-data'
import { ICON_LIBRARY, ICON_NAMES } from '@/lib/timeline-icons'
import { traditionColor } from '@/lib/timeline-layout'
import type {
  EventKind,
  ExternalLink,
  TimelineEvent,
  TraditionId,
} from '@/lib/timeline-types'
import { cn } from '@/lib/utils'

const KINDS: { value: EventKind; label: string }[] = [
  { value: 'event', label: 'Milestone' },
  { value: 'council', label: 'Council' },
  { value: 'schism', label: 'Division' },
  { value: 'reunion', label: 'Reunion' },
]

const MAX_IMAGE_BYTES = 400_000

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 48) || `event-${Date.now()}`
  )
}

interface EventEditorProps {
  /** null means "create a new event". */
  event: TimelineEvent | null
  events: TimelineEvent[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (event: TimelineEvent) => void
  onDelete: (id: string) => void
}

const BLANK: TimelineEvent = {
  id: '',
  year: 1500,
  dateLabel: '',
  title: '',
  tradition: 'catholic',
  parents: [],
  kind: 'event',
  icon: { type: 'lucide', name: 'Landmark' },
  summary: '',
  detail: '',
  keyFigures: [],
  links: [],
}

export function EventEditor({
  event,
  events,
  open,
  onOpenChange,
  onSave,
  onDelete,
}: EventEditorProps) {
  const isNew = event === null
  const [draft, setDraft] = React.useState<TimelineEvent>(event ?? BLANK)
  const [figures, setFigures] = React.useState('')
  const fileRef = React.useRef<HTMLInputElement>(null)

  // Reload the form whenever a different event is opened.
  React.useEffect(() => {
    if (!open) return
    const base = event ?? BLANK
    setDraft(base)
    setFigures((base.keyFigures ?? []).join(', '))
  }, [event, open])

  const update = <K extends keyof TimelineEvent>(
    key: K,
    value: TimelineEvent[K],
  ) => setDraft((current) => ({ ...current, [key]: value }))

  const traditionItems = React.useMemo(
    () =>
      [...TRADITIONS]
        .sort((a, b) => a.lane - b.lane)
        .map((tradition) => ({ value: tradition.id, label: tradition.name })),
    [],
  )

  const handleUpload = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('That file is not an image.')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('Please choose an image under 400 KB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      update('icon', { type: 'image', src: String(reader.result) })
    }
    reader.readAsDataURL(file)
  }

  const submit = () => {
    if (!draft.title.trim()) {
      toast.error('An event needs a title.')
      return
    }
    if (!draft.dateLabel.trim()) {
      toast.error('An event needs a date label, such as "AD 1054".')
      return
    }
    if (!Number.isFinite(draft.year)) {
      toast.error('Enter a numeric year for ordering.')
      return
    }

    const id = draft.id || slugify(draft.title)
    if (isNew && events.some((candidate) => candidate.id === id)) {
      toast.error('An event with that title already exists.')
      return
    }

    onSave({
      ...draft,
      id,
      title: draft.title.trim(),
      dateLabel: draft.dateLabel.trim(),
      keyFigures: figures
        .split(',')
        .map((figure) => figure.trim())
        .filter(Boolean),
      links: (draft.links ?? []).filter(
        (link) => link.label.trim() && link.url.trim(),
      ),
    })
    onOpenChange(false)
    toast.success(isNew ? 'Event added to the timeline.' : 'Event updated.')
  }

  const setLink = (index: number, patch: Partial<ExternalLink>) => {
    const links = [...(draft.links ?? [])]
    links[index] = { ...links[index], ...patch }
    update('links', links)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] gap-0 overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="pb-4">
          <DialogTitle className="font-serif text-xl">
            {isNew ? 'Add an event' : 'Edit event'}
          </DialogTitle>
          <DialogDescription>
            Changes are saved in this browser only. Use Export in the editor bar
            to keep a copy.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup className="pb-6">
          <div className="grid gap-5 sm:grid-cols-[1fr_140px]">
            <Field>
              <FieldLabel htmlFor="event-title">Title</FieldLabel>
              <Input
                id="event-title"
                value={draft.title}
                onChange={(e) => update('title', e.target.value)}
                placeholder="The Great Schism"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="event-year">Year (for ordering)</FieldLabel>
              <Input
                id="event-year"
                type="number"
                value={Number.isFinite(draft.year) ? draft.year : ''}
                onChange={(e) => update('year', Number(e.target.value))}
                placeholder="1054"
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="event-date">Date label</FieldLabel>
            <Input
              id="event-date"
              value={draft.dateLabel}
              onChange={(e) => update('dateLabel', e.target.value)}
              placeholder="16 July 1054"
            />
            <FieldDescription>
              Shown on the node exactly as written — &quot;c. AD 33&quot;, &quot;1517&quot;, &quot;1962–65&quot;.
            </FieldDescription>
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field>
              <FieldLabel>Branch</FieldLabel>
              <Select
                items={traditionItems}
                value={draft.tradition}
                onValueChange={(value) =>
                  update('tradition', value as TraditionId)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {traditionItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        <span
                          className="size-2 rounded-full"
                          style={{
                            backgroundColor: traditionColor(
                              item.value as TraditionId,
                            ),
                          }}
                        />
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Kind</FieldLabel>
              <Select
                items={KINDS}
                value={draft.kind}
                onValueChange={(value) => update('kind', value as EventKind)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {KINDS.map((kind) => (
                      <SelectItem key={kind.value} value={kind.value}>
                        {kind.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="event-summary">Summary</FieldLabel>
            <Textarea
              id="event-summary"
              value={draft.summary}
              onChange={(e) => update('summary', e.target.value)}
              rows={2}
              placeholder="One or two sentences, shown in the quick dialog."
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="event-detail">Full description</FieldLabel>
            <Textarea
              id="event-detail"
              value={draft.detail}
              onChange={(e) => update('detail', e.target.value)}
              rows={6}
              placeholder="Shown in the Learn more panel. Leave a blank line between paragraphs."
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="event-figures">Key figures</FieldLabel>
            <Input
              id="event-figures"
              value={figures}
              onChange={(e) => setFigures(e.target.value)}
              placeholder="Martin Luther, Philip Melanchthon"
            />
            <FieldDescription>Separate names with commas.</FieldDescription>
          </Field>

          <Separator />

          <FieldSet>
            <FieldLegend variant="label">Icon</FieldLegend>
            <FieldDescription>
              Pick a line icon, or upload a picture to use instead.
            </FieldDescription>
            <div className="flex items-center gap-3">
              <span
                className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-card"
                style={{ borderColor: traditionColor(draft.tradition) }}
              >
                <EventIcon icon={draft.icon} title={draft.title || 'Preview'} />
              </span>
              <Button
                variant="outline"
                onClick={() => fileRef.current?.click()}
              >
                <UploadIcon data-icon="inline-start" />
                Upload picture
              </Button>
              {draft.icon.type === 'image' && (
                <Button
                  variant="ghost"
                  onClick={() =>
                    update('icon', { type: 'lucide', name: 'Landmark' })
                  }
                >
                  <XIcon data-icon="inline-start" />
                  Remove picture
                </Button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => handleUpload(e.target.files?.[0])}
              />
            </div>
            <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-14">
              {ICON_NAMES.map((name) => {
                const Glyph = ICON_LIBRARY[name]
                const isActive =
                  draft.icon.type === 'lucide' && draft.icon.name === name
                return (
                  <button
                    key={name}
                    type="button"
                    aria-label={name}
                    aria-pressed={isActive}
                    onClick={() => update('icon', { type: 'lucide', name })}
                    className={cn(
                      'flex aspect-square items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
                      isActive &&
                        'border-primary bg-primary/15 text-primary hover:bg-primary/15 hover:text-primary',
                    )}
                  >
                    <Glyph className="size-4" />
                  </button>
                )
              })}
            </div>
          </FieldSet>

          <Separator />

          <FieldSet>
            <FieldLegend variant="label">Grows out of</FieldLegend>
            <FieldDescription>
              Select the earlier events this one branches from. This draws the
              connecting lines.
            </FieldDescription>
            <div className="grid max-h-52 gap-1 overflow-y-auto rounded-lg border border-border p-2 sm:grid-cols-2">
              {[...events]
                .filter((candidate) => candidate.id !== draft.id)
                .sort((a, b) => a.year - b.year)
                .map((candidate) => {
                  const isActive = draft.parents.includes(candidate.id)
                  return (
                    <button
                      key={candidate.id}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() =>
                        update(
                          'parents',
                          isActive
                            ? draft.parents.filter((id) => id !== candidate.id)
                            : [...draft.parents, candidate.id],
                        )
                      }
                      className={cn(
                        'flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent',
                        isActive && 'bg-primary/15 text-primary',
                      )}
                    >
                      <span
                        className="size-1.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor: traditionColor(candidate.tradition),
                        }}
                      />
                      <span className="truncate">
                        {candidate.dateLabel} · {candidate.title}
                      </span>
                    </button>
                  )
                })}
            </div>
          </FieldSet>

          <Separator />

          <FieldSet>
            <FieldLegend variant="label">Places to learn more</FieldLegend>
            <div className="flex flex-col gap-2">
              {(draft.links ?? []).map((link, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    aria-label="Link label"
                    value={link.label}
                    onChange={(e) => setLink(index, { label: e.target.value })}
                    placeholder="Britannica: The Great Schism"
                  />
                  <Input
                    aria-label="Link URL"
                    value={link.url}
                    onChange={(e) => setLink(index, { url: e.target.value })}
                    placeholder="https://…"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remove link"
                    onClick={() =>
                      update(
                        'links',
                        (draft.links ?? []).filter((_, i) => i !== index),
                      )
                    }
                  >
                    <TrashIcon />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                className="self-start"
                onClick={() =>
                  update('links', [
                    ...(draft.links ?? []),
                    { label: '', url: '' },
                  ])
                }
              >
                <PlusIcon data-icon="inline-start" />
                Add link
              </Button>
            </div>
          </FieldSet>
        </FieldGroup>

        <DialogFooter>
          {!isNew && (
            <Button
              variant="ghost"
              className="text-destructive sm:mr-auto"
              onClick={() => {
                onDelete(draft.id)
                onOpenChange(false)
                toast.success('Event removed from the timeline.')
              }}
            >
              <TrashIcon data-icon="inline-start" />
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>
            {isNew ? (
              <>
                <PlusIcon data-icon="inline-start" />
                Add event
              </>
            ) : (
              'Save changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
