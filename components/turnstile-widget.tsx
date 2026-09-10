'use client'

import * as React from 'react'
import Script from 'next/script'

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string
          action: string
          theme: 'dark' | 'light' | 'auto'
          callback: (token: string) => void
          'expired-callback': () => void
          'error-callback': () => void
        },
      ) => string
      remove: (widgetId: string) => void
      reset: (widgetId: string) => void
    }
  }
}

export interface TurnstileWidgetHandle {
  reset: () => void
}

export const TurnstileWidget = React.forwardRef<
  TurnstileWidgetHandle,
  {
    action: 'admin-signin' | 'suggestion'
    onTokenChange: (token: string) => void
  }
>(function TurnstileWidget({ action, onTokenChange }, forwardedRef) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const containerRef = React.useRef<HTMLDivElement>(null)
  const widgetIdRef = React.useRef<string | null>(null)
  const [scriptReady, setScriptReady] = React.useState(false)

  const render = React.useCallback(() => {
    if (!siteKey || !containerRef.current || !window.turnstile || widgetIdRef.current) return
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      action,
      theme: 'dark',
      callback: onTokenChange,
      'expired-callback': () => onTokenChange(''),
      'error-callback': () => onTokenChange(''),
    })
  }, [action, onTokenChange, siteKey])

  React.useEffect(() => {
    if (scriptReady || window.turnstile) render()
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [render, scriptReady])

  React.useImperativeHandle(forwardedRef, () => ({
    reset: () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current)
      }
      onTokenChange('')
    },
  }), [onTokenChange])

  if (!siteKey) return null

  return (
    <>
      <Script
        id="cloudflare-turnstile"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div ref={containerRef} aria-label="Security verification" />
    </>
  )
})
