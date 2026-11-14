import { attachDatabasePool } from '@vercel/functions'
import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL

export const pool = new Pool({
  connectionString: connectionString || 'postgres://missing:missing@localhost:5432/missing',
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
})
attachDatabasePool(pool)

export function databaseIsConfigured() {
  return Boolean(process.env.DATABASE_URL)
}

export function authIsConfigured() {
  return databaseIsConfigured()
    && Boolean(process.env.BETTER_AUTH_SECRET)
    && (process.env.NODE_ENV !== 'production' || Boolean(process.env.BETTER_AUTH_URL))
}
