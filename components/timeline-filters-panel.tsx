'use client'

import * as React from 'react'
import {
  CheckIcon,
  ChevronRightIcon,
  MinusIcon,
  RotateCcwIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  XIcon,
} from 'lucide-react'
import { DateText } from '@/components/date-text'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { TRADITION_MAP } from '@/lib/timeline-data'
import {
  activeFilterCount,
  DEFAULT_FILTERS,
  ENLARGE_KINDS,
  EVENT_KINDS,
  FILTER_PRESETS,
  TRADITION_CATEGORIES,
  type TimelineFilters,
  zoomOutScale,
} from '@/lib/timeline-filters'
import { MIN_ZOOM } from '@/components/timeline-graph'
import { ERAS, traditionColor } from '@/lib/timeline-layout'
import { PERSON_TYPES, searchableText } from '@/lib/timeline-people'
import { PersonGlyph } from '@/components/person-node'
import type {
  LaneGroup,
  TimelineEvent,
  TraditionId,
} from '@/lib/timeline-types'
import { cn } from '@/lib/utils'

interface TimelineFiltersPanelProps {
  filters: TimelineFilters
  onChange: (filters: TimelineFilters) => void
  /** Every event, including ones currently filtered out, for search. */
  events: TimelineEvent[]
  /** Event count per tradition, before filtering. */
  counts: Record<string, number>
  /** How many events are on the canvas right now. */
  shownCount: number
  onJump: (event: TimelineEvent) => void
  onClose: () => void
}

type CheckState = 'on' | 'off' | 'mixed'

function TriCheck({ state, color }: { state: CheckState; color?: string }) {
  return (
    <span
      className={cn(
        'flex size-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors',
        state === 'off'
          ? 'border-border bg-transparent'
          : 'border-transparent text-background',
      )}
      style={
        state === 'off'
          ? undefined
          : { backgroundColor: color ?? 'var(--primary)' }
      }
      aria-hidden="true"
    >
      {state === 'on' && <CheckIcon className="size-3" strokeWidth={3} />}
      {state === 'mixed' && <MinusIcon className="size-3" strokeWidth={3} />}
    </span>
  )
}

function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="border-b border-border px-4 py-3 last:border-b-0">
      <div className="mb-2 flex min-h-6 items-center justify-between gap-2">
        <h3 className="label-caps text-[10px] text-muted-foreground">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  )
}

function Chip({
  active,
  onClick,
  children,
  title,
  strikeInactive = true,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  title?: string
  /** Filter chips strike through what's hidden; option chips don't. */
  strikeInactive?: boolean
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      title={title}
      onClick={onClick}
      className={cn(
        'rounded-full border px-2.5 py-1 text-xs transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
        active
          ? 'border-primary/50 bg-primary/15 text-foreground'
          : 'border-border text-muted-foreground hover:bg-muted',
        !active && strikeInactive && 'line-through decoration-muted-foreground/50',
      )}
    >
      {children}
    </button>
  )
}

const toggleIn = <T,>(list: T[], value: T): T[] =>
  list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value]

