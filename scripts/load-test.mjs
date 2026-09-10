import { performance } from 'node:perf_hooks'

const target = process.env.LOAD_TEST_URL?.trim()
if (!target) throw new Error('Set LOAD_TEST_URL to the HTTPS URL of a staging deployment.')

const url = new URL(target)
if (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
  throw new Error('LOAD_TEST_URL must be an HTTPS staging URL, not localhost.')
}
if (process.env.CONFIRM_STAGING !== 'yes') {
  throw new Error('Set CONFIRM_STAGING=yes after confirming this is not the production site.')
}

const requests = Math.min(Math.max(Number(process.env.LOAD_TEST_REQUESTS) || 100, 1), 1000)
const concurrency = Math.min(Math.max(Number(process.env.LOAD_TEST_CONCURRENCY) || 10, 1), 50)
const durations = []
let nextIndex = 0
let failures = 0

async function worker() {
  while (nextIndex < requests) {
    nextIndex += 1
    const start = performance.now()
    try {
      const response = await fetch(url, {
        headers: { 'user-agent': 'church-history-staging-load-test/1.0' },
        redirect: 'follow',
        signal: AbortSignal.timeout(15_000),
      })
      await response.arrayBuffer()
      if (!response.ok) failures += 1
    } catch {
      failures += 1
    } finally {
      durations.push(performance.now() - start)
    }
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, requests) }, worker))
durations.sort((a, b) => a - b)
const percentile = (value) => Math.round(durations[Math.min(durations.length - 1, Math.ceil(durations.length * value) - 1)])

console.log(`Completed ${requests} staging GET requests with concurrency ${concurrency}.`)
console.log(`Failures: ${failures}; p50: ${percentile(0.5)} ms; p95: ${percentile(0.95)} ms; p99: ${percentile(0.99)} ms.`)
if (failures) process.exitCode = 1
