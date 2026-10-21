import { test, expect } from '@playwright/test'

test('semantic motion tokens drive CSS and reduced-motion overrides live', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  const tokens = () => page.evaluate(() => {
    const style = getComputedStyle(document.documentElement)
    return ['instant', 'fast', 'normal', 'deliberate', 'expressive'].map(name => { const value = style.getPropertyValue(`--ui-duration-${name}`).trim(); return parseFloat(value) * (value.endsWith('ms') ? 1 : 1000) })
  })
  expect(await tokens()).toEqual([0, 160, 240, 360, 600])
  const nav = page.locator('.ui-nav-link').first()
  await nav.focus()
  await expect(nav).toHaveCSS('outline-style', 'solid')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(await tokens()).toEqual([0, 0, 0, 0, 0])
  await expect(nav).toHaveCSS('transition-duration', '0s')
  await expect(page.locator('[data-reveal]').first()).toHaveCSS('opacity', '1')
  await expect(page.locator('[data-reveal]').first()).toHaveCSS('transform', 'none')
  await expect(page.locator('.ui-hero-word')).toHaveCSS('transform', 'none')
})

test('prerendered reveal content stays visible without JavaScript and with full motion', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, reducedMotion: 'no-preference' })
  const page = await context.newPage()
  await page.goto(baseURL!)
  for (const reveal of await page.locator('[data-reveal]').all()) {
    await expect(reveal).toHaveCSS('opacity', '1')
    await expect(reveal).toHaveCSS('transform', 'none')
  }
  await context.close()
})

test('existing card elevation does not move surrounding layout; reduced motion removes travel', async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  const card = page.locator('#work .ui-card').first()
  await card.scrollIntoViewIfNeeded()
  await expect.poll(() => page.locator('#work [data-reveal]').first().evaluate(el => el.getAnimations().length)).toBe(0)
  expect(await card.evaluate(el => getComputedStyle(el).transitionProperty)).toContain('translate')
  const sibling = page.locator('#work .ui-card').nth(1)
  const layout = () => sibling.evaluate(el => ({ top: (el as HTMLElement).offsetTop, left: (el as HTMLElement).offsetLeft, width: (el as HTMLElement).offsetWidth, height: (el as HTMLElement).offsetHeight }))
  const before = await layout()
  await card.hover()
  if (!isMobile) await expect(card).toHaveCSS('translate', '0px -4px')
  else await expect(card).toHaveCSS('translate', 'none')
  expect(await layout()).toEqual(before)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(card).toHaveCSS('translate', '0px')
})

for (const missing of ['animate', 'IntersectionObserver']) {
  test(`content survives unavailable ${missing} without hydration errors`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => {
      if (message.type() === 'error' && /hydration|hydrating|Minified React error/i.test(message.text())) errors.push(message.text())
    })
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.addInitScript(api => {
      if (api === 'animate') Object.defineProperty(Element.prototype, 'animate', { value: undefined })
      else Object.defineProperty(window, 'IntersectionObserver', { value: undefined })
    }, missing)
    await page.goto('/')
    await expect(page.locator('[data-reveal]').first()).toHaveCSS('opacity', '1')
    await page.getByRole('link', { name: 'Read the journal' }).click()
    await expect(page).toHaveURL('/blog')
    await expect(page.locator('[data-reveal]').first()).toHaveCSS('opacity', '1')
    expect(errors).toEqual([])
  })
}
