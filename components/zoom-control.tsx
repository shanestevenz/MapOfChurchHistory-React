'use client'

import { MinusIcon, PlusIcon, RotateCcwIcon } from 'lucide-react'
import { MAX_ZOOM, MIN_ZOOM } from '@/components/timeline-graph'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

interface ZoomControlProps {
  zoom: number
  onZoomChange: (zoom: number) => void
}

export function ZoomControl({ zoom, onZoomChange }: ZoomControlProps) {
  const step = (factor: number) =>
    onZoomChange(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor)))

  const isDefault = Math.abs(zoom - 1) < 0.001

  return (
    <div className="absolute right-5 bottom-5 z-20 flex flex-col items-center gap-1 rounded-lg border border-border bg-card/90 p-1 shadow-lg backdrop-blur sm:right-7 sm:bottom-7">
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

      {/* Reset is only meaningful once the view has moved off 100%. */}
      {!isDefault && (
        <>
          <Separator className="w-6" />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Reset zoom to 100%"
            title="Reset zoom"
            onClick={() => onZoomChange(1)}
          >
            <RotateCcwIcon />
          </Button>
        </>
      )}
    </div>
  )
}
