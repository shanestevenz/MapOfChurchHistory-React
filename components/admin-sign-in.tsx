'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, KeyRoundIcon, ShieldCheckIcon } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import {
  TurnstileWidget,
  type TurnstileWidgetHandle,
} from '@/components/turnstile-widget'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth/client'

type Stage = 'loading' | 'password' | 'enroll' | 'challenge'

export function AdminSignIn() {
  const router = useRouter()
  const captchaRef = React.useRef<TurnstileWidgetHandle>(null)
  const [stage, setStage] = React.useState<Stage>('loading')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [code, setCode] = React.useState('')
  const [totpUri, setTotpUri] = React.useState('')
  const [secret, setSecret] = React.useState('')
  const [backupCodes, setBackupCodes] = React.useState<string[]>([])
  const [backupMode, setBackupMode] = React.useState(false)
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

  const startEnrollment = React.useCallback(async (passwordValue: string) => {
    const result = await authClient.twoFactor.enable({
      password: passwordValue,
      method: 'totp',
      issuer: 'Map of Church History',
    })
    if (result.error || !result.data || result.data.method !== 'totp') {
      throw result.error ?? new Error('TOTP enrollment failed')
    }
    setTotpUri(result.data.totpURI)
    try {
      setSecret(new URL(result.data.totpURI).searchParams.get('secret') ?? '')
    } catch {
      setSecret('')
    }
    setBackupCodes(result.data.backupCodes ?? [])
    setCode('')
    setStage('enroll')
  }, [])

  React.useEffect(() => {
    let active = true
    fetch('/api/admin', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) return null
        return await response.json() as { isAdmin?: boolean; twoFactorEnabled?: boolean }
      })
      .then((result) => {
        if (!active) return
        if (result?.isAdmin && result.twoFactorEnabled) finish()
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
      const result = await response.json().catch(() => null) as {
        twoFactorRedirect?: boolean
        error?: string
      } | null
      if (!response.ok) throw new Error(result?.error ?? 'Sign-in failed')
      if (result?.twoFactorRedirect) {
        setPassword('')
        setStage('challenge')
        return
      }

      const status = await fetch('/api/admin', { cache: 'no-store' })
      const admin = status.ok
        ? await status.json() as { isAdmin?: boolean; twoFactorEnabled?: boolean }
        : null
      if (!admin?.isAdmin) {
        await authClient.signOut()
        throw new Error('Curator access is required.')
      }
      if (admin.twoFactorEnabled) {
        finish()
        return
      }
      await startEnrollment(password)
      setPassword('')
    } catch {
      captchaRef.current?.reset()
      setCaptchaToken('')
      setError('Sign-in could not be completed. Check your credentials and try again.')
      setStage('password')
    } finally {
      setBusy(false)
    }
  }

  const verifyMfa = async () => {
    if (backupMode ? !code.trim() : !/^\d{6}$/.test(code)) return
    setBusy(true)
    setError('')
    try {
      const result = backupMode
        ? await authClient.twoFactor.verifyBackupCode({ code, trustDevice: false })
        : await authClient.twoFactor.verifyTotp({ code, trustDevice: false })
      if (result.error) throw result.error
      if (stage === 'enroll') {
        const status = await fetch('/api/admin', { cache: 'no-store' })
        const admin = status.ok
          ? await status.json() as { isAdmin?: boolean; twoFactorEnabled?: boolean }
          : null
        if (!admin?.isAdmin || !admin.twoFactorEnabled) throw new Error('Two-step verification was not enabled')
      }
      finish()
    } catch {
      setCode('')
      setError('That verification code was not accepted. Wait for a new code and try again.')
    } finally {
      setBusy(false)
    }
  }

  const cancel = async () => {
    await authClient.signOut()
    router.replace('/')
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary">
            {stage === 'password' ? <KeyRoundIcon className="size-5" /> : <ShieldCheckIcon className="size-5" />}
          </div>
          <CardTitle className="font-serif text-2xl">
            {stage === 'password' && 'Curator sign in'}
            {stage === 'enroll' && 'Protect your account'}
            {stage === 'challenge' && 'Two-step verification'}
            {stage === 'loading' && 'Checking your session…'}
          </CardTitle>
          <CardDescription>
            {stage === 'password' && 'This area is restricted to approved timeline curators.'}
            {stage === 'enroll' && 'Scan the code with an authenticator app, then enter its six-digit code.'}
            {stage === 'challenge' && 'Enter the current six-digit code from your authenticator app.'}
          </CardDescription>
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
                {busy ? 'Signing in…' : 'Continue'}
              </Button>
            </>
          )}

          {stage === 'enroll' && (
            <>
              {totpUri && <QRCodeSVG value={totpUri} size={224} className="mx-auto rounded bg-white p-3" />}
              <Field>
                <FieldLabel htmlFor="mfa-secret">Manual setup key</FieldLabel>
                <Input id="mfa-secret" value={secret} readOnly className="font-mono text-xs" />
              </Field>
              {backupCodes.length > 0 && (
                <div className="rounded-md border p-3 text-sm">
                  <p className="mb-2 font-medium">Save these recovery codes somewhere private.</p>
                  <p className="font-mono text-xs leading-relaxed">{backupCodes.join(' · ')}</p>
                </div>
              )}
              <MfaCodeField code={code} setCode={setCode} error={error} onEnter={verifyMfa} />
              <Button onClick={() => void verifyMfa()} disabled={busy || !/^\d{6}$/.test(code)}>
                {busy ? 'Verifying…' : 'Enable two-step verification'}
              </Button>
            </>
          )}

          {stage === 'challenge' && (
            <>
              <MfaCodeField
                code={code}
                setCode={setCode}
                error={error}
                onEnter={verifyMfa}
                allowText={backupMode}
              />
              <Button
                onClick={() => void verifyMfa()}
                disabled={busy || (backupMode ? !code.trim() : !/^\d{6}$/.test(code))}
              >
                {busy ? 'Verifying…' : 'Verify and open editor'}
              </Button>
              <Button
                variant="link"
                onClick={() => { setBackupMode((mode) => !mode); setCode(''); setError('') }}
              >
                {backupMode ? 'Use an authenticator code' : 'Use a recovery code'}
              </Button>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Lost your authenticator? Ask a project owner to remove the factor and help you enroll again.
              </p>
            </>
          )}

          {stage !== 'loading' && (
            <Button variant="ghost" onClick={() => void cancel()}>
              <ArrowLeftIcon data-icon="inline-start" />
              Return to timeline
            </Button>
          )}
          {stage === 'password' && (
            <Link href="/privacy" className="text-center text-xs text-muted-foreground underline underline-offset-2">
              Privacy notice
            </Link>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

function MfaCodeField({
  code,
  setCode,
  error,
  onEnter,
  allowText = false,
}: {
  code: string
  setCode: (value: string) => void
  error: string
  onEnter: () => Promise<void>
  allowText?: boolean
}) {
  return (
    <Field data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor="mfa-code">Six-digit code</FieldLabel>
      <Input
        id="mfa-code"
        inputMode={allowText ? 'text' : 'numeric'}
        autoComplete={allowText ? 'off' : 'one-time-code'}
        pattern={allowText ? undefined : '[0-9]{6}'}
        maxLength={allowText ? 64 : 6}
        value={code}
        onChange={(event) => setCode(allowText ? event.target.value : event.target.value.replace(/\D/g, '').slice(0, 6))}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.nativeEvent.isComposing) void onEnter()
        }}
      />
      {error && <FieldDescription className="text-destructive" role="alert">{error}</FieldDescription>}
    </Field>
  )
}
