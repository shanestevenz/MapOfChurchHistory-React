import { getAuth } from '@/lib/auth/server'

export type CuratorSession = { userId: string; isAdmin: boolean }

/** The signed-in user and whether they hold the curator (admin) role, or null when signed out. */
export async function getCuratorSession(): Promise<CuratorSession | null> {
  const auth = getAuth()
  if (!auth) return null
  try {
    const { data: session } = await auth.getSession()
    const user = session?.user as { id?: string; role?: string | null } | undefined
    if (!user?.id) return null
    return { userId: user.id, isAdmin: user.role === 'admin' }
  } catch {
    return null
  }
}

/** The curator's user id, or null when the request is not from a signed-in curator. */
export async function getCuratorId(): Promise<string | null> {
  const session = await getCuratorSession()
  return session?.isAdmin ? session.userId : null
}
