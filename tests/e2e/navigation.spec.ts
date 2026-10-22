import { destination, navigationReady } from './helpers/navigation'
import { test, expect } from '@playwright/test'

test('floating navigation preserves routes, history, theme and direct loads', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/blog/hello-world')
  const nav = page.getByRole('navigation', { name: 'Main navigation' })
  await expect(await destination(page, 'Journal')).toHaveAttribute('aria-current', 'page')
  await nav.getByRole('link', { name: 'Home', exact: true }).click()
  await expect(page).toHaveURL('/')
  await expect(nav.getByRole('link', { name: 'Home', exact: true })).toHaveAttribute('aria-current', 'page')
  await page.goBack()
  await expect(await destination(page, 'Journal')).toHaveAttribute('aria-current', 'page')
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
  await navigationReady(page)
  await more.focus()
  await page.keyboard.press('Enter')
  await expect(more).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('Escape')
  await expect(more).toBeFocused()
  await expect(more).toHaveAttribute('aria-expanded', 'false')
  await more.click()
  await page.locator('#navigation-overflow').getByRole('link', { name: 'About' }).click()
  await expect(page).toHaveURL('/#about')
  await expect(page.locator('#about')).toBeFocused()
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
  await page.goto('/')
  await navigationReady(page)
  const pill = page.locator('.nav-indicator')
  await expect(pill).toHaveCSS('opacity', '1')
  await expect(pill).toHaveCSS('transition-duration', '0s')
  for (const width of [320, 380, 1280]) {
    await page.setViewportSize({ width, height: 800 })
    for (const theme of ['light', 'dark']) {
      await page.evaluate(value => document.documentElement.dataset.theme = value, theme)
      await expect.poll(async () => {
        const a = await page.locator('.floating-links [aria-current]').boundingBox()
        const b = await pill.boundingBox()
        return Math.abs(a!.x - b!.x) + Math.abs(a!.width - b!.width)
      }).toBeLessThan(2)
      const more = page.getByRole('button', { name: 'More' })
      if (await more.isVisible() && await more.getAttribute('aria-expanded') !== 'true') await more.click()
      await page.screenshot({ path: testInfo.outputPath(`navigation-${width}-${theme}.png`) })
    }
  }
})

const labels = ['Home', 'Projects', 'Journal', 'About']

async function assertPartition(page: import('@playwright/test').Page) {
  const nav = page.getByRole('navigation', { name: 'Main navigation' })
  const primary = await page.locator('.floating-links a').allTextContents()
  const overflow = await page.locator('#navigation-overflow a').allTextContents()
  expect(primary).toEqual(labels.slice(0, primary.length))
  expect(overflow).toEqual(labels.slice(primary.length))
  const more = nav.getByRole('button', { name: 'More' })
  if (overflow.length) {
    await expect(more).toBeVisible()
    if (await more.getAttribute('aria-expanded') !== 'true') await more.click()
  } else await expect(more).toHaveCount(0)
  for (const name of labels) await expect(nav.getByRole('link', { name, exact: true })).toHaveCount(1)
  expect(await nav.getByRole('link').count()).toBe(labels.length)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  for (const control of await nav.locator('a:visible, button:visible').all()) {
    const box = (await control.boundingBox())!
    expect(box.width).toBeGreaterThanOrEqual(44)
    expect(box.height).toBeGreaterThanOrEqual(44)
  }
  return primary.length
}

test('capacity partitions all destinations uniquely and maximally across resize thresholds', async ({ page }) => {
  await page.goto('/')
  await navigationReady(page)
  const counts: number[] = []
  for (const width of [320, 350, 380, 420, 640, 1280, 380, 320]) {
    await page.setViewportSize({ width, height: 800 })
    // Wait until the partition matches the actual measured capacity, not a breakpoint.
    await expect.poll(() => page.evaluate(() => {
      const header = document.querySelector<HTMLElement>('.floating-header')!
      const nav = document.querySelector<HTMLElement>('.floating-nav')!
      const style = getComputedStyle(nav)
      const outer = getComputedStyle(header)
      const gap = parseFloat(style.columnGap)
      const inset = ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth'].reduce((sum, key) => sum + parseFloat(style[key as keyof CSSStyleDeclaration] as string), 0)
      const available = header.getBoundingClientRect().width - parseFloat(outer.paddingLeft) - parseFloat(outer.paddingRight)
      const widths = [...document.querySelectorAll<HTMLElement>('[data-measure-link]')].map(el => el.getBoundingClientRect().width)
      const theme = document.querySelector('.theme-toggle')!.getBoundingClientRect().width
      const more = document.querySelector('[data-measure-more]')!.getBoundingClientRect().width
      const count = document.querySelectorAll('.floating-links a').length
      const used = (n: number) => widths.slice(0, n).reduce((sum, w) => sum + w, 0) + theme + (n < widths.length ? more : 0) + gap * (n + Number(n < widths.length)) + inset
      return (count === 0 || used(count) <= available) && (count === widths.length || used(widths.length) > available && used(count + 1) > available)
    })).toBe(true)
    counts.push(await assertPartition(page))
  }
  expect(new Set(counts).size).toBeGreaterThanOrEqual(2)
  expect(counts).toContain(4)
})

test('text sizing and container width produce More-only layout and restore focus on resize', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  await navigationReady(page)
  const about = page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'About', exact: true })
  await about.focus()
  await page.setViewportSize({ width: 320, height: 800 })
  const more = page.getByRole('button', { name: 'More' })
  await expect(more).toBeFocused()
  await more.click()
  await about.focus()
  await page.setViewportSize({ width: 1280, height: 800 })
  await expect(more).toHaveCount(0)
  await expect(about).toBeFocused()
  // Simulates a constrained embedding/container independently of viewport breakpoints.
  await page.locator('.floating-header').evaluate(el => el.style.width = '190px')
  await expect(page.locator('.floating-links a')).toHaveCount(0)
  await assertPartition(page)
  await page.locator('.floating-header').evaluate(el => el.style.width = '')
  await expect(page.locator('.floating-links a')).toHaveCount(4)
  await page.setViewportSize({ width: 420, height: 800 })
  await page.addStyleTag({ content: '.floating-link { font-size: 2rem; letter-spacing: .1em; }' })
  await expect(page.locator('.floating-links a')).not.toHaveCount(4)
  await assertPartition(page)
})

test('all destinations remain available without JavaScript at 320px', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 800 } })
  const page = await context.newPage()
  await page.goto(baseURL!)
  const nav = page.getByRole('navigation', { name: 'Main navigation' })
  for (const name of labels) await expect(nav.getByRole('link', { name, exact: true })).toBeVisible()
  await expect(nav.getByRole('button', { name: 'More' })).toBeHidden()
  await nav.getByRole('link', { name: 'Journal', exact: true }).click()
  await expect(page).toHaveURL('/blog')
  await context.close()
})
