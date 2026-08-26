'use client'

import * as React from 'react'
import {
  DownloadIcon,
  InboxIcon,
  LockIcon,
  LogOutIcon,
  PlusIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { useTimeline } from '@/components/timeline-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { DATA_VERSION } from '@/lib/timeline-data'

export function AdminBar({
  onAddEvent,
  onReviewSuggestions,
}: {
  onAddEvent: () => void
  onReviewSuggestions: () => void
}) {
  const {
    events,
    isAdmin,
    hasLocalEdits,
    pendingCount,
    signIn,
    signOut,
    resetToSeed,
  } = useTimeline()
  const [signInOpen, setSignInOpen] = React.useState(false)
  const [passcode, setPasscode] = React.useState('')
  const [invalid, setInvalid] = React.useState(false)

  const attemptSignIn = () => {
    if (signIn(passcode)) {
      setSignInOpen(false)
      setPasscode('')
      setInvalid(false)
      toast.success('Editor mode on. Nodes can now be edited.')
    } else {
      setInvalid(true)
    }
  }

  const exportJson = () => {
    const blob = new Blob(
      [JSON.stringify({ version: DATA_VERSION, events }, null, 2)],
      { type: 'application/json' },
    )
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'church-timeline.json'
    anchor.click()
    URL.revokeObjectURL(url)
    toast.success('Timeline exported as JSON.')
  }

  if (!isAdmin) {
    return (
      <>
        <Button variant="ghost" size="sm" onClick={() => setSignInOpen(true)}>
          <LockIcon data-icon="inline-start" />
          Editor sign in
        </Button>

        <Dialog open={signInOpen} onOpenChange={setSignInOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-serif text-xl">
                Editor sign in
              </DialogTitle>
              <DialogDescription>
                Editing is limited to curators. Visitors can read and explore
                the timeline without signing in.
              </DialogDescription>
            </DialogHeader>
            <Field data-invalid={invalid || undefined}>
              <FieldLabel htmlFor="passcode">Passcode</FieldLabel>
              <Input
                id="passcode"
                type="password"
                autoComplete="off"
                aria-invalid={invalid || undefined}
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value)
                  setInvalid(false)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    attemptSignIn()
                  }
                }}
              />
              <FieldDescription>
                {invalid
                  ? 'That passcode is not recognised.'
                  : 'Demo passcode: ecclesia'}
              </FieldDescription>
            </Field>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSignInOpen(false)}>
                Cancel
              </Button>
              <Button onClick={attemptSignIn}>Unlock editing</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="outline" className="gap-1.5 border-primary/40 text-primary">
        <ShieldCheckIcon className="size-3" />
        Editor mode
      </Badge>
      <Button size="sm" onClick={onAddEvent}>
        <PlusIcon data-icon="inline-start" />
        Add event
      </Button>
      <Button variant="outline" size="sm" onClick={onReviewSuggestions}>
        <InboxIcon data-icon="inline-start" />
        Review
        {pendingCount > 0 && (
          <Badge className="ml-1.5">{pendingCount}</Badge>
        )}
      </Button>
      <Button variant="outline" size="sm" onClick={exportJson}>
        <DownloadIcon data-icon="inline-start" />
        Export
      </Button>
      {hasLocalEdits && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            resetToSeed()
            toast.success('Timeline restored to the published version.')
          }}
        >
          <RotateCcwIcon data-icon="inline-start" />
          Reset
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={signOut}>
        <LogOutIcon data-icon="inline-start" />
        Exit
      </Button>
    </div>
  )
}
