import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Cinzel, EB_Garamond, IM_Fell_English, Inter } from 'next/font/google'
import { headers } from 'next/headers'
import { connection } from 'next/server'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { DEFAULT_SKIN, THEME_INIT_SCRIPT } from '@/lib/theme'
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

// Only the Manuscript and Stained Glass skins use these, so they aren't
// preloaded: the browser fetches them when a skin first asks for them.
const cinzel = Cinzel({
  subsets: ['latin'],
  variable: '--font-cinzel',
  display: 'swap',
  preload: false,
})

const fell = IM_Fell_English({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-fell',
  display: 'swap',
  preload: false,
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
  colorScheme: 'dark light',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  await connection()
  const nonce = (await headers()).get('x-nonce') ?? undefined
  return (
    // The head script sets the saved skin and mode before first paint, so
    // these server defaults may differ from what the browser shows.
    <html
      lang="en"
      data-skin={DEFAULT_SKIN}
      className={`dark bg-background ${inter.variable} ${garamond.variable} ${cinzel.variable} ${fell.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="h-dvh overflow-hidden antialiased" suppressHydrationWarning>
        <ThemeProvider>
          {children}
          <Toaster position="bottom-center" />
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
