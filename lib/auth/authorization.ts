import { auth } from '@/lib/auth/server'
import { authIsConfigured } from '@/lib/db'

export async function getCuratorId(request: Request): Promise<string | null> {
  if (!authIsConfigured()) return null
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) return null
    const user = session.user as typeof session.user & {
      role?: string
      twoFactorEnabled?: boolean
    }
    return user.role === 'admin' && user.twoFactorEnabled ? user.id : null
  } catch {
    return null
  }
}
