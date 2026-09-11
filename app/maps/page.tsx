import type { Metadata } from 'next'
import { HistoricalMap } from '@/components/historical-map'

export const metadata: Metadata = {
  title: 'Historical Atlas | Church History Visualized',
  description: 'Explore the changing political geography, cities, council sites, and waterways of church history.',
}

export default function MapsPage() {
  return <HistoricalMap />
}
