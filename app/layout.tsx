import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { EB_Garamond, Inter } from 'next/font/google'
import { connection } from 'next/server'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const garamond = EB_Garamond({
  subsets: ['latin'],
  variable: '--font-garamond',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Church History Visualized — An Illustrated Timeline of Church History',
  description:
    'A visual, interactive timeline of two thousand years of church history: councils, schisms, reformations and revivals, mapped as a branching tree.',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#14181f',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  await connection()
  return (
    <html
      lang="en"
      className={`dark bg-background ${inter.variable} ${garamond.variable}`}
    >
      <body className="h-dvh overflow-hidden antialiased">
        {children}
        <Toaster position="bottom-center" />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
