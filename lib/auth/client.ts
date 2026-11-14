'use client'

import { createAuthClient } from '@neon/auth/next'

// Talks to this app's same-origin proxy at /api/auth, which forwards to Neon Auth.
export const authClient = createAuthClient()
