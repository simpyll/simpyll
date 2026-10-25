import { test, expect } from '@playwright/test'

test('RSS is discoverable and keyboard accessible without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
  const page = await context.newPage()
  await page.goto('/blog')
  const link = page.getByRole('link', { name: 'Subscribe via RSS' })
  await expect(link).toHaveAttribute('href', '/rss.xml')
  await expect(link).toBeVisible()
  await link.focus()
  await expect(link).toBeFocused()
  const response = await context.request.get('/rss.xml')
  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toMatch(/xml/)
  await context.close()
})
