import { betterAuth } from 'better-auth'
import { admin, twoFactor } from 'better-auth/plugins'
import { PostgresDialect } from 'kysely'
import { pool } from '@/lib/db'

const appUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000'
const trustedOrigins = (process.env.BETTER_AUTH_TRUSTED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

export const auth = betterAuth({
  appName: 'Map of Church History',
  baseURL: appUrl,
  secret: process.env.BETTER_AUTH_SECRET || 'development-only-secret-change-before-deploying-00000000',
  trustedOrigins: [...new Set([appUrl, ...trustedOrigins])],
  database: {
    dialect: new PostgresDialect({ pool }),
    type: 'postgres',
    schemaName: 'auth',
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  plugins: [
    admin(),
    twoFactor({ issuer: 'Map of Church History' }),
  ],
  advanced: {
    useSecureCookies: process.env.NODE_ENV === 'production',
  },
})
