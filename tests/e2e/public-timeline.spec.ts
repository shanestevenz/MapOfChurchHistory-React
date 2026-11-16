import { expect, test, type Page } from '@playwright/test'

/**
 * Loads the timeline and waits until the canvas has settled. Clicking a node
 * before then can miss, because the canvas scrolls to the trunk on hydration.
 */
async function openTimeline(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Map of Church History' })).toBeVisible()
  await page.locator('[data-ready]').waitFor({ state: 'attached', timeout: 30_000 })
}

/**
 * Checks the denomination filters, then closes the panel. On wide screens the
 * panel starts open (desktop Chrome's 1280px viewport counts), so only click
 * to open it when it is closed.
 */
async function checkFiltersPanel(page: Page) {
  const toggle = page.getByRole('button', { name: /^Filters/ })
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  const panel = page.getByRole('complementary', { name: 'Timeline filters' })
  await expect(panel.getByRole('heading', { name: 'Denominations' })).toBeVisible()
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
}

test('serves the seeded timeline and opens an event detail', async ({ page, request }) => {
  const apiResponse = await request.get('/api/timeline')
  expect(apiResponse.ok()).toBeTruthy()
  const timeline = await apiResponse.json() as {
    events: Array<{ id: string }>
    groups: Array<{ id: string }>
  }
  expect(timeline.events.length).toBeGreaterThanOrEqual(50)
  expect(timeline.events.some((event) => event.id === 'pentecost')).toBeTruthy()
  expect(timeline.groups.length).toBeGreaterThan(0)

  await openTimeline(page)
  await checkFiltersPanel(page)

  await page.getByRole('button', { name: 'Pentecost, c. AD 33' }).click()
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Pentecost', exact: true })).toBeVisible()
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Suggest an edit' })).toBeVisible()
})

test('submits a visitor suggestion through the app to Postgres', async ({ page }) => {
  await openTimeline(page)
  await checkFiltersPanel(page)
  await page.getByRole('button', { name: 'Pentecost, c. AD 33' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Suggest an edit' }).click()

  const suggestionDialog = page.getByRole('dialog')
  await expect(suggestionDialog.getByRole('heading', { name: 'Suggest an edit' })).toBeVisible()
  await suggestionDialog.getByLabel('Summary', { exact: true }).fill('Integration test suggestion summary.')
  await suggestionDialog.getByLabel('Edit summary').fill('Submitted by the Playwright CI flow.')

  const submission = page.waitForResponse((response) =>
    response.url().endsWith('/api/suggestions') && response.request().method() === 'POST',
  )
  await suggestionDialog.getByRole('button', { name: 'Submit for review' }).click()
  const response = await submission
  const result = await response.json() as { id: string }
  expect(response.status(), JSON.stringify({
    result,
    requestUrl: response.url(),
    requestOrigin: (await response.request().allHeaders()).origin,
  })).toBe(201)
  expect(result.id).toMatch(/^[\da-f-]{36}$/i)
  await expect(page.getByText('Suggestion submitted for review.')).toBeVisible()
})
