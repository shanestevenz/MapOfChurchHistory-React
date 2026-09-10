import type { Metadata } from 'next'
import { AdminSignIn } from '@/components/admin-sign-in'

export const metadata: Metadata = {
  title: 'Curator sign in | Map of Church History',
  robots: { index: false, follow: false, nocache: true },
}

export default function AdminPage() {
  return <AdminSignIn />
}
