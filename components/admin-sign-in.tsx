'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, KeyRoundIcon } from 'lucide-react'
import {
  TurnstileWidget,
  type TurnstileWidgetHandle,
} from '@/components/turnstile-widget'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth/client'

type Stage = 'loading' | 'password'

async function fetchIsAdmin() {
  const response = await fetch('/api/admin', { cache: 'no-store' })
  if (!response.ok) return false
  const result = await response.json().catch(() => null) as { isAdmin?: boolean } | null
  return Boolean(result?.isAdmin)
}

export function AdminSignIn() {
  const router = useRouter()
  const captchaRef = React.useRef<TurnstileWidgetHandle>(null)
  const [stage, setStage] = React.useState<Stage>('loading')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [captchaToken, setCaptchaToken] = React.useState('')
  const [error, setError] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const captchaMisconfigured = process.env.NODE_ENV === 'production' && !siteKey

  const finish = React.useCallback(() => {
    setPassword('')
    router.replace('/')
    router.refresh()
  }, [router])

  React.useEffect(() => {
    let active = true
    fetchIsAdmin()
      .then((isAdmin) => {
        if (!active) return
        if (isAdmin) finish()
        else setStage('password')
      })
      .catch(() => active && setStage('password'))
    return () => { active = false }
  }, [finish])

  const signIn = async () => {
    if (!email || !password || (siteKey && !captchaToken) || captchaMisconfigured) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, turnstileToken: captchaToken }),
      })
      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: string } | null
        throw new Error(result?.error ?? 'Sign-in could not be completed. Check your credentials and try again.')
      }
      if (!(await fetchIsAdmin())) {
        await authClient.signOut()
        throw new Error('This account is not a curator.')
      }
      finish()
    } catch (caught) {
      captchaRef.current?.reset()
      setCaptchaToken('')
      setError(caught instanceof Error && caught.message
        ? caught.message
        : 'Sign-in could not be completed. Check your credentials and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary">
            <KeyRoundIcon className="size-5" />
          </div>
          <CardTitle className="font-serif text-2xl">
            {stage === 'password' ? 'Curator sign in' : 'Checking your session…'}
          </CardTitle>
          {stage === 'password' && (
            <CardDescription>This area is restricted to approved timeline curators.</CardDescription>
          )}
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
          {stage === 'password' && (
            <>
              <Field data-invalid={Boolean(error) || undefined}>
                <FieldLabel htmlFor="admin-email">Email</FieldLabel>
                <Input
                  id="admin-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => { setEmail(event.target.value); setError('') }}
                />
              </Field>
              <Field data-invalid={Boolean(error) || undefined}>
                <FieldLabel htmlFor="admin-password">Password</FieldLabel>
                <Input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => { setPassword(event.target.value); setError('') }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.nativeEvent.isComposing) void signIn()
                  }}
                />
                {error && <FieldDescription className="text-destructive" role="alert">{error}</FieldDescription>}
              </Field>
              <TurnstileWidget ref={captchaRef} action="admin-signin" onTokenChange={setCaptchaToken} />
              {captchaMisconfigured && (
                <p className="text-sm text-destructive" role="alert">
                  Admin sign-in is unavailable because Turnstile is not configured.
                </p>
              )}
              <Button
                onClick={() => void signIn()}
                disabled={busy || !email || !password || Boolean(siteKey && !captchaToken) || captchaMisconfigured}
              >
                {busy ? 'Signing in…' : 'Sign in'}
              </Button>
              <Button variant="ghost" onClick={() => router.replace('/')}>
                <ArrowLeftIcon data-icon="inline-start" />
                Return to timeline
              </Button>
              <Link href="/privacy" className="text-center text-xs text-muted-foreground underline underline-offset-2">
                Privacy notice
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
