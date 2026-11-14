'use client'

import * as React from 'react'
import {
  CheckIcon,
  ChevronRightIcon,
  MinusIcon,
  RotateCcwIcon,
  SearchIcon,
  XIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { TRADITION_MAP } from '@/lib/timeline-data'
import {
  activeFilterCount,
  DEFAULT_FILTERS,
  EVENT_KINDS,
  FILTER_PRESETS,
  TRADITION_CATEGORIES,
  type TimelineFilters,
} from '@/lib/timeline-filters'
import { ERAS, traditionColor } from '@/lib/timeline-layout'
import type { TimelineEvent, TraditionId } from '@/lib/timeline-types'
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
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  title?: string
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
          : 'border-border text-muted-foreground line-through decoration-muted-foreground/50 hover:bg-muted',
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
        [event.title, event.dateLabel, ...(event.keyFigures ?? [])].some(
          (text) => text.toLowerCase().includes(needle),
        ),
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
        <Section title="Find an event">
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
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: traditionColor(event.tradition),
                      }}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {event.title}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                      {event.dateLabel}
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
                      {category.traditions.map((id) => {
                        const tradition = TRADITION_MAP[id]
                        const isVisible = !hidden.has(id)
                        return (
                          <div
                            key={id}
                            className="group/row flex items-center rounded-md hover:bg-accent/60"
                          >
                            <button
                              type="button"
                              role="checkbox"
                              aria-checked={isVisible}
                              title={tradition.blurb}
                              onClick={() => setTraditions([id], !isVisible)}
                              className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 text-left text-[13px] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                            >
                              <TriCheck
                                state={isVisible ? 'on' : 'off'}
                                color={traditionColor(id)}
                              />
                              <span className="flex min-w-0 flex-col">
                                <span
                                  className={cn(
                                    'truncate',
                                    !isVisible && 'text-muted-foreground',
                                  )}
                                >
                                  {tradition.name}
                                </span>
                                {tradition.origins[0] && (
                                  <span className="truncate text-[10px] text-muted-foreground">
                                    Began {tradition.origins[0].dateLabel} ·{' '}
                                    {tradition.origins[0].place}
                                  </span>
                                )}
                              </span>
                              <span className="ml-auto pl-1 text-[10px] text-muted-foreground tabular-nums">
                                {counts[id] ?? 0}
                              </span>
                            </button>
                            <OnlyButton
                              label={tradition.name}
                              onClick={() => showOnly([id])}
                            />
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

        <Section title="Eras">
          <div className="flex flex-wrap gap-1.5">
            {ERAS.map((era) => (
              <Chip
                key={era.label}
                active={!filters.hiddenEras.includes(era.label)}
                title={
                  era.to >= 3000
                    ? `From ${era.from}`
                    : `${Math.max(era.from, 1)}–${era.to}`
                }
                onClick={() =>
                  set({ hiddenEras: toggleIn(filters.hiddenEras, era.label) })
                }
              >
                {era.label}
              </Chip>
            ))}
          </div>
        </Section>

        <Section title="Display">
          <div className="flex flex-col gap-3">
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
        </Section>
      </div>
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
        checked={checked}
        onCheckedChange={(value) => onChange(value)}
      />
    </div>
  )
}
