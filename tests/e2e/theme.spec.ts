import { test, expect } from '@playwright/test'

const key = 'simpyll-theme'

test('System defaults follow live OS changes; explicit preferences persist and ignore OS', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  const control = page.getByRole('combobox', { name: 'Theme' })
  await expect(control).toHaveValue('system')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await control.selectOption('light')
  await page.reload()
  await expect(control).toHaveValue('light')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await control.selectOption('dark')
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await control.selectOption('system')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.reload()
  await expect(control).toHaveValue('system')
  expect(await page.evaluate(k => localStorage.getItem(k), key)).toBe('system')
})

test('tabs synchronize changes, removal and storage clear', async ({ page, context }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  const other = await context.newPage()
  await other.goto('/blog/hello-world/')
  await other.getByRole('combobox', { name: 'Theme' }).selectOption('dark')
  await expect(page.getByRole('combobox', { name: 'Theme' })).toHaveValue('dark')
  await other.evaluate(k => localStorage.removeItem(k), key)
  await expect(page.getByRole('combobox', { name: 'Theme' })).toHaveValue('system')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await other.getByRole('combobox', { name: 'Theme' }).selectOption('light')
  await expect(page.getByRole('combobox', { name: 'Theme' })).toHaveValue('light')
  await other.evaluate(() => localStorage.clear())
  await expect(page.getByRole('combobox', { name: 'Theme' })).toHaveValue('system')
})

for (const saved of ['light', 'dark', 'system', 'invalid']) {
  test(`direct article colors before hydration: ${saved}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.addInitScript(({ key, saved }) => localStorage.setItem(key, saved), { key, saved })
    // Withhold React entirely. The head bootstrap and CSS must suffice.
    await page.route('**/assets/*.js', route => route.abort())
    await page.goto('/blog/001-python-fundamentals/')
    const resolved = saved === 'dark' ? 'dark' : 'light'
    await expect(page.locator('html')).toHaveAttribute('data-theme', resolved)
    await expect(page.getByRole('main')).toHaveCSS('background-color', resolved === 'dark' ? 'rgb(9, 11, 16)' : 'rgb(250, 251, 249)')
    await expect(page.locator('pre').first()).toHaveCSS('background-color', resolved === 'dark' ? 'rgb(18, 21, 28)' : 'rgb(240, 243, 240)')
  })
}

test('blocked storage still allows session selection and system updates', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('blocked') }
    Storage.prototype.setItem = () => { throw new Error('blocked') }
  })
  await page.goto('/')
  const control = page.getByRole('combobox', { name: 'Theme' })
  await control.selectOption('light')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await control.selectOption('system')
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('native theme control supports keyboard, touch-sized mobile and stable layout', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.setViewportSize({ width: 320, height: 740 })
  await page.goto('/blog/hello-world/')
  const control = page.getByRole('combobox', { name: 'Theme' })
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab')
    if (await control.evaluate(el => el === document.activeElement)) break
  }
  await expect(control).toBeFocused()
  await expect(control).toHaveCSS('outline-style', 'solid')
  await expect(control).toHaveCSS('transition-duration', '0s')
  expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  const before = await page.locator('header').boundingBox()
  // Native select keyboard behavior is browser/platform owned.
  await page.keyboard.press('Home')
  await page.keyboard.press('Enter')
  await expect(control).toHaveValue('light')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await control.selectOption('dark')
  expect(await page.locator('header').boundingBox()).toEqual(before)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.reload()
  await expect(control).toHaveValue('dark')
  expect(errors).toEqual([])
})
