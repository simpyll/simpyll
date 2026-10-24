import { test, expect, type Page } from '@playwright/test'

const key = 'simpyll-theme'
async function choose(page: Page, theme: 'light' | 'dark') {
  if (await page.locator('html').getAttribute('data-theme') !== theme)
    await page.getByRole('button', { name: `Switch to ${theme} theme` }).click()
}


test('System defaults follow live OS changes; explicit preferences persist and ignore OS', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme-preference', 'system')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  expect(await page.evaluate(k => localStorage.getItem(k), key)).toBeNull()
  await choose(page, 'light')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme-preference', 'light')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await choose(page, 'dark')
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  expect(await page.evaluate(k => localStorage.getItem(k), key)).toBe('dark')
})

test('tabs synchronize changes, removal and storage clear', async ({ page, context }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  const other = await context.newPage()
  await other.goto('/blog/hello-world/')
  await choose(other, 'dark')
  await expect(page.locator('html')).toHaveAttribute('data-theme-preference', 'dark')
  await other.evaluate(k => localStorage.removeItem(k), key)
  await expect(page.locator('html')).toHaveAttribute('data-theme-preference', 'system')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await choose(other, 'light')
  await expect(page.locator('html')).toHaveAttribute('data-theme-preference', 'light')
  await other.evaluate(() => localStorage.clear())
  await expect(page.locator('html')).toHaveAttribute('data-theme-preference', 'system')
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
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await choose(page, 'light')
  await page.emulateMedia({ colorScheme: 'light' })
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test('native theme control supports keyboard, touch-sized mobile and stable layout', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.setViewportSize({ width: 320, height: 740 })
  await page.goto('/blog/hello-world/')
  const control = page.getByRole('button', { name: /Switch to .* theme/ })
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab')
    if (await control.evaluate(el => el === document.activeElement)) break
  }
  await expect(control).toBeFocused()
  await expect(control).toHaveCSS('outline-style', 'solid')

  expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  const before = await page.locator('header').boundingBox()
  // The first keyboard activation must invert the current OS-resolved theme.
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.keyboard.press('Enter')
  await expect(page.locator('html')).toHaveAttribute('data-theme-preference', 'light')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await choose(page, 'dark')
  expect(await page.locator('header').boundingBox()).toEqual(before)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme-preference', 'dark')
  expect(errors).toEqual([])
})