export function TimelineFiltersPanel({
  filters,
  onChange,
  events,
  counts,
  shownCount,
  onJump,
  onClose,
}: TimelineFiltersPanelProps) {
  const [query, setQuery] = React.useState('')
  const [openCategories, setOpenCategories] = React.useState<Set<string>>(
    () => new Set(['protestant']),
  )
  const hidden = React.useMemo(
    () => new Set(filters.hiddenTraditions),
    [filters.hiddenTraditions],
  )
  const set = (patch: Partial<TimelineFilters>) =>
    onChange({ ...filters, ...patch })

  const setTraditions = (ids: TraditionId[], visible: boolean) => {
    const next = new Set(hidden)
    for (const id of ids) {
      if (visible) next.delete(id)
      else next.add(id)
    }
    set({ hiddenTraditions: [...next] })
  }
  const showOnly = (ids: TraditionId[]) =>
    set({
      hiddenTraditions: Object.keys(TRADITION_MAP).filter(
        (id) => !ids.includes(id as TraditionId),
      ) as TraditionId[],
    })

  const results = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (needle.length < 2) return []
    return events
      .filter((event) =>
        searchableText(event).some((text) => text.toLowerCase().includes(needle)),
      )
      .sort((a, b) => a.year - b.year)
      .slice(0, 8)
  }, [events, query])

  const active = activeFilterCount(filters)
  const activePreset = FILTER_PRESETS.find((preset) => {
    const applied = preset.apply(filters)
    return (
      [...applied.hiddenTraditions].sort().join() ===
        [...filters.hiddenTraditions].sort().join() &&
      [...applied.hiddenKinds].sort().join() ===
        [...filters.hiddenKinds].sort().join() &&
      [...applied.hiddenEras].sort().join() ===
        [...filters.hiddenEras].sort().join()
    )
  })

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
        <h2 className="font-serif text-lg">Filters</h2>
        <span className="text-xs text-muted-foreground tabular-nums">
          {shownCount} shown
        </span>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="xs"
            disabled={active === 0}
            onClick={() => onChange(DEFAULT_FILTERS)}
            title="Reset every filter and display option"
          >
            <RotateCcwIcon data-icon="inline-start" />
            Reset
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Close filters"
            onClick={onClose}
          >
            <XIcon />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <Section title="Find an event or person">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Title, year or person…"
              className="pl-8"
              aria-label="Search events"
            />
          </div>
          {query.trim().length >= 2 && (
            <ul className="mt-2 flex flex-col">
              {results.length === 0 && (
                <li className="px-2 py-1.5 text-xs text-muted-foreground">
                  No matching events.
                </li>
              )}
              {results.map((event) => (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => onJump(event)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                  >
                    {event.kind === 'person' ? (
                      <PersonGlyph
                        className="size-3 shrink-0"
                        style={{ color: traditionColor(event.tradition) }}
                      />
                    ) : (
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor: traditionColor(event.tradition),
                        }}
                      />
                    )}
                    <span className="min-w-0 flex-1 truncate">
                      {event.title}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                      <DateText value={event.dateLabel} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Quick views">
          <div className="grid grid-cols-2 gap-1.5">
            {FILTER_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                title={preset.description}
                aria-pressed={activePreset?.id === preset.id}
                onClick={() => onChange(preset.apply(filters))}
                className={cn(
                  'rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                  activePreset?.id === preset.id
                    ? 'border-primary/50 bg-primary/15'
                    : 'border-border hover:bg-muted',
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </Section>

        <Section
          title="Denominations"
          action={
            hidden.size > 0 && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => set({ hiddenTraditions: [] })}
              >
                Show all
              </Button>
            )
          }
        >
          <div className="flex flex-col gap-0.5">
            {TRADITION_CATEGORIES.map((category) => {
              const visibleCount = category.traditions.filter(
                (id) => !hidden.has(id),
              ).length
              const state: CheckState =
                visibleCount === 0
                  ? 'off'
                  : visibleCount === category.traditions.length
                    ? 'on'
                    : 'mixed'
              const isSingle = category.traditions.length === 1
              const isOpen = !isSingle && openCategories.has(category.id)
              const total = category.traditions.reduce(
                (sum, id) => sum + (counts[id] ?? 0),
                0,
              )

              return (
                <div key={category.id}>
                  <div className="group/row flex items-center rounded-md hover:bg-accent/60">
                    <button
                      type="button"
                      aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${category.label}`}
                      aria-expanded={isOpen}
                      disabled={isSingle}
                      onClick={() =>
                        setOpenCategories((current) => {
                          const next = new Set(current)
                          if (next.has(category.id)) next.delete(category.id)
                          else next.add(category.id)
                          return next
                        })
                      }
                      className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground disabled:invisible"
                    >
                      <ChevronRightIcon
                        className={cn(
                          'size-3.5 transition-transform',
                          isOpen && 'rotate-90',
                        )}
                      />
                    </button>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={
                        state === 'mixed' ? 'mixed' : state === 'on'
                      }
                      title={category.description}
                      onClick={() =>
                        setTraditions(category.traditions, state !== 'on')
                      }
                      className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pr-1 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-md"
                    >
                      <TriCheck state={state} />
                      <span className="truncate">{category.label}</span>
                      <span className="ml-auto text-[10px] font-normal text-muted-foreground tabular-nums">
                        {total}
                      </span>
                    </button>
                    <OnlyButton
                      label={category.label}
                      onClick={() => showOnly(category.traditions)}
                    />
                  </div>

                  {isOpen && (
                    <div className="ml-7 flex flex-col border-l border-border pl-1.5">
                      {subdivide(category.traditions).map((section) => {
                        const row = (id: TraditionId) => (
                          <TraditionRow
                            key={id}
                            id={id}
                            visible={!hidden.has(id)}
                            count={counts[id] ?? 0}
                            onToggle={(visible) => setTraditions([id], visible)}
                            onOnly={() => showOnly([id])}
                          />
                        )
                        if (!section.group) return section.traditions.map(row)

                        // A sub-group (e.g. Magisterial Reformation) toggles
                        // all of its denominations at once.
                        const shown = section.traditions.filter(
                          (id) => !hidden.has(id),
                        ).length
                        const subState: CheckState =
                          shown === 0
                            ? 'off'
                            : shown === section.traditions.length
                              ? 'on'
                              : 'mixed'
                        return (
                          <div
                            key={section.group.id}
                            className="mt-1 first:mt-0"
                          >
                            <div className="group/row flex items-center rounded-md hover:bg-accent/60">
                              <button
                                type="button"
                                role="checkbox"
                                aria-checked={
                                  subState === 'mixed'
                                    ? 'mixed'
                                    : subState === 'on'
                                }
                                title={section.group.blurb}
                                onClick={() =>
                                  setTraditions(
                                    section.traditions,
                                    subState !== 'on',
                                  )
                                }
                                className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                              >
                                <TriCheck state={subState} />
                                <span className="label-caps truncate text-[10px] text-muted-foreground">
                                  {section.group.name}
                                </span>
                              </button>
                              <OnlyButton
                                label={section.group.name}
                                onClick={() => showOnly(section.traditions)}
                              />
                            </div>
                            <div className="ml-3.5 flex flex-col border-l border-border/60 pl-1.5">
                              {section.traditions.map(row)}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Section>

        <Section title="Event types">
          <div className="flex flex-wrap gap-1.5">
            {EVENT_KINDS.map((kind) => (
              <Chip
                key={kind.id}
                active={!filters.hiddenKinds.includes(kind.id)}
                onClick={() =>
                  set({ hiddenKinds: toggleIn(filters.hiddenKinds, kind.id) })
                }
              >
                {kind.label}
              </Chip>
            ))}
          </div>
        </Section>

        <Section title="People">
          <div className="flex flex-col gap-3">
            <Toggle
              label="Show people"
              hint="Church Fathers, reformers, rulers and other key figures, drawn as portrait busts."
              checked={filters.showPeople}
              onChange={(showPeople) => set({ showPeople })}
            />
            <Toggle
              label="Group people"
              hint="People in a named group, such as the Early Church Fathers, are drawn as one node you can open. Anyone who lived through a major event stays on their own."
              checked={filters.groupPeople}
              onChange={(groupPeople) => set({ groupPeople })}
            />
            <div
              className={cn(
                'flex flex-wrap gap-1.5 transition-opacity',
                !filters.showPeople && 'pointer-events-none opacity-50',
              )}
              aria-disabled={!filters.showPeople || undefined}
            >
              {PERSON_TYPES.map((type) => (
                <Chip
                  key={type.id}
                  title={type.description}
                  active={!filters.hiddenPersonTypes.includes(type.id)}
                  onClick={() =>
                    set({
                      hiddenPersonTypes: toggleIn(filters.hiddenPersonTypes, type.id),
                    })
                  }
                >
                  {type.label}
                </Chip>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Eras">
          <div className="flex flex-wrap gap-1.5">
            {ERAS.map((era) => (
              <Chip
                key={era.label}
                active={!filters.hiddenEras.includes(era.label)}
                title={era.dates}
                onClick={() =>
                  set({ hiddenEras: toggleIn(filters.hiddenEras, era.label) })
                }
              >
                {era.label}
              </Chip>
            ))}
          </div>
        </Section>

        <AdvancedSettings filters={filters} set={set} />
      </div>
    </div>
  )
}

/** Settings that live under "Advanced settings" (display and zoom). */
const ADVANCED_KEYS = [
  'showLaneLabels',
  'focusLineage',
  'compactLabels',
  'hideEmptyLanes',
  'showOrigins',
  'showPresentDay',
  'enlargeOrigins',
  'enlargeKinds',
  'enlargeMode',
  'enlargeStrength',
] as const satisfies readonly (keyof TimelineFilters)[]

const ADVANCED_OPEN_KEY = 'timeline-advanced-settings-open'

/**
 * Display and zoom options, grouped under one collapsible header so the
 * panel opens on the filters people use most. Collapsed by default; the open
 * state is remembered. The header counts settings changed from the defaults,
 * so a customised view is never hidden without a hint.
 */
function AdvancedSettings({
  filters,
  set,
}: {
  filters: TimelineFilters
  set: (patch: Partial<TimelineFilters>) => void
}) {
  const contentId = React.useId()
  const [open, setOpen] = React.useState(false)
  React.useEffect(() => {
    try {
      if (window.localStorage.getItem(ADVANCED_OPEN_KEY) === '1') setOpen(true)
    } catch {
      // Storage can be blocked; stay collapsed.
    }
  }, [])
  const toggle = () => {
    setOpen((current) => {
      const next = !current
      try {
        window.localStorage.setItem(ADVANCED_OPEN_KEY, next ? '1' : '0')
      } catch {
        // Not remembered in private windows; still toggles.
      }
      return next
    })
  }
  const changed = ADVANCED_KEYS.filter(
    (key) => JSON.stringify(filters[key]) !== JSON.stringify(DEFAULT_FILTERS[key]),
  ).length

  return (
    <section className="border-b border-border last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={toggle}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <SlidersHorizontalIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="label-caps text-[10px] text-muted-foreground">Advanced settings</span>
        {changed > 0 && (
          <span className="rounded-full bg-primary/15 px-1.5 py-px text-[10px] text-foreground tabular-nums">
            {changed} changed
          </span>
        )}
        <ChevronRightIcon
          className={cn(
            'ml-auto size-3.5 shrink-0 text-muted-foreground transition-transform duration-200',
            open && 'rotate-90',
          )}
          aria-hidden="true"
        />
      </button>

      {/* grid-rows 0fr -> 1fr animates to the content's natural height. */}
      <div
        id={contentId}
        inert={!open}
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-3 px-4 pb-4">
            <SubSection title="Display">
              <div className="flex flex-col gap-3">
                <Toggle
                  label="Lane labels"
                  hint="The panel of branch names on the left. Hide it for more room."
                  checked={filters.showLaneLabels}
                  onChange={(showLaneLabels) => set({ showLaneLabels })}
                />
                <Toggle
                  label="Focus on selected lineage"
                  hint="Fade everything outside the selected event's ancestors and descendants."
                  checked={filters.focusLineage}
                  onChange={(focusLineage) => set({ focusLineage })}
                />
                <Toggle
                  label="Compact labels"
                  hint="Hide event-type captions and shorten long titles."
                  checked={filters.compactLabels}
                  onChange={(compactLabels) => set({ compactLabels })}
                />
                <Toggle
                  label="Hide empty lanes"
                  hint="Collapse branches with nothing left after filtering."
                  checked={filters.hideEmptyLanes}
                  onChange={(hideEmptyLanes) => set({ hideEmptyLanes })}
                />
                <Toggle
                  label="“Began here” flags"
                  hint="Mark when and where each branch started."
                  checked={filters.showOrigins}
                  onChange={(showOrigins) => set({ showOrigins })}
                />
                <Toggle
                  label="Present-day summaries"
                  hint="The “today” node at the end of each living branch."
                  checked={filters.showPresentDay}
                  onChange={(showPresentDay) => set({ showPresentDay })}
                />
              </div>
            </SubSection>

            <ZoomReadabilitySection filters={filters} set={set} />
          </div>
        </div>
      </div>
    </section>
  )
}

/** A titled card inside "Advanced settings": quieter than a top-level Section. */
function SubSection({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
      <div className="mb-2.5 flex min-h-5 items-center justify-between gap-2">
        <h4 className="text-xs font-medium text-foreground/90">{title}</h4>
        {action}
      </div>
      {children}
    </div>
  )
}

/**
 * Which nodes grow back as you zoom out, so the overview stays readable.
 * Applies only below 100% zoom; see zoomOutScale for the curve.
 */
function ZoomReadabilitySection({
  filters,
  set,
}: {
  filters: TimelineFilters
  set: (patch: Partial<TimelineFilters>) => void
}) {
  const strengthId = React.useId()
  const anyEnlarged = filters.enlargeOrigins || filters.enlargeKinds.length > 0
  const allKinds = ENLARGE_KINDS.every((kind) => filters.enlargeKinds.includes(kind.id))
  const atMinZoom = zoomOutScale(MIN_ZOOM, filters.enlargeStrength)

  return (
    <SubSection
      title="Readability when zoomed out"
      action={
        anyEnlarged ? (
          <button
            type="button"
            onClick={() => set({ enlargeOrigins: false, enlargeKinds: [] })}
            className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            Turn off
          </button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-3">
        <Toggle
          label="Enlarge “Began here” nodes"
          hint="Founding events grow as you zoom out, flags included."
          checked={filters.enlargeOrigins}
          onChange={(enlargeOrigins) => set({ enlargeOrigins })}
        />

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="text-sm leading-tight">Enlarge by type</p>
            <button
              type="button"
              onClick={() =>
                set({ enlargeKinds: allKinds ? [] : ENLARGE_KINDS.map((kind) => kind.id) })
              }
              className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {allKinds ? 'None' : 'All'}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ENLARGE_KINDS.map((kind) => (
              <Chip
                key={kind.id}
                strikeInactive={false}
                active={filters.enlargeKinds.includes(kind.id)}
                onClick={() => set({ enlargeKinds: toggleIn(filters.enlargeKinds, kind.id) })}
              >
                {kind.label}
              </Chip>
            ))}
          </div>
        </div>

        <div className={cn('flex flex-col gap-3 transition-opacity', !anyEnlarged && 'opacity-50')}>
          <div>
            <p className="mb-1.5 text-sm leading-tight">Grow</p>
            <div className="flex gap-1.5" role="radiogroup" aria-label="What grows">
              {([
                ['node', 'Whole node'],
                ['text', 'Text only'],
              ] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={filters.enlargeMode === mode}
                  disabled={!anyEnlarged}
                  onClick={() => set({ enlargeMode: mode })}
                  className={cn(
                    'flex-1 rounded-md border px-2.5 py-1 text-xs transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                    filters.enlargeMode === mode
                      ? 'border-primary/50 bg-primary/15 text-foreground'
                      : 'border-border text-muted-foreground enabled:hover:bg-muted',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <label htmlFor={strengthId} className="text-sm leading-tight">
                Strength
              </label>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {Math.round(filters.enlargeStrength * 100)}%
              </span>
            </div>
            <input
              id={strengthId}
              type="range"
              min={0}
              max={100}
              step={5}
              disabled={!anyEnlarged}
              value={Math.round(filters.enlargeStrength * 100)}
              onChange={(event) => set({ enlargeStrength: Number(event.target.value) / 100 })}
              className="w-full accent-primary disabled:cursor-not-allowed"
            />
            <p className="text-[11px] leading-snug text-muted-foreground">
              At the farthest zoom ({Math.round(MIN_ZOOM * 100)}%), enlarged nodes are{' '}
              {atMinZoom.toFixed(1)}× their normal size. 100% keeps them as large as at full zoom.
            </p>
          </div>
        </div>
      </div>
    </SubSection>
  )
}

/**
 * Splits a category's traditions into runs that share a nested lane group
 * (e.g. Protestant → Magisterial Reformation), matching the timeline's
 * headers. Top-level groups are the category itself, so they don't repeat.
 */
function subdivide(
  ids: TraditionId[],
): { group: LaneGroup | null; traditions: TraditionId[] }[] {
  const sections: { group: LaneGroup | null; traditions: TraditionId[] }[] = []
  for (const id of ids) {
    const laneGroup = TRADITION_MAP[id].laneGroup
    const group = laneGroup?.parent ? laneGroup : null
    const last = sections.at(-1)
    if (last && last.group?.id === group?.id) last.traditions.push(id)
    else sections.push({ group, traditions: [id] })
  }
  return sections
}

function TraditionRow({
  id,
  visible,
  count,
  onToggle,
  onOnly,
}: {
  id: TraditionId
  visible: boolean
  count: number
  onToggle: (visible: boolean) => void
  onOnly: () => void
}) {
  const tradition = TRADITION_MAP[id]
  return (
    <div className="group/row flex items-center rounded-md hover:bg-accent/60">
      <button
        type="button"
        role="checkbox"
        aria-checked={visible}
        title={tradition.blurb}
        onClick={() => onToggle(!visible)}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 text-left text-[13px] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <TriCheck state={visible ? 'on' : 'off'} color={traditionColor(id)} />
        <span className="flex min-w-0 flex-col">
          <span className={cn('truncate', !visible && 'text-muted-foreground')}>
            {tradition.name}
          </span>
          {tradition.origins[0] && (
            <span className="truncate text-[10px] text-muted-foreground">
              Began <DateText value={tradition.origins[0].dateLabel} /> ·{' '}
              {tradition.origins[0].place}
            </span>
          )}
        </span>
        <span className="ml-auto pl-1 text-[10px] text-muted-foreground tabular-nums">
          {count}
        </span>
      </button>
      <OnlyButton label={tradition.name} onClick={onOnly} />
    </div>
  )
}

function OnlyButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Show only ${label}`}
      className="mr-1 shrink-0 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover/row:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      only
    </button>
  )
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  const id = React.useId()
  return (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="text-sm leading-tight">
          {label}
        </label>
        <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p>
      </div>
      <Switch
        id={id}
        size="sm"
        className="mt-0.5"
        // Always a boolean, so the switch never flips from uncontrolled to
        // controlled (e.g. a hot reload keeping state from before a new
        // setting existed).
        checked={checked === true}
        onCheckedChange={(value) => onChange(value)}
      />
    </div>
  )
}
