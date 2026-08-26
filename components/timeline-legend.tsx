'use client'

import * as React from 'react'
import { CheckIcon, GitBranchIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { TRADITIONS } from '@/lib/timeline-data'
import { traditionColor } from '@/lib/timeline-layout'
import type { TraditionId } from '@/lib/timeline-types'
import { cn } from '@/lib/utils'

interface TimelineLegendProps {
  hidden: Set<TraditionId>
  counts: Record<string, number>
  onToggle: (id: TraditionId) => void
  onShowAll: () => void
}

export function TimelineLegend({
  hidden,
  counts,
  onToggle,
  onShowAll,
}: TimelineLegendProps) {
  const traditions = React.useMemo(
    () => [...TRADITIONS].sort((a, b) => a.lane - b.lane),
    [],
  )
  const shown = traditions.length - hidden.size

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="sm">
            <GitBranchIcon data-icon="inline-start" />
            Denominations 
            <span className="ml-1 text-xs text-muted-foreground tabular-nums">
              {shown}/{traditions.length}
            </span>
          </Button>
        }
      />
      <PopoverContent align="end" className="w-72 p-2">
        <div className="flex items-center justify-between px-2 pt-1 pb-2">
          <span className="label-caps text-[10px] text-muted-foreground">
            Visible Denominations
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            disabled={hidden.size === 0}
            onClick={onShowAll}
          >
            Show all
          </Button>
        </div>
        <div className="flex flex-col">
          {traditions.map((tradition) => {
            const isHidden = hidden.has(tradition.id)
            return (
              <button
                key={tradition.id}
                type="button"
                aria-pressed={!isHidden}
                title={tradition.blurb}
                onClick={() => onToggle(tradition.id)}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent',
                  isHidden && 'opacity-45',
                )}
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: traditionColor(tradition.id) }}
                />
                <span className="flex-1 truncate text-foreground/90">
                  {tradition.name}
                </span>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {counts[tradition.id] ?? 0}
                </span>
                <CheckIcon
                  className={cn(
                    'size-3.5 shrink-0 text-primary',
                    isHidden && 'invisible',
                  )}
                />
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