for (const fallback of ['unsupported', 'webkit', 'reduced']) {
  test(`instant fallback: ${fallback}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: fallback === 'reduced' ? 'reduce' : 'no-preference' })
    await page.addInitScript(mode => {
      if (mode === 'unsupported') Object.defineProperty(document, 'startViewTransition', { value: undefined })
      if (mode === 'webkit') Object.defineProperty(navigator, 'userAgent', { value: 'AppleWebKit Safari' })
    }, fallback)
    await page.goto('/')
    const button = page.getByRole('button', { name: /Switch to .* theme/ })
    await button.focus()
    await page.keyboard.press('Space')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(button).toBeFocused()
    await expect(page.locator('html')).not.toHaveAttribute('data-theme-transition')
  })
}

test('native reveal uses button center, covers corners, serializes clicks and cleans up', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' })
  await page.goto('/blog/hello-world/')
  const button = page.getByRole('button', { name: /Switch to .* theme/ })
  await button.evaluate(el => el.scrollIntoView())
  const box = (await button.boundingBox())!
  await button.click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  // Wait for transition.ready, then hold the reveal while inspecting its geometry.
  // Browser CSS serialization rounds fractional coordinates; compare numerically.
  await page.waitForFunction(() => {
    const animation = document.documentElement.getAnimations({ subtree: true }).find(a =>
      (a.effect as KeyframeEffect)?.pseudoElement === '::view-transition-new(root)')
    if (!animation) return false
    animation.pause()
    return true
  })
  const frames = await page.evaluate(() => {
    const animation = document.documentElement.getAnimations({ subtree: true }).find(a =>
      (a.effect as KeyframeEffect)?.pseudoElement === '::view-transition-new(root)')!
    animation.pause()
    return (animation.effect as KeyframeEffect).getKeyframes().map(k => k.clipPath)
  })
  const origin = String(frames[0]).match(/^circle\(0px at ([\d.]+)px ([\d.]+)px\)$/)
  expect(origin).not.toBeNull()
  expect(Number(origin![1])).toBeCloseTo(box.x + box.width / 2, 2)
  expect(Number(origin![2])).toBeCloseTo(box.y + box.height / 2, 2)
  const radius = Number(String(frames?.[1]).match(/circle\((\d+)px/)?.[1])
  const viewport = page.viewportSize()!
  expect(radius).toBeGreaterThanOrEqual(Math.hypot(Math.max(box.x + box.width / 2, viewport.width - box.x - box.width / 2), Math.max(box.y + box.height / 2, viewport.height - box.y - box.height / 2)))
  await button.evaluate(el => { for (let i = 0; i < 4; i++) (el as HTMLButtonElement).click() })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.evaluate(() => {
    const animation = document.documentElement.getAnimations({ subtree: true }).find(a =>
      (a.effect as KeyframeEffect)?.pseudoElement === '::view-transition-new(root)')
    animation?.finish()
  })
  await expect(page.locator('html')).not.toHaveAttribute('data-theme-transition')
  await button.click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.setViewportSize({ width: 360, height: 740 })
  await expect(page.locator('html')).not.toHaveAttribute('data-theme-transition')
})

for (const system of ['light', 'dark'] as const) {
  test(`first visit follows ${system} without saving; toggle persists across routes`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    await page.emulateMedia({ colorScheme: system })
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('data-theme', system)
    expect(await page.evaluate(k => localStorage.getItem(k), key)).toBeNull()
    const next = system === 'dark' ? 'light' : 'dark'
    await page.getByRole('button', { name: `Switch to ${next} theme` }).click()
    await expect(page.getByRole('button', { name: `Switch to ${system} theme` })).toBeVisible()
    expect(await page.evaluate(k => localStorage.getItem(k), key)).toBe(next)
    await page.getByRole('contentinfo').getByRole('link', { name: 'Projects', exact: true }).click()
    await expect(page).toHaveURL(/\/projects\/?$/)
    await expect(page.locator('html')).toHaveAttribute('data-theme', next)
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', next)
    await page.emulateMedia({ colorScheme: next })
    await page.emulateMedia({ colorScheme: system })
    await expect(page.locator('html')).toHaveAttribute('data-theme', next)
    expect(errors).toEqual([])
  })

  for (const saved of [null, 'light', 'dark', 'system'] as const) {
    test(`before hydration: system ${system}, saved ${saved}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: system })
      if (saved) await page.addInitScript(({ key, saved }) => localStorage.setItem(key, saved), { key, saved })
      await page.route('**/assets/*.js', route => route.abort())
      await page.goto('/')
      const resolved = saved === 'light' || saved === 'dark' ? saved : system
      await expect(page.locator('html')).toHaveAttribute('data-theme', resolved)
      await expect(page.getByRole('main')).toHaveCSS('background-color', resolved === 'dark' ? 'rgb(9, 11, 16)' : 'rgb(250, 251, 249)')
      expect(await page.evaluate(k => localStorage.getItem(k), key)).toBe(saved)
    })
  }
}

test('legacy saved system follows OS and footer retains only its existing content', async ({ page }) => {
  await page.addInitScript(k => localStorage.setItem(k, 'system'), key)
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  const footer = page.getByRole('contentinfo')
  await expect(footer.getByRole('button')).toHaveCount(0)
  await expect(footer.getByText(/theme/i)).toHaveCount(0)
  await expect(footer.getByRole('link')).toHaveCount(2)
  await expect(footer.getByRole('link', { name: 'Projects', exact: true })).toHaveAttribute('href', '/projects')
  await expect(footer.getByRole('link', { name: 'simpyll.' })).toHaveAttribute('href', '/')
  await expect(footer).toContainText('Clinical roots. A learning mindset.')
  await expect(footer).toContainText(/© \d{4} Simpyll/)
})
