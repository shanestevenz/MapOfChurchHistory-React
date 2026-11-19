'use client'

import * as React from 'react'
import { TriangleAlertIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

const SEEN_KEY = 'site-disclaimer-seen:v1'

/**
 * An "Early development" badge beside the site title. Its popover holds the
 * disclaimer, and opens by itself on a visitor's first visit so it is seen
 * at least once; after that it stays one click away.
 */
export function SiteDisclaimer() {
  const [open, setOpen] = React.useState(false)

  // After mount, so server and client markup match.
  React.useEffect(() => {
    try {
      if (window.localStorage.getItem(SEEN_KEY) === null) setOpen(true)
    } catch {
      // Storage blocked: leave it closed rather than open on every visit.
    }
  }, [])

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      try {
        window.localStorage.setItem(SEEN_KEY, '1')
      } catch {
        // Not remembering is harmless; it just reopens next visit.
      }
    }
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        className="label-caps inline-flex shrink-0 cursor-pointer items-center gap-1 self-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] whitespace-nowrap text-amber-700 transition-colors hover:bg-amber-500/20 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none dark:text-amber-300"
        aria-label="Early development: read the disclaimer"
      >
        <TriangleAlertIcon className="size-3" aria-hidden="true" />
        <span className="hidden sm:inline">Early development</span>
        <span className="sm:hidden">Beta</span>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={8} className="w-80 gap-3 p-4">
        <h2 className="font-serif text-lg leading-tight">
          This site is in early development
        </h2>
        <div className="flex flex-col gap-2 text-sm leading-relaxed text-muted-foreground">
          <p>
            The events, dates and descriptions on this map have not all been
            fact-checked yet. Please check anything important against reliable
            sources. We can&rsquo;t accept responsibility for errors or for how
            the information here is used.
          </p>
          <p>
            We aim to present every tradition as fairly and without bias as we
            can, but church history is often contested and messy. If something looks incorrect or incomplete, open the event
            and choose <span className="text-foreground">Suggest an edit</span>.
          </p>
        </div>
        <Button size="sm" className="self-end" onClick={() => onOpenChange(false)}>
          Got it
        </Button>
      </PopoverContent>
    </Popover>
  )
}
