import { TimelinePage } from '@/components/timeline-page'
import { TimelineProvider } from '@/components/timeline-provider'

export default function Page() {
  return (
    <TimelineProvider>
      <TimelinePage />
    </TimelineProvider>
  )
}
