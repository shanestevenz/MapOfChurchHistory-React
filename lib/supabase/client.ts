import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

let client: ReturnType<typeof createBrowserClient<Database>> | undefined

export function createClient() {
  if (client) return client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
  client = createBrowserClient<Database>(url, key)
  return client
}
