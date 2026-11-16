import type { CDPSession, Page } from '@playwright/test'

declare global {
  interface Window {
    __perf: { lcp: number; cls: number; longTasks: [number, number][] }
    __frames: number[]
    __recording: boolean
  }
}

export const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1))] ?? 0
}

/** Slow the page's CPU down (1 = no throttling, 4 = mid-range phone). */
export async function throttleCpu(page: Page, rate: number): Promise<CDPSession> {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate })
  return cdp
}

/** Records LCP, CLS and long tasks from the very start of the page. */
export async function observeWebVitals(page: Page) {
  await page.addInitScript(() => {
    window.__perf = { lcp: 0, cls: 0, longTasks: [] }
    const observe = (type: string, onEntry: (entry: PerformanceEntry) => void) => {
      try {
        new PerformanceObserver((list) => list.getEntries().forEach(onEntry)).observe({ type, buffered: true })
      } catch {
        // Entry type not supported by this browser.
      }
    }
    observe('largest-contentful-paint', (entry) => { window.__perf.lcp = entry.startTime })
    observe('layout-shift', (entry) => {
      const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean }
      if (!shift.hadRecentInput) window.__perf.cls += shift.value
    })
    observe('longtask', (entry) => { window.__perf.longTasks.push([entry.startTime, entry.duration]) })
  })
}

export async function readWebVitals(page: Page) {
  return page.evaluate(() => {
    const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0
    const tbt = window.__perf.longTasks
      .filter(([start]) => start >= fcp)
      .reduce((total, [, duration]) => total + Math.max(0, duration - 50), 0)
    return {
      fcpMs: Math.round(fcp),
      lcpMs: Math.round(window.__perf.lcp),
      cls: Number(window.__perf.cls.toFixed(3)),
      tbtMs: Math.round(tbt),
      longestTaskMs: Math.round(Math.max(0, ...window.__perf.longTasks.map(([, d]) => d))),
      domNodes: document.getElementsByTagName('*').length,
    }
  })
}

/** Compressed bytes per resource type for everything the page loads. */
export async function trackTransfer(page: Page) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Network.enable')
  const types = new Map<string, string>()
  const bytes: Record<string, number> = {}
  cdp.on('Network.responseReceived', (event) => types.set(event.requestId, event.type.toLowerCase()))
  cdp.on('Network.loadingFinished', (event) => {
    const type = types.get(event.requestId) ?? 'other'
    bytes[type] = (bytes[type] ?? 0) + event.encodedDataLength
    bytes.total = (bytes.total ?? 0) + event.encodedDataLength
  })
  return () => Object.fromEntries(Object.entries(bytes).map(([type, b]) => [type, Math.round(b / 1024)]))
}

/** Frame-time stats (from requestAnimationFrame) while `action` runs. */
export async function recordFrames(page: Page, action: () => Promise<void>) {
  await page.evaluate(() => {
    window.__frames = []
    window.__recording = true
    let last = performance.now()
    const tick = (now: number) => {
      window.__frames.push(now - last)
      last = now
      if (window.__recording) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
  await action()
  const frames = await page.evaluate(() => {
    window.__recording = false
    return window.__frames.slice(1)
  })
  const average = frames.reduce((a, b) => a + b, 0) / Math.max(1, frames.length)
  return {
    frames: frames.length,
    avgFrameMs: Number(average.toFixed(1)),
    fps: Math.round(1000 / Math.max(1, average)),
    p95FrameMs: Math.round(percentile(frames, 0.95)),
    maxFrameMs: Math.round(Math.max(0, ...frames)),
    jankShare: Number((frames.filter((f) => f > 50).length / Math.max(1, frames.length)).toFixed(3)),
  }
}

/**
 * Opens the timeline and waits until it is interactive and settled. The
 * nodes are server-rendered, so they appear before React has hydrated them,
 * and hydration then scrolls the canvas to the trunk; a click before that
 * lands on nothing. The canvas sets data-ready in the same commit.
 */
export async function openTimeline(page: Page) {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.locator('[data-ready]').waitFor({ state: 'attached', timeout: 30_000 })
  await page.getByRole('button', { name: 'Pentecost, c. AD 33' }).waitFor()
}

/** A run of wheel notches over the canvas, then time to settle. */
export async function wheelZoom(page: Page, direction: 'in' | 'out', notches = 20) {
  await page.mouse.move(900, 500)
  for (let i = 0; i < notches; i += 1) {
    await page.mouse.wheel(0, direction === 'out' ? 300 : -300)
    await page.waitForTimeout(30)
  }
  await page.waitForTimeout(800)
}

/** A left-button drag across the canvas background. */
export async function dragPan(page: Page) {
  await page.mouse.move(1100, 650)
  await page.mouse.down()
  for (let i = 0; i < 30; i += 1) {
    await page.mouse.move(1100 - i * 20, 650 - (i % 5))
    await page.waitForTimeout(16)
  }
  await page.mouse.up()
  await page.waitForTimeout(300)
}
