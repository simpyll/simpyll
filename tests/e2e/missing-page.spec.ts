import { test, expect } from '@playwright/test'
import { scan, tabTo } from './helpers/accessibility'

for (const theme of ['light', 'dark'] as const) {
  test(`missing page recovery, search, and hydration: ${theme}`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme: theme })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    const path = `/missing/${'long-path-'.repeat(24)}`
    expect((await page.goto(path))?.status()).toBe(404)
    await expect(page.locator('main h1')).toHaveText('Page not found.')
    await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'noindex, follow')
    await expect(page.locator('link[rel=canonical]')).toHaveCount(0)
    await expect(page.locator('main')).toContainText('may have moved, been renamed, or no longer exists.')
    await tabTo(page, page.getByRole('link', { name: 'Go home', exact: true }))
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await scan(page, info, `missing-${theme}`)
    await page.screenshot({ path: info.outputPath(`missing-${theme}.png`), fullPage: true })
    await page.getByRole('link', { name: 'Search the journal', exact: true }).click()
    await expect(page).toHaveURL('/explore')
    await page.getByRole('searchbox', { name: 'Search the journal' }).fill('python')
    await expect(page).toHaveURL(/q=python/)
    await page.goBack()
    await page.goto(path)
    for (const [name, href] of [['Browse projects', '/projects'], ['Back to journal', '/blog'], ['Go home', '/']] as const) {
      await page.getByRole('link', { name, exact: name === 'Go home' }).click()
      await expect(page).toHaveURL(href)
      await expect(page.locator('main h1')).not.toHaveText('Page not found.')
      await expect(page.locator('meta[name=robots]')).toHaveCount(0)
      await page.goBack()
    }
    // Client routing must reach the same fallback without a document request.
    await page.goto('/blog')
    // Exercise the client router without a server document request.
    await page.evaluate(() => { history.pushState({}, '', '/client-missing-page'); dispatchEvent(new PopStateEvent('popstate')) })
    await expect(page.locator('main h1')).toHaveText('Page not found.')
    await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'noindex, follow')
    expect(errors).toEqual([])
  })
}

test.describe('static recovery without JavaScript', () => {
  test.use({ javaScriptEnabled: false })
  test('native links recover from a nested unknown URL', async ({ page }) => {
    for (const [name, href] of [['Go home', '/'], ['Back to journal', '/blog'], ['Browse projects', '/projects'], ['Search the journal', '/explore']] as const) {
      expect((await page.goto('/unknown/nested/page'))?.status()).toBe(404)
      await expect(page.locator('main h1')).toHaveText('Page not found.')
      await page.getByRole('link', { name, exact: name === 'Go home' || name === 'Search the journal' }).click()
      await expect(page).toHaveURL(href)
      await expect(page.locator('main h1')).toBeVisible()
    }
  })
})
