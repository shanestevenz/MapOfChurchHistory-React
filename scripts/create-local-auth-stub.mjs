// Creates a minimal stand-in for Neon Auth's neon_auth."user" table so the app
// schema can be migrated on plain local Postgres (docker compose) and in CI.
// On Neon, enable Neon Auth on the branch instead; never run this there.
import pg from 'pg'

const databaseUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('Set DATABASE_URL (a local Postgres database) first.')
  process.exit(1)
}
const host = new URL(databaseUrl).hostname.replace(/^\[|\]$/g, '')
if (!['localhost', '127.0.0.1', '::1', 'postgres', 'db'].includes(host)) {
  console.error(`Refusing to create the Neon Auth stand-in on "${host}". It is only for local Postgres and CI.`)
  process.exit(1)
}

const client = new pg.Client({ connectionString: databaseUrl })
await client.connect()
try {
  await client.query(`
    create extension if not exists pgcrypto;
    create schema if not exists neon_auth;
    create table if not exists neon_auth."user" (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      email text not null unique,
      "emailVerified" boolean not null default false,
      image text,
      "createdAt" timestamptz not null default now(),
      "updatedAt" timestamptz not null default now(),
      role text,
      banned boolean,
      "banReason" text,
      "banExpires" timestamptz
    );
  `)
  console.log('Local neon_auth."user" stand-in is ready.')
} finally {
  await client.end()
}
