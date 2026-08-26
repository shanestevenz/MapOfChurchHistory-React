import { cn } from '@/lib/utils'
import { getIcon } from '@/lib/timeline-icons'
import type { EventIcon as EventIconValue } from '@/lib/timeline-types'

interface EventIconProps {
  icon: EventIconValue
  title: string
  className?: string
}

/** Renders either a built-in line icon or an admin-supplied picture. */
export function EventIcon({ icon, title, className }: EventIconProps) {
  if (icon.type === 'image') {
    return (
      <img
        src={icon.src || '/placeholder.svg'}
        alt={`${title} illustration`}
        className={cn('size-full rounded-full object-cover', className)}
      />
    )
  }

  const Glyph = getIcon(icon.name)
  return <Glyph className={cn('size-5', className)} aria-hidden="true" />
}
