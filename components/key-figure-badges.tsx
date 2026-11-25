'use client'

import * as React from 'react'
import { PersonGlyph } from '@/components/person-node'
import { Badge } from '@/components/ui/badge'
import { traditionColor } from '@/lib/timeline-layout'
import { buildPersonIndex, nameKey } from '@/lib/timeline-people'
import type { TimelineEvent } from '@/lib/timeline-types'

/**
 * An event's key figures as tags. A name that matches a person on the
 * timeline (by title or alias) becomes a link to that person's node.
 */
export function KeyFigureBadges({
  figures,
  events,
  onOpenPerson,
}: {
  figures: string[]
  events: TimelineEvent[]
  onOpenPerson: (person: TimelineEvent) => void
}) {
  const index = React.useMemo(() => buildPersonIndex(events), [events])
  return (
    <>
      {figures.map((figure) => {
        const person = index.get(nameKey(figure))
        if (!person) {
          return (
            <Badge key={figure} variant="outline">
              {figure}
            </Badge>
          )
        }
        const color = traditionColor(person.tradition)
        return (
          <Badge
            key={figure}
            variant="outline"
            render={
              <button
                type="button"
                onClick={() => onOpenPerson(person)}
                title={`Open ${person.title} on the timeline`}
              />
            }
            className="cursor-pointer gap-1 hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            style={{ borderColor: `color-mix(in oklab, ${color} 55%, transparent)` }}
          >
            <PersonGlyph className="size-3" style={{ color }} />
            {figure}
          </Badge>
        )
      })}
    </>
  )
}
