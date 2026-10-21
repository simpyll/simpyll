import { test, expect } from '@playwright/test'

test('floating navigation preserves routes, history, theme and direct loads', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/blog/hello-world')
  const nav = page.getByRole('navigation', { name: 'Main navigation' })
  await expect(nav.getByRole('link', { name: 'Journal', exact: true })).toHaveAttribute('aria-current', 'page')
  await nav.getByRole('link', { name: 'Home', exact: true }).click()
  await expect(page).toHaveURL('/')
  await expect(nav.getByRole('link', { name: 'Home', exact: true })).toHaveAttribute('aria-current', 'page')
  await page.goBack()
  await expect(nav.getByRole('link', { name: 'Journal', exact: true })).toHaveAttribute('aria-current', 'page')
  await page.goForward()
  await expect(nav.getByRole('link', { name: 'Home', exact: true })).toHaveAttribute('aria-current', 'page')
  const before = await page.locator('html').getAttribute('data-theme')
  await nav.getByRole('button', { name: /Switch to/ }).click()
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', before!)
  expect(errors).toEqual([])
})

test('320px disclosure supports keyboard, dismissal, section focus and touch targets', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 })
  await page.goto('/')
  const nav = page.getByRole('navigation', { name: 'Main navigation' })
  const more = nav.getByRole('button', { name: 'More' })
  await more.focus()
  await page.keyboard.press('Enter')
  await expect(more).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('Escape')
  await expect(more).toBeFocused()
  await expect(more).toHaveAttribute('aria-expanded', 'false')
  await more.click()
  await page.locator('#navigation-overflow').getByRole('link', { name: 'Projects' }).click()
  await expect(page).toHaveURL('/#work')
  await expect(page.locator('#work')).toBeFocused()
  await expect(more).toHaveAttribute('aria-expanded', 'false')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  for (const control of await nav.locator('a:visible, button:visible').all()) {
    const box = await control.boundingBox()
    expect(box!.width).toBeGreaterThanOrEqual(44)
    expect(box!.height).toBeGreaterThanOrEqual(44)
  }
  await more.click()
  await page.locator('h1').click()
  await expect(more).toHaveAttribute('aria-expanded', 'false')
})

test('indicator responds to resize and reduced motion with theme screenshots', async ({ page }, testInfo) => {
  await page.goto('/blog')
  const pill = page.locator('.nav-indicator')
  await expect(pill).toHaveCSS('opacity', '1')
  await expect(pill).toHaveCSS('transition-duration', '0s')
  for (const width of [320, 1280]) {
    await page.setViewportSize({ width, height: 800 })
    for (const theme of ['light', 'dark']) {
      await page.evaluate(value => document.documentElement.dataset.theme = value, theme)
      await expect.poll(async () => {
        const a = await page.locator('.floating-links [aria-current]').boundingBox()
        const b = await pill.boundingBox()
        return Math.abs(a!.x - b!.x) + Math.abs(a!.width - b!.width)
      }).toBeLessThan(2)
      await page.screenshot({ path: testInfo.outputPath(`navigation-${width}-${theme}.png`) })
    }
  }
})
