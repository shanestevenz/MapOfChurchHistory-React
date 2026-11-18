'use client'

import * as React from 'react'
import {
  DEFAULT_MODE,
  DEFAULT_SKIN,
  isSkinId,
  isThemeMode,
  MODE_KEY,
  SKIN_KEY,
  type SkinId,
  type ThemeMode,
} from '@/lib/theme'

interface ThemeContextValue {
  mode: ThemeMode
  skin: SkinId
  /** The mode actually showing: "system" resolved to light or dark. */
  resolved: 'light' | 'dark'
  setMode: (mode: ThemeMode) => void
  setSkin: (skin: SkinId) => void
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

function resolve(mode: ThemeMode): 'light' | 'dark' {
  if (mode !== 'system') return mode
  return darkQuery().matches ? 'dark' : 'light'
}

function apply(skin: SkinId, resolved: 'light' | 'dark') {
  const root = document.documentElement
  root.setAttribute('data-skin', skin)
  root.classList.toggle('dark', resolved === 'dark')
  root.style.colorScheme = resolved
}

/** Swaps the theme with a short cross-fade where the browser supports it. */
function withTransition(change: () => void) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown }
  if (!reduced && doc.startViewTransition) doc.startViewTransition(change)
  else change()
}

function store(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Not remembering the theme is harmless.
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Matches the server render; the real values are read after mount (the
  // head script has already applied them to <html>, so nothing flashes).
  const [mode, setModeState] = React.useState<ThemeMode>(DEFAULT_MODE)
  const [skin, setSkinState] = React.useState<SkinId>(DEFAULT_SKIN)
  const [resolved, setResolved] = React.useState<'light' | 'dark'>('dark')

  React.useEffect(() => {
    let savedMode: string | null = null
    let savedSkin: string | null = null
    try {
      savedMode = window.localStorage.getItem(MODE_KEY)
      savedSkin = window.localStorage.getItem(SKIN_KEY)
    } catch {
      // Storage blocked: keep the defaults.
    }
    const nextMode = isThemeMode(savedMode) ? savedMode : DEFAULT_MODE
    const nextSkin = isSkinId(savedSkin) ? savedSkin : DEFAULT_SKIN
    setModeState(nextMode)
    setSkinState(nextSkin)
    setResolved(resolve(nextMode))
  }, [])

  // Follow the operating system while the mode is "system".
  React.useEffect(() => {
    if (mode !== 'system') return
    const query = darkQuery()
    const onChange = () => {
      const next = query.matches ? 'dark' : 'light'
      setResolved(next)
      apply(skin, next)
    }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [mode, skin])

  const setMode = React.useCallback((next: ThemeMode) => {
    const nextResolved = resolve(next)
    store(MODE_KEY, next)
    setModeState(next)
    setResolved(nextResolved)
    withTransition(() =>
      apply(
        (document.documentElement.getAttribute('data-skin') as SkinId) ?? DEFAULT_SKIN,
        nextResolved,
      ),
    )
  }, [])

  const setSkin = React.useCallback((next: SkinId) => {
    store(SKIN_KEY, next)
    setSkinState(next)
    withTransition(() =>
      apply(next, document.documentElement.classList.contains('dark') ? 'dark' : 'light'),
    )
  }, [])

  const value = React.useMemo(
    () => ({ mode, skin, resolved, setMode, setSkin }),
    [mode, skin, resolved, setMode, setSkin],
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const context = React.useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>')
  return context
}
