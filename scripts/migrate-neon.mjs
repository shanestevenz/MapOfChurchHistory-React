import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import pg from 'pg'

const databaseUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('Set DATABASE_URL_UNPOOLED (recommended) or DATABASE_URL before migrating.')
  process.exit(1)
}

const client = new pg.Client({ connectionString: databaseUrl })
await client.connect()
try {
  await client.query(`
    create table if not exists public.schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `)
  await client.query('revoke all on public.schema_migrations from public')
  const directory = resolve('db/migrations')
  const migrations = (await readdir(directory)).filter((name) => name.endsWith('.sql')).sort()
  for (const name of migrations) {
    const existing = await client.query('select 1 from public.schema_migrations where name = $1', [name])
    if (existing.rowCount) continue
    const sql = await readFile(resolve(directory, name), 'utf8')
    await client.query('begin')
    try {
      await client.query(sql)
      await client.query('insert into public.schema_migrations(name) values ($1)', [name])
      await client.query('commit')
      console.log(`Applied ${name}`)
    } catch (error) {
      await client.query('rollback')
      throw error
    }
  }
  console.log('Neon schema migrations are up to date.')
} finally {
  await client.end()
}
