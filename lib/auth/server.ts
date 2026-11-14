import { createNeonAuth, type NeonAuth } from '@neon/auth/next/server'
import { authIsConfigured } from '@/lib/db'

// Neon Auth (Managed Better Auth) hosts the auth server; users live in the
// branch's neon_auth schema. The instance is created lazily because
// createNeonAuth throws when the cookie secret is missing, and the public
// timeline must keep working (and building) without auth configured.
let instance: NeonAuth | null = null

export function getAuth(): NeonAuth | null {
  if (!authIsConfigured()) return null
  instance ??= createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
  })
  return instance
}
