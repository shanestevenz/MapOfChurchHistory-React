'use client'

import { MinusIcon, PlusIcon, RotateCcwIcon } from 'lucide-react'
import { MAX_ZOOM, MIN_ZOOM } from '@/components/timeline-graph'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface ZoomControlProps {
  zoom: number
  onZoomChange: (zoom: number) => void
}

export function ZoomControl({ zoom, onZoomChange }: ZoomControlProps) {
  const step = (factor: number) =>
    onZoomChange(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor)))

  const isDefault = Math.abs(zoom - 1) < 0.001

  return (
    <div className="absolute right-5 bottom-5 z-20 flex flex-row items-center gap-1 rounded-lg border border-border bg-card/90 p-1 shadow-lg backdrop-blur sm:right-7 sm:bottom-7">
      {/* Keep this mounted so both its entrance and exit can animate. */}
      <div
        aria-hidden={isDefault}
        className={cn(
          'flex items-center gap-1 overflow-hidden transition-[width,opacity,transform] duration-200 ease-out motion-reduce:transition-none',
          isDefault
            ? 'pointer-events-none w-0 -translate-x-1 opacity-0'
            : 'w-[37px] translate-x-0 opacity-100',
        )}
      >
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Reset zoom to 100%"
          title="Reset zoom"
          tabIndex={isDefault ? -1 : 0}
          onClick={() => onZoomChange(1)}
        >
          <RotateCcwIcon />
        </Button>
        <Separator orientation="vertical" className="h-6 self-center!" />
      </div>

      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Zoom in"
        disabled={zoom >= MAX_ZOOM - 0.001}
        onClick={() => step(1.25)}
      >
        <PlusIcon />
      </Button>

      <span className="label-caps w-11 text-center text-[10px] tabular-nums text-muted-foreground">
        {Math.round(zoom * 100)}%
      </span>

      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Zoom out"
        disabled={zoom <= MIN_ZOOM + 0.001}
        onClick={() => step(1 / 1.25)}
      >
        <MinusIcon />
      </Button>

    </div>
  )
}
