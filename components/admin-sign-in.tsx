'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, KeyRoundIcon, ShieldCheckIcon } from 'lucide-react'
import {
  TurnstileWidget,
  type TurnstileWidgetHandle,
} from '@/components/turnstile-widget'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'

type Stage = 'loading' | 'password' | 'enroll' | 'challenge'

export function AdminSignIn() {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])
  const captchaRef = React.useRef<TurnstileWidgetHandle>(null)
  const [stage, setStage] = React.useState<Stage>('loading')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [code, setCode] = React.useState('')
  const [factorId, setFactorId] = React.useState('')
  const [qrCode, setQrCode] = React.useState('')
  const [secret, setSecret] = React.useState('')
  const [captchaToken, setCaptchaToken] = React.useState('')
  const [error, setError] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const captchaMisconfigured = process.env.NODE_ENV === 'production' && !siteKey

  const finish = React.useCallback(() => {
    router.replace('/')
    router.refresh()
  }, [router])

  const confirmCurator = React.useCallback(async (userId: string) => {
    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    return !profileError && data.role === 'curator'
  }, [supabase])

  const beginEnrollment = React.useCallback(async () => {
    const factors = await supabase.auth.mfa.listFactors()
    if (factors.error) throw factors.error
    for (const factor of factors.data.all) {
      if (factor.status === 'unverified') {
        await supabase.auth.mfa.unenroll({ factorId: factor.id })
      }
    }
    const enrollment = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Map of Church History',
    })
    if (enrollment.error) throw enrollment.error
    setFactorId(enrollment.data.id)
    setQrCode(enrollment.data.totp.qr_code)
    setSecret(enrollment.data.totp.secret)
    setStage('enroll')
  }, [supabase])

  const continueAfterPassword = React.useCallback(async (userId: string) => {
    if (!(await confirmCurator(userId))) {
      await supabase.auth.signOut()
      throw new Error('invalid')
    }

    const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (assurance.error) throw assurance.error
    if (assurance.data.currentLevel === 'aal2') {
      finish()
      return
    }

    const factors = await supabase.auth.mfa.listFactors()
    if (factors.error) throw factors.error
    const verifiedTotp = factors.data.totp.find((factor) => factor.status === 'verified')
    if (verifiedTotp) {
      setFactorId(verifiedTotp.id)
      setStage('challenge')
      return
    }
    await beginEnrollment()
  }, [beginEnrollment, confirmCurator, finish, supabase])

  React.useEffect(() => {
    let active = true
    supabase.auth.getUser().then(async ({ data, error: userError }) => {
      if (!active) return
      if (userError || !data.user) {
        setStage('password')
        return
      }
      try {
        await continueAfterPassword(data.user.id)
      } catch {
        if (active) {
          setError('Sign-in could not be completed. Check your credentials and try again.')
          setStage('password')
        }
      }
    })
    return () => { active = false }
  }, [continueAfterPassword, supabase])

  const signIn = async () => {
    if (!email || !password || (siteKey && !captchaToken) || captchaMisconfigured) return
    setBusy(true)
    setError('')
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: captchaToken ? { captchaToken } : undefined,
      })
      if (signInError || !data.user) throw signInError ?? new Error('invalid')
      setPassword('')
      await continueAfterPassword(data.user.id)
    } catch {
      await supabase.auth.signOut()
      captchaRef.current?.reset()
      setError('Sign-in could not be completed. Check your credentials and try again.')
      setStage('password')
    } finally {
      setBusy(false)
    }
  }

  const verifyMfa = async () => {
    if (!factorId || !/^\d{6}$/.test(code)) return
    setBusy(true)
    setError('')
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId })
      if (challenge.error) throw challenge.error
      const verification = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code,
      })
      if (verification.error) throw verification.error
      finish()
    } catch {
      setCode('')
      setError('That verification code was not accepted. Wait for a new code and try again.')
    } finally {
      setBusy(false)
    }
  }

  const cancel = async () => {
    await supabase.auth.signOut()
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
            {stage === 'enroll' && 'Scan this QR code with an authenticator app, then enter its six-digit code.'}
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
              <TurnstileWidget
                ref={captchaRef}
                action="admin-signin"
                onTokenChange={setCaptchaToken}
              />
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
              {qrCode && <img src={qrCode} alt="QR code for the authenticator app" className="mx-auto size-56 rounded bg-white p-3" />}
              <Field>
                <FieldLabel htmlFor="mfa-secret">Manual setup key</FieldLabel>
                <Input id="mfa-secret" value={secret} readOnly className="font-mono text-xs" />
              </Field>
              <MfaCodeField code={code} setCode={setCode} error={error} onEnter={verifyMfa} />
              <Button onClick={() => void verifyMfa()} disabled={busy || !/^\d{6}$/.test(code)}>
                {busy ? 'Verifying…' : 'Enable two-step verification'}
              </Button>
            </>
          )}

          {stage === 'challenge' && (
            <>
              <MfaCodeField code={code} setCode={setCode} error={error} onEnter={verifyMfa} />
              <Button onClick={() => void verifyMfa()} disabled={busy || !/^\d{6}$/.test(code)}>
                {busy ? 'Verifying…' : 'Verify and open editor'}
              </Button>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Lost your authenticator? Ask a Supabase project owner to follow the recovery procedure; there is no MFA bypass on this page.
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
}: {
  code: string
  setCode: (value: string) => void
  error: string
  onEnter: () => Promise<void>
}) {
  return (
    <Field data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor="mfa-code">Six-digit code</FieldLabel>
      <Input
        id="mfa-code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        value={code}
        onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && /^\d{6}$/.test(code)) void onEnter()
        }}
      />
      {error && <FieldDescription className="text-destructive" role="alert">{error}</FieldDescription>}
    </Field>
  )
}
