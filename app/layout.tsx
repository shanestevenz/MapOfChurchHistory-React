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
  title: 'EcclesioGraph — A Timeline of Church History',
  applicationName: 'EcclesioGraph',
  openGraph: {
    siteName: 'EcclesioGraph',
    title: 'EcclesioGraph — A Timeline of Church History',
    description:
      'A visual, interactive timeline of two thousand years of church history: councils, schisms, reformations and revivals, mapped as a branching tree.',
    type: 'website',
  },
  description:
    'A visual, interactive timeline of two thousand years of church history: councils, schisms, reformations and revivals, mapped as a branching tree.',
  icons: {
    icon: [
      {
        url: '/favicon-64.png',
        type: 'image/png',
        sizes: '64x64',
        media: '(prefers-color-scheme: light)',
      },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
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
      <body className="h-dvh overflow-hidden antialiased" suppressHydrationWarning>
        {children}
        <Toaster position="bottom-center" />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
