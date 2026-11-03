import { test, expect } from '@playwright/test'
import { ready, scan, visibleFocus } from './helpers/accessibility'
import { destination } from './helpers/navigation'

const article = '/blog/why-simpyll'

for (const theme of ['light', 'dark'] as const) {
  test(`back to top: visibility, keyboard, reflow and theme ${theme}`, async ({ page }, info) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (/hydration|Minified React error/i.test(message.text())) errors.push(message.text()) })
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
    await page.goto(article)
    await ready(page)
    const button = page.getByRole('button', { name: 'Back to top', exact: true })
    await expect(button).toBeHidden()
    await page.evaluate(() => scrollTo({ top: innerHeight + 150, behavior: 'instant' }))
    await expect(button).toBeVisible()
    const box = await button.boundingBox()
    expect(box!.width).toBeGreaterThanOrEqual(44)
    expect(box!.height).toBeGreaterThanOrEqual(44)
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    // Enter actual keyboard focus via Shift+Tab from the following sentinel.
    await page.evaluate(() => {
      const sentinel = document.createElement('button')
      sentinel.id = 'test-after-top'
      sentinel.textContent = 'Test sentinel'
      document.querySelector('.back-to-top')!.after(sentinel)
      sentinel.focus({ preventScroll: true })
    })
    await page.keyboard.press('Shift+Tab')
    await visibleFocus(button)
    await page.evaluate(() => document.getElementById('test-after-top')!.remove())
    await scan(page, info, `back-to-top-${theme}`)
    await page.screenshot({ path: info.outputPath(`back-to-top-${theme}.png`) })
    await info.attach(`back-to-top-${theme}`, { path: info.outputPath(`back-to-top-${theme}.png`), contentType: 'image/png' })
    const url = page.url()
    const historyLength = await page.evaluate(() => history.length)
    await page.keyboard.press('Enter')
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0)
    await expect(page.locator('main h1')).toBeFocused()
    await expect(button).toBeHidden()
    expect(page.url()).toBe(url)
    expect(await page.evaluate(() => history.length)).toBe(historyLength)
    await page.evaluate(() => scrollTo({ top: innerHeight + 150, behavior: 'instant' }))
    await expect(button).toBeVisible()
    await button.focus()
    await page.keyboard.press('Space')
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0)
    await expect(page.locator('main h1')).toBeFocused()
    await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }))
    await expect(button).toBeHidden()
    await page.emulateMedia({ media: 'print' })
    await expect(button).toBeHidden()
    expect(errors).toEqual([])
  })
}

test('back to top preserves route history and short-page behavior', async ({ page }) => {
  await page.goto(article)
  await ready(page)
  await page.evaluate(() => scrollTo({ top: innerHeight + 150, behavior: 'instant' }))
  const button = page.getByRole('button', { name: 'Back to top', exact: true })
  await expect(button).toBeVisible()
  const position = await page.evaluate(() => scrollY)
  await (await destination(page, 'Journal')).click()
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0)
  await expect(button).toBeHidden()
  await page.goBack()
  await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(position, 0)
  await expect(button).toBeVisible()
  await page.goForward()
  await expect(button).toBeHidden()
  await page.goto('/contact')
  await ready(page)
  await page.setViewportSize({ width: 1440, height: 2000 })
  await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }))
  await expect(button).toBeHidden()
})

test('back to top honors motion preference and modal isolation', async ({ page }) => {
  await page.goto(article)
  await ready(page)
  const button = page.getByRole('button', { name: 'Back to top', exact: true })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.evaluate(() => {
    const original = window.scrollTo.bind(window)
    window.scrollTo = ((options: ScrollToOptions) => {
      document.documentElement.dataset.lastScrollBehavior = options.behavior
      original(options)
    }) as typeof window.scrollTo
    scrollTo({ top: innerHeight + 150, behavior: 'instant' })
  })
  await expect(button).toBeVisible()
  await button.click()
  await expect(page.locator('html')).toHaveAttribute('data-last-scroll-behavior', 'smooth')
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.evaluate(() => scrollTo({ top: innerHeight + 150, behavior: 'instant' }))
  await expect(button).toBeVisible()
  // Disposable browser-only image exercises the real ArticleImages/ImageDialog path.
  // No fixture or editorial content is published.
  await page.evaluate(() => {
    const paragraph = [...document.querySelectorAll('.article-content p')].find(p => {
      const box = p.getBoundingClientRect()
      return box.top > 150 && box.bottom < innerHeight - 150
    })!
    const figure = document.createElement('figure')
    figure.innerHTML = '<img src="/icon.svg" alt="Back to top isolation fixture" width="44" height="44">'
    paragraph.after(figure)
  })
  await page.getByRole('button', { name: 'Enlarge image: Back to top isolation fixture', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Enlarged image' })).toBeVisible()
  await expect(button).toBeHidden()
  await page.keyboard.press('Escape')
  await expect(button).toBeVisible()
  await button.click()
  await expect(page.locator('html')).toHaveAttribute('data-last-scroll-behavior', 'instant')
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0)
})

test('back to top fits 320 pixels and leaves no inactive control without JavaScript', async ({ page, browser }) => {
  await page.setViewportSize({ width: 320, height: 700 })
  await page.goto(article)
  await ready(page)
  await page.evaluate(() => scrollTo({ top: innerHeight + 150, behavior: 'instant' }))
  const button = page.getByRole('button', { name: 'Back to top', exact: true })
  await expect(button).toBeVisible()
  const box = await button.boundingBox()
  expect(box!.x + box!.width).toBeLessThanOrEqual(320)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320)
  const context = await browser.newContext({ javaScriptEnabled: false })
  try {
    const staticPage = await context.newPage()
    await staticPage.goto(page.url())
    await expect(staticPage.locator('main h1')).toBeVisible()
    await expect(staticPage.getByRole('button', { name: 'Back to top', exact: true })).toBeHidden()
  } finally { await context.close() }
})
