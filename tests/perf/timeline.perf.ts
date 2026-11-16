import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { BUDGETS } from './budgets'
import {
  dragPan,
  observeWebVitals,
  openTimeline,
  percentile,
  readWebVitals,
  recordFrames,
  throttleCpu,
  trackTransfer,
  wheelZoom,
} from './measure'

/**
 * Performance budgets for the public timeline. Run against a production
 * build with `npm run test:perf` (see playwright.perf.config.ts).
 * Every test prints its measurements, pass or fail, so a run doubles as a
 * performance report.
 */

/**
 * The site targets desktop. The mid-range phone profile is measured and
 * reported, with a note for anything over budget, but does not fail the
 * suite. Set `enforce: true` when mobile becomes a target.
 */
const PROFILES = [
  { name: 'fast', cpu: 1, enforce: true },
  { name: 'mid-range phone', cpu: 4, enforce: false },
] as const

/** Checks a measurement against its budget: a soft failure when enforced, otherwise a note. */
function within(enforce: boolean, testInfo: TestInfo, value: number, budget: number, label: string) {
  if (enforce) {
    expect.soft(value, label).toBeLessThanOrEqual(budget)
  } else if (value > budget) {
    const description = `${label}: ${value} > ${budget}`
    testInfo.annotations.push({ type: 'over budget (not enforced)', description })
    console.log(`  over budget (not enforced): ${description}`)
  }
}

/** Logs measurements and attaches them to the report. */
async function report(testInfo: TestInfo, label: string, values: Record<string, unknown>) {
  console.log(`  ${label}: ${JSON.stringify(values)}`)
  await testInfo.attach(label, { body: JSON.stringify(values, null, 2), contentType: 'application/json' })
}

test('page weight stays within budget', async ({ page }, testInfo) => {
  const transfer = await trackTransfer(page)
  await openTimeline(page)
  await page.waitForTimeout(1_000)
  const kb = transfer()
  await report(testInfo, 'transfer KB (compressed)', kb)

  expect.soft(kb.script ?? 0, 'JavaScript KB').toBeLessThanOrEqual(BUDGETS.transferKB.script)
  expect.soft(kb.stylesheet ?? 0, 'CSS KB').toBeLessThanOrEqual(BUDGETS.transferKB.stylesheet)
  expect.soft(kb.font ?? 0, 'font KB').toBeLessThanOrEqual(BUDGETS.transferKB.font)
  expect.soft(kb.image ?? 0, 'image KB').toBeLessThanOrEqual(BUDGETS.transferKB.image)
  expect.soft(kb.total ?? 0, 'total KB').toBeLessThanOrEqual(BUDGETS.transferKB.total)
})

test('server responds quickly', async ({ request }, testInfo) => {
  const time = async (path: string) => {
    const durations: number[] = []
    for (let i = 0; i < 20; i += 1) {
      const start = performance.now()
      const response = await request.get(path)
      await response.body()
      expect(response.ok(), `${path} status`).toBeTruthy()
      durations.push(performance.now() - start)
    }
    return { p50: Math.round(percentile(durations, 0.5)), p95: Math.round(percentile(durations, 0.95)) }
  }
  const page = await time('/')
  const api = await time('/api/timeline')
  await report(testInfo, 'server ms', { page, api })

  expect.soft(page.p95, 'page p95 ms').toBeLessThanOrEqual(BUDGETS.serverMs.pageP95)
  expect.soft(api.p95, '/api/timeline p95 ms').toBeLessThanOrEqual(BUDGETS.serverMs.timelineApiP95)
})

for (const profile of PROFILES) {
  const fast = profile.cpu === 1
  const check = (testInfo: TestInfo, value: number, budget: number, label: string) =>
    within(profile.enforce, testInfo, value, budget, label)

  test.describe(`${profile.name} (CPU ${profile.cpu}x)`, () => {
    const setUp = async (page: Page) => {
      await throttleCpu(page, profile.cpu)
      await openTimeline(page)
    }

    test('loads quickly without blocking the main thread', async ({ page }, testInfo) => {
      await observeWebVitals(page)
      await setUp(page)
      await page.waitForTimeout(1_500)
      const vitals = await readWebVitals(page)
      await report(testInfo, 'load', vitals)

      const budget = fast ? BUDGETS.loadFast : BUDGETS.loadMidPhone
      check(testInfo, vitals.fcpMs, budget.fcpMs, 'First Contentful Paint ms')
      check(testInfo, vitals.lcpMs, budget.lcpMs, 'Largest Contentful Paint ms')
      check(testInfo, vitals.cls, budget.cls, 'Cumulative Layout Shift')
      check(testInfo, vitals.tbtMs, budget.tbtMs, 'Total Blocking Time ms')
    })

    test('zooming stays smooth', async ({ page }, testInfo) => {
      await setUp(page)
      const out = await recordFrames(page, () => wheelZoom(page, 'out'))
      const back = await recordFrames(page, () => wheelZoom(page, 'in'))
      await report(testInfo, 'zoom out', out)
      await report(testInfo, 'zoom in', back)

      const budget = fast ? BUDGETS.zoomFast : BUDGETS.zoomMidPhone
      for (const [label, stats] of [['zoom out', out], ['zoom in', back]] as const) {
        check(testInfo, stats.p95FrameMs, budget.p95FrameMs, `${label} p95 frame ms`)
        check(testInfo, stats.jankShare, budget.jankShare, `${label} share of frames > 50 ms`)
      }
    })

    test('panning stays smooth', async ({ page }, testInfo) => {
      await setUp(page)
      const stats = await recordFrames(page, () => dragPan(page))
      await report(testInfo, 'pan', stats)

      const budget = fast ? BUDGETS.panFast : BUDGETS.panMidPhone
      check(testInfo, stats.p95FrameMs, budget.p95FrameMs, 'pan p95 frame ms')
      check(testInfo, stats.jankShare, budget.jankShare, 'pan share of frames > 50 ms')
    })

    test('opening an event responds quickly', async ({ page }, testInfo) => {
      await setUp(page)
      const node = page.getByRole('button', { name: 'Pentecost, c. AD 33' })
      const start = Date.now()
      await node.click()
      await page.getByRole('dialog').getByRole('heading', { name: 'Pentecost', exact: true }).waitFor()
      const ms = Date.now() - start
      await report(testInfo, 'open event ms', { ms })

      check(
        testInfo,
        ms,
        fast ? BUDGETS.openEventFastMs : BUDGETS.openEventMidPhoneMs,
        'click to detail visible ms',
      )
    })
  })
}
