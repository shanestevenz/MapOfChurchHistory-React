'use client'

import * as React from 'react'
import { PlusIcon, TrashIcon, UploadIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { DateText } from '@/components/date-text'
import { EventIcon } from '@/components/event-icon'
import { PersonPortrait } from '@/components/person-node'
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
import { birthYearOf, groupConflicts, groupNamesOn, PERSON_TYPES } from '@/lib/timeline-people'
import type {
  EventKind,
  ExternalLink,
  PersonDetails,
  PersonType,
  TimelineEvent,
  TimelineGroup,
  TraditionId,
} from '@/lib/timeline-types'
import { cn } from '@/lib/utils'

const KINDS: { value: EventKind; label: string }[] = [
  { value: 'event', label: 'Milestone' },
  { value: 'council', label: 'Council' },
  { value: 'schism', label: 'Division' },
  { value: 'reunion', label: 'Reunion' },
  { value: 'person', label: 'Person' },
]

const MEMBERSHIP_ITEMS = [
  { value: 'member', label: 'Stayed a member' },
  { value: 'formerly', label: 'Left it' },
]

const BRANCH_FROM_ITEMS = [
  { value: 'auto', label: 'Automatic' },
  { value: 'node', label: 'The parent event’s node' },
  { value: 'date', label: 'The parent’s line, at this date' },
]

const PERSON_TYPE_ITEMS = PERSON_TYPES.map((type) => ({
  value: type.id,
  label: type.label,
}))

const BLANK_PERSON: PersonDetails = { role: '', type: 'theologian' }

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
  groups: TimelineGroup[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (event: TimelineEvent) => Promise<void>
  onDelete: (id: string) => Promise<void>
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
  groups,
  open,
  onOpenChange,
  onSave,
  onDelete,
}: EventEditorProps) {
  const isNew = event === null
  const [draft, setDraft] = React.useState<TimelineEvent>(event ?? BLANK)
  const [figures, setFigures] = React.useState('')
  const [aliases, setAliases] = React.useState('')
  const [isSaving, setIsSaving] = React.useState(false)
  const fileRef = React.useRef<HTMLInputElement>(null)

  // Reload the form whenever a different event is opened.
  React.useEffect(() => {
    if (!open) return
    const base = event ?? BLANK
    setDraft(base)
    setFigures((base.keyFigures ?? []).join(', '))
    setAliases((base.person?.aliases ?? []).join(', '))
  }, [event, open])

  const isPersonDraft = draft.kind === 'person'
  const personDraft = draft.person ?? BLANK_PERSON
  // The church on another lane this person belonged to, and whether they left it.
  const parentChurch = personDraft.affiliation ?? personDraft.formerly
  const leftChurch = Boolean(personDraft.formerly)
  const updatePerson = (patch: Partial<PersonDetails>) =>
    setDraft((current) => ({
      ...current,
      person: { ...(current.person ?? BLANK_PERSON), ...patch },
    }))

  const update = <K extends keyof TimelineEvent>(
    key: K,
    value: TimelineEvent[K],
  ) => setDraft((current) => ({ ...current, [key]: value }))

  // People groups already used on this lane, and the landmark events this
  // person lived through (which keep them out of any group).
  const groupNames = React.useMemo(
    () => groupNamesOn(draft.tradition, events),
    [draft.tradition, events],
  )
  const conflicts = React.useMemo(
    () => (isPersonDraft && personDraft.group?.trim() ? groupConflicts(draft, events) : []),
    [draft, events, isPersonDraft, personDraft.group],
  )
  const groupListId = React.useId()

  const traditionItems = React.useMemo(
    () =>
      [...TRADITIONS]
        .sort((a, b) => a.lane - b.lane)
        .map((tradition) => ({ value: tradition.id, label: tradition.name })),
    [],
  )

  const handleUpload = (file: File | undefined) => {
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
      toast.error('Choose a PNG, JPEG, WebP, or GIF image.')
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

  const submit = async () => {
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
    if (draft.year < -10000 || draft.year > 10000) {
      toast.error('The ordering year must be between -10000 and 10000.')
      return
    }
    if (draft.title.trim().length > 200 || draft.dateLabel.trim().length > 100) {
      toast.error('The title or date label is too long.')
      return
    }
    if (!draft.summary.trim() || draft.summary.trim().length > 2_000 || draft.detail.trim().length > 50_000) {
      toast.error('Add a summary and keep the event text within its length limits.')
      return
    }

    let person: PersonDetails | undefined
    if (isPersonDraft) {
      const role = personDraft.role.trim()
      if (!role || role.length > 200) {
        toast.error('A person needs a short role, such as "Bishop of Hippo".')
        return
      }
      const aliasList = aliases.split(',').map((alias) => alias.trim()).filter(Boolean)
      if (aliasList.length > 20 || aliasList.some((alias) => alias.length > 200)) {
        toast.error('Use no more than 20 other names, with shorter names.')
        return
      }
      person = { role, type: personDraft.type }
      const church = personDraft.affiliation ?? personDraft.formerly
      if (church && church !== draft.tradition) {
        if (personDraft.formerly) person.formerly = church
        else person.affiliation = church
      }
      if (aliasList.length) person.aliases = aliasList
      const persecution = personDraft.persecution?.trim()
      if (persecution && persecution.length > 300) {
        toast.error('Keep the persecution note to 300 characters or fewer.')
        return
      }
      if (persecution) person.persecution = persecution
      const group = personDraft.group?.trim()
      if (group && group.length > 100) {
        toast.error('Use a group name of 100 characters or fewer.')
        return
      }
      if (group) person.group = group
      const region = personDraft.region?.trim()
      if (region && region.length > 100) {
        toast.error('Use a region of 100 characters or fewer.')
        return
      }
      if (region) person.region = region
      const movement = personDraft.movement?.trim()
      if (movement && movement.length > 60) {
        toast.error('Use a movement tag of 60 characters or fewer.')
        return
      }
      if (movement) person.movement = movement
    }

    const id = draft.id || slugify(isPersonDraft ? `person-${draft.title}` : draft.title)
    if (isNew && events.some((candidate) => candidate.id === id)) {
      toast.error('An event with that title already exists.')
      return
    }

    const keyFigures = figures.split(',').map((figure) => figure.trim()).filter(Boolean)
    if (keyFigures.length > 50 || keyFigures.some((figure) => figure.length > 200)) {
      toast.error('Use no more than 50 key figures, with shorter names.')
      return
    }
    if (draft.parents.length > 10 || new Set(draft.parents).size !== draft.parents.length) {
      toast.error('Use no more than 10 unique parent events.')
      return
    }
    const links = (draft.links ?? []).filter((link) => link.label.trim() && link.url.trim())
    if (links.length > 20) {
      toast.error('Use no more than 20 external links.')
      return
    }
    for (const link of links) {
      try {
        const url = new URL(link.url)
        if (url.protocol !== 'https:' || url.username || url.password) throw new Error('unsafe')
      } catch {
        toast.error('Every external link must be a valid HTTPS URL without embedded credentials.')
        return
      }
      if (link.label.trim().length > 300 || link.url.length > 2_048) {
        toast.error('An external link is too long.')
        return
      }
    }

    setIsSaving(true)
    try {
      await onSave({
      ...draft,
      id,
      title: draft.title.trim(),
      dateLabel: draft.dateLabel.trim(),
      summary: draft.summary.trim(),
      detail: draft.detail.trim(),
      keyFigures,
      links: links.map((link) => ({ label: link.label.trim(), url: link.url.trim() })),
      // People sit on a lane without growing out of anything.
      parents: isPersonDraft ? [] : draft.parents,
      person,
      })
      onOpenChange(false)
      toast.success(isNew ? 'Event added to the timeline.' : 'Event updated.')
    } catch {
      toast.error('The event could not be saved. Check your session and try again.')
    } finally {
      setIsSaving(false)
    }
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
            {isNew ? 'Add an event or person' : isPersonDraft ? 'Edit person' : 'Edit event'}
          </DialogTitle>
          <DialogDescription>
            Changes are saved to the curator database after validation.
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
              <FieldLabel htmlFor="event-year">
                {isPersonDraft ? 'Year born (for ordering)' : 'Year (for ordering)'}
              </FieldLabel>
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
            <FieldLabel htmlFor="event-date">
              {isPersonDraft ? 'Lifespan' : 'Date label'}
            </FieldLabel>
            <Input
              id="event-date"
              value={draft.dateLabel}
              onChange={(e) => {
                const dateLabel = e.target.value
                // People are placed by birth: fill the year from the lifespan
                // whenever it gives one.
                const born = isPersonDraft ? birthYearOf({ ...draft, dateLabel }) : null
                setDraft((current) => ({
                  ...current,
                  dateLabel,
                  ...(born !== null ? { year: born } : {}),
                }))
              }}
              placeholder={isPersonDraft ? '354–430' : '16 July 1054'}
            />
            <FieldDescription>
              {isPersonDraft
                ? 'Shown on the node exactly as written — "354–430", "c. 1570–1612", "b. 1940".'
                : 'Shown on the node exactly as written — "c. AD 33", "1517", "1962–65".'}
            </FieldDescription>
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field>
              <FieldLabel>{isPersonDraft ? 'Lane (drawn on)' : 'Branch'}</FieldLabel>
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

          {isPersonDraft && (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="person-role">Role</FieldLabel>
                  <Input
                    id="person-role"
                    value={personDraft.role}
                    onChange={(e) => updatePerson({ role: e.target.value })}
                    placeholder="Bishop of Hippo"
                  />
                </Field>
                <Field>
                  <FieldLabel>Person type</FieldLabel>
                  <Select
                    items={PERSON_TYPE_ITEMS}
                    value={personDraft.type}
                    onValueChange={(value) => updatePerson({ type: value as PersonType })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {PERSON_TYPE_ITEMS.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field>
                <FieldLabel>Larger church</FieldLabel>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Select
                    items={[
                      { value: 'same', label: 'None — just this lane' },
                      ...traditionItems,
                    ]}
                    value={parentChurch ?? 'same'}
                    onValueChange={(value) => {
                      const church =
                        !value || value === 'same' ? undefined : (value as TraditionId)
                      updatePerson(
                        leftChurch
                          ? { formerly: church, affiliation: undefined }
                          : { affiliation: church, formerly: undefined },
                      )
                    }}
                  >
                    <SelectTrigger className="w-full" aria-label="Larger church">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="same">None — just this lane</SelectItem>
                        {traditionItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            <span
                              className="size-2 rounded-full"
                              style={{
                                backgroundColor: traditionColor(item.value as TraditionId),
                              }}
                            />
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {parentChurch && (
                    <Select
                      items={MEMBERSHIP_ITEMS}
                      value={leftChurch ? 'formerly' : 'member'}
                      onValueChange={(value) =>
                        updatePerson(
                          value === 'formerly'
                            ? { formerly: parentChurch, affiliation: undefined }
                            : { affiliation: parentChurch, formerly: undefined },
                        )
                      }
                    >
                      <SelectTrigger className="w-full" aria-label="Membership">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {MEMBERSHIP_ITEMS.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <FieldDescription>
                  A church on another lane they were part of: still a member
                  (John Wycliffe, Catholic, on the Anglican lane) or left it
                  (Martin Luther, once a Catholic monk). The node gets a dot
                  and a dashed line from that church&apos;s lane, and their
                  tags list the church. Explain the move in the description.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="person-persecution">
                  Persecution or condemnation
                </FieldLabel>
                <Input
                  id="person-persecution"
                  value={personDraft.persecution ?? ''}
                  onChange={(e) => updatePerson({ persecution: e.target.value })}
                  placeholder="Excommunicated by Pope Leo X, 1521"
                />
                <FieldDescription>
                  Optional. How they were martyred, jailed, exiled, excommunicated
                  or condemned, with the year. Shown in a red callout on their card.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="person-region">Country or region</FieldLabel>
                <Input
                  id="person-region"
                  value={personDraft.region ?? ''}
                  onChange={(e) => updatePerson({ region: e.target.value })}
                  placeholder="North Africa"
                />
                <FieldDescription>
                  Where they lived and worked, shown as a tag on their card.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="person-movement">Movement tag</FieldLabel>
                <Input
                  id="person-movement"
                  value={personDraft.movement ?? ''}
                  onChange={(e) => updatePerson({ movement: e.target.value })}
                  placeholder="Quaker"
                />
                <FieldDescription>
                  Optional. Replaces the lane&apos;s name in their tags when it
                  is more specific, e.g. &ldquo;Quaker&rdquo; or &ldquo;Amish&rdquo;.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="person-aliases">Other names</FieldLabel>
                <Input
                  id="person-aliases"
                  value={aliases}
                  onChange={(e) => setAliases(e.target.value)}
                  placeholder="Augustine, Saint Augustine"
                />
                <FieldDescription>
                  Separate names with commas. Key-figure tags on events that
                  use any of these names (or the title) link to this person.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="person-group">Group</FieldLabel>
                <Input
                  id="person-group"
                  list={groupListId}
                  value={personDraft.group ?? ''}
                  onChange={(e) => updatePerson({ group: e.target.value })}
                  placeholder="Early Church Fathers"
                />
                <datalist id={groupListId}>
                  {groupNames.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
                <FieldDescription>
                  Optional. People with the same group name on the same lane
                  are drawn as one node to keep busy stretches readable.
                  Anyone who lived through a major event on the lane (a
                  council, division or milestone) is always drawn on their own.
                </FieldDescription>
                {conflicts.length > 0 && (
                  <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-foreground">
                    Drawn on their own: their lifetime (
                    <DateText value={draft.dateLabel} />) spans{' '}
                    {conflicts.map((item) => item.title).join(', ')}.
                  </p>
                )}
              </Field>
            </>
          )}

          <Field>
            <FieldLabel>Progressive detail group</FieldLabel>
            <Select
              items={[
                { value: 'none', label: 'Main timeline (no group)' },
                ...groups.map((group) => ({
                  value: group.id,
                  label: group.title,
                })),
              ]}
              value={draft.groupId ?? 'none'}
              onValueChange={(value) =>
                update(
                  'groupId',
                  !value || value === 'none' ? undefined : value,
                )
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="none">Main timeline (no group)</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.title}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldDescription>
              Group membership controls progressive visibility only. It does
              not create a parent connection.
            </FieldDescription>
          </Field>

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
            <FieldLabel htmlFor="event-figures">
              {isPersonDraft ? 'Associated people' : 'Key figures'}
            </FieldLabel>
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
            <FieldLegend variant="label">{isPersonDraft ? 'Portrait' : 'Icon'}</FieldLegend>
            <FieldDescription>
              {isPersonDraft
                ? 'People are drawn as a bust in an arched frame. Upload a portrait to fill the frame instead.'
                : 'Pick a line icon, or upload a picture to use instead.'}
            </FieldDescription>
            <div className="flex items-center gap-3">
              {isPersonDraft ? (
                <PersonPortrait
                  icon={draft.icon}
                  title={draft.title || 'Preview'}
                  color={traditionColor(draft.tradition)}
                  className="h-14 w-11"
                />
              ) : (
                <span
                  className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-card"
                  style={{ borderColor: traditionColor(draft.tradition) }}
                >
                  <EventIcon icon={draft.icon} title={draft.title || 'Preview'} />
                </span>
              )}
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
                    update('icon', { type: 'lucide', name: isPersonDraft ? 'User' : 'Landmark' })
                  }
                >
                  <XIcon data-icon="inline-start" />
                  Remove picture
                </Button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="sr-only"
                onChange={(e) => handleUpload(e.target.files?.[0])}
              />
            </div>
            {!isPersonDraft && (
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
            )}
          </FieldSet>

          <Separator />

          {!isPersonDraft && (
          <FieldSet>
            <FieldLegend variant="label">Grows out of</FieldLegend>
            <FieldDescription>
              Select the earlier events this one branches from. This draws the
              connecting lines.
            </FieldDescription>
            <div className="grid max-h-52 gap-1 overflow-y-auto rounded-lg border border-border p-2 sm:grid-cols-2">
              {[...events]
                .filter((candidate) => candidate.id !== draft.id && candidate.kind !== 'person')
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
                        <DateText value={candidate.dateLabel} /> · {candidate.title}
                      </span>
                    </button>
                  )
                })}
            </div>
            {draft.parents.length > 0 && (
              <Field className="mt-3">
                <FieldLabel>Branch line starts from</FieldLabel>
                <Select
                  items={BRANCH_FROM_ITEMS}
                  value={draft.branchFrom ?? 'auto'}
                  onValueChange={(value) =>
                    update(
                      'branchFrom',
                      value === 'node' || value === 'date' ? value : undefined,
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {BRANCH_FROM_ITEMS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription>
                  For parents on another lane. Automatic draws the line from
                  the parent&apos;s node when it is a schism (the division this
                  branch came out of), and otherwise from the parent&apos;s line
                  at the date this branch began.
                </FieldDescription>
              </Field>
            )}
          </FieldSet>
          )}

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
              disabled={isSaving}
              onClick={async () => {
                if (!window.confirm(`Delete “${draft.title}”? This cannot be undone from the editor.`)) return
                setIsSaving(true)
                try {
                  await onDelete(draft.id)
                  onOpenChange(false)
                  toast.success('Event removed from the timeline.')
                } catch {
                  toast.error('The event could not be deleted. Check your session and try again.')
                } finally {
                  setIsSaving(false)
                }
              }}
            >
              <TrashIcon data-icon="inline-start" />
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={isSaving}>
            {isNew ? (
              <>
                <PlusIcon data-icon="inline-start" />
                {isSaving ? 'Adding…' : 'Add event'}
              </>
            ) : (
              isSaving ? 'Saving…' : 'Save changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
