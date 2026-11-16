import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import pg from 'pg'

const databaseUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('Set DATABASE_URL_UNPOOLED (recommended) or DATABASE_URL before seeding.')
  process.exit(1)
}

const sql = await readFile(resolve('db/seed.sql'), 'utf8')
const client = new pg.Client({ connectionString: databaseUrl })
await client.connect()
try {
  await client.query('begin')
  await client.query(sql)
  await client.query('commit')
  console.log('Neon timeline seed data is up to date.')
} catch (error) {
  await client.query('rollback')
  throw error
} finally {
  await client.end()
}
