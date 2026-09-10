'use client'

import * as React from 'react'
import {
  DownloadIcon,
  InboxIcon,
  Layers3Icon,
  LogOutIcon,
  PlusIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { useTimeline } from '@/components/timeline-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DATA_VERSION } from '@/lib/timeline-data'

export function AdminBar({
  onAddEvent,
  onReviewSuggestions,
  onManageGroups,
}: {
  onAddEvent: () => void
  onReviewSuggestions: () => void
  onManageGroups: () => void
}) {
  const {
    events,
    isAdmin,
    hasLocalEdits,
    pendingCount,
    signOut,
    resetToSeed,
  } = useTimeline()

  const exportJson = () => {
    const blob = new Blob(
      [JSON.stringify({ version: DATA_VERSION, events }, null, 2)],
      { type: 'application/json' },
    )
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'church-timeline.json'
    anchor.click()
    URL.revokeObjectURL(url)
    toast.success('Timeline exported as JSON.')
  }

  if (!isAdmin) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="outline" className="gap-1.5 border-primary/40 text-primary">
        <ShieldCheckIcon className="size-3" />
        Editor mode
      </Badge>
      <Button size="sm" onClick={onAddEvent}>
        <PlusIcon data-icon="inline-start" />
        Add event
      </Button>
      <Button variant="outline" size="sm" onClick={onManageGroups}>
        <Layers3Icon data-icon="inline-start" />
        Detail groups
      </Button>
      <Button variant="outline" size="sm" onClick={onReviewSuggestions}>
        <InboxIcon data-icon="inline-start" />
        Review
        {pendingCount > 0 && (
          <Badge className="ml-1.5">{pendingCount}</Badge>
        )}
      </Button>
      <Button variant="outline" size="sm" onClick={exportJson}>
        <DownloadIcon data-icon="inline-start" />
        Export
      </Button>
      {hasLocalEdits && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            resetToSeed()
            toast.success('Timeline restored to the published version.')
          }}
        >
          <RotateCcwIcon data-icon="inline-start" />
          Reset
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={signOut}>
        <LogOutIcon data-icon="inline-start" />
        Exit
      </Button>
    </div>
  )
}
