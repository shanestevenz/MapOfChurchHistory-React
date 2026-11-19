import { GavelIcon, MapPinIcon, UserIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { traditionColor } from '@/lib/timeline-layout'
import { churchesOf, churchTagLabel, PERSON_TYPE_LABEL } from '@/lib/timeline-people'
import type { TimelineEvent } from '@/lib/timeline-types'
import { cn } from '@/lib/utils'

/**
 * A person's tags: the churches they were part of (e.g. "Catholic",
 * "Anabaptist"), where they lived, and what kind of figure they were. How
 * they moved between churches belongs in their description, not here.
 */
export function PersonTags({
  event,
  showType = true,
}: {
  event: TimelineEvent
  showType?: boolean
}) {
  if (!event.person) return null
  return (
    <>
      {churchesOf(event).map((church) => (
        <Badge key={church} variant="secondary" className="gap-1.5">
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: traditionColor(church) }}
          />
          {churchTagLabel(event, church)}
        </Badge>
      ))}
      {event.person.region && (
        <Badge variant="outline" className="gap-1">
          <MapPinIcon />
          {event.person.region}
        </Badge>
      )}
      {showType && (
        <Badge variant="outline">
          <UserIcon />
          {PERSON_TYPE_LABEL[event.person.type]}
        </Badge>
      )}
    </>
  )
}

/** How a person was persecuted, condemned, jailed or killed: its own callout. */
export function PersonPersecution({
  event,
  className,
}: {
  event: TimelineEvent
  className?: string
}) {
  const text = event.person?.persecution
  if (!text) return null
  return (
    <p
      className={cn(
        'flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[13px] leading-snug text-destructive',
        className,
      )}
    >
      <GavelIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>
        <span className="sr-only">Persecution: </span>
        {text}
      </span>
    </p>
  )
}
