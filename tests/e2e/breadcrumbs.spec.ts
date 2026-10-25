import { test, expect } from '@playwright/test'
import { visibleFocus } from './helpers/accessibility'

for (const theme of ['light', 'dark'] as const) test(`breadcrumbs: ${theme}, keyboard, responsive titles and hydration`, async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.emulateMedia({ colorScheme: theme })
  for (const path of ['/blog/hello-world', '/projects/simpyll']) {
    await page.goto(path)
    const nav = page.getByRole('navigation', { name: 'Breadcrumb', exact: true })
    await expect(nav).toBeVisible()
    await expect(nav.getByRole('link')).toHaveCount(2)
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1)
    const home = nav.getByRole('link', { name: 'Home', exact: true })
    await page.locator('main').focus()
    await page.keyboard.press('Tab')
    await expect(home).toBeFocused()
    await visibleFocus(home)
    await page.keyboard.press('Tab')
    const parent = nav.getByRole('link').nth(1)
    await expect(parent).toBeFocused()
    await visibleFocus(parent)
    await page.screenshot({ path: testInfo.outputPath(`${path.includes('blog') ? 'article' : 'project'}-${theme}.png`) })
    await nav.locator('[aria-current]').evaluate(el => { el.textContent = 'A very long title with Unicode 日本語 and unbroken text '.repeat(30) })
    await page.setViewportSize({ width: 320, height: 800 })
    await nav.evaluate(el => { el.style.fontSize = '28px' })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
    await expect(parent).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(path.includes('blog') ? /\/blog$/ : /\/projects$/)
    await expect(page.getByRole('navigation', { name: 'Breadcrumb', exact: true })).toHaveCount(0)
  }
  expect(errors).toEqual([])
})

test('static breadcrumbs navigate without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
  const page = await context.newPage()
  for (const path of ['/blog/hello-world', '/projects/simpyll']) {
    await page.goto(path)
    await page.getByRole('navigation', { name: 'Breadcrumb', exact: true }).getByRole('link', { name: 'Home', exact: true }).click()
    await expect(page).toHaveURL(`${baseURL}/`)
  }
  await context.close()
})
