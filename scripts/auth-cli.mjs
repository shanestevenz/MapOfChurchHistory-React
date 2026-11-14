import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const [command, ...args] = process.argv.slice(2)
if (!['migrate', 'create-admin'].includes(command)) {
  console.error('Use: auth-cli.mjs migrate | create-admin [Better Auth CLI options]')
  process.exit(2)
}

const databaseUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('Set DATABASE_URL_UNPOOLED (recommended) or DATABASE_URL before running Better Auth CLI commands.')
  process.exit(1)
}

const cli = resolve('node_modules/auth/dist/index.mjs')
const result = spawnSync(process.execPath, [
  cli,
  command,
  ...args,
  '--config',
  './lib/auth/server.ts',
], {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: databaseUrl },
})

if (result.error) throw result.error
process.exit(result.status ?? 1)
