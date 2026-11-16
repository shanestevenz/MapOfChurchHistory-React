import { defineConfig, devices } from '@playwright/test'

/**
 * Performance budgets (tests/perf). Separate from the e2e suite because the
 * numbers only mean something against a production build, one test at a
 * time, in Chromium (CPU throttling and tracing use the DevTools protocol).
 *
 *   npm run test:perf                         builds, starts on :3100, measures
 *   PERF_BASE_URL=http://host:port npm run test:perf   measures a running server
 */
const port = 3100
const baseURL = process.env.PERF_BASE_URL || `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: './tests/perf',
  testMatch: '**/*.perf.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/perf', open: 'never' }]],
  outputDir: 'test-results/perf',
  use: {
    baseURL,
    viewport: { width: 1440, height: 900 },
    trace: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: process.env.PERF_BASE_URL
    ? undefined
    : {
        command: `npm run build && npx next start -p ${port} -H 127.0.0.1`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 600_000,
        stdout: 'ignore',
        stderr: 'pipe',
      },
})
