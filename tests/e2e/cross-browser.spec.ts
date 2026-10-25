import { test as base, expect, type Page } from '@playwright/test'
import { destination, navigationReady } from './helpers/navigation'
import { tabTo, visibleFocus } from './helpers/accessibility'

const test = base.extend<{ health: void }>({
  health: [async ({ page }, use, info) => {
    const errors: string[] = [], consoleMessages: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => {
      if (message.type() === 'error' || message.type() === 'warning') {
        consoleMessages.push(message.text())
        if (/hydrati|Minified React error/i.test(message.text())) errors.push(message.text())
      }
    })
    await use()
    if (errors.length || info.status !== info.expectedStatus) {
      await info.attach('browser-console', { body: JSON.stringify({ project: info.project.name, errors, consoleMessages }, null, 2), contentType: 'application/json' })
    }
    expect(errors, 'Runtime and hydration errors').toEqual([])
  }, { auto: true }],
})

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
}

test('prerender, hydration, client navigation, history and reload', async ({ page, request }) => {
  const response = await request.get('/projects/simpyll')
  expect(response.ok()).toBe(true)
  expect(await response.text()).toMatch(/<h1[^>]*>Simpyll<span/)
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('From bedside to build.')
  await navigationReady(page)
  // A value on window survives SPA navigation but cannot survive a document load.
  await page.evaluate(() => Object.assign(window, { crossBrowserMarker: 'hydrated' }))
  await tabTo(page, page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Home', exact: true }))
  await (await destination(page, 'Projects')).click()
  await expect(page).toHaveURL('/projects')
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused()
  expect(await page.evaluate(() => Reflect.get(window, 'crossBrowserMarker'))).toBe('hydrated')
  await page.goBack()
  await expect(page).toHaveURL('/')
  await page.goForward()
  await expect(page).toHaveURL('/projects')
  await page.goto('/projects/simpyll')
  await navigationReady(page)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await noOverflow(page)
})

test('narrow disclosure supports touch, keyboard, dismissal and fixed navigation', async ({ page, hasTouch }) => {
  await page.setViewportSize({ width: 320, height: 700 })
  await page.goto('/')
  await navigationReady(page)
  const more = page.getByRole('button', { name: 'More', exact: true })
  if (hasTouch) await more.tap()
  else await more.click()
  await expect(more).toHaveAttribute('aria-expanded', 'true')
  // This is a nonmodal disclosure: background content stays usable, no focus trap.
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveAttribute('aria-hidden', 'true')
  await page.keyboard.press('Escape')
  await expect(more).toHaveAttribute('aria-expanded', 'false')
  await visibleFocus(more)
  await more.click()
  const about = page.locator('#navigation-overflow').getByRole('link', { name: 'About', exact: true })
  if (hasTouch) await about.tap()
  else await about.click()
  await expect(page).toHaveURL('/about')
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused()
  await expect(more).toHaveAttribute('aria-expanded', 'false')
  const header = page.locator('.floating-header')
  const before = (await header.boundingBox())!
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight))
  await expect.poll(async () => Math.abs((await header.boundingBox())!.y - before.y)).toBeLessThan(1)
  for (const control of await page.getByRole('navigation', { name: 'Main navigation' }).locator('a:visible,button:visible').all()) {
    const box = (await control.boundingBox())!
    expect(Number((box.width).toFixed(3))).toBeGreaterThanOrEqual(44)
    expect(Number((box.height).toFixed(3))).toBeGreaterThanOrEqual(44)
  }
  await more.click()
  await page.locator('h1').click()
  await expect(more).toHaveAttribute('aria-expanded', 'false')
  await noOverflow(page)
})

test('journal, reading, code, TOC anchors and cold fragments', async ({ page, isMobile }) => {
  await page.goto('/blog')
  await navigationReady(page)
  await page.locator('main a[href="/blog/001-python-fundamentals"]').first().click()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  const target = '#what-i-built-np-program-collector'
  if (isMobile) await page.locator('.toc-mobile summary').click()
  const toc = page.getByRole('navigation', { name: 'On this page', exact: true }).filter({ visible: true })
  await toc.locator(`a[href="${target}"]`).focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(new RegExp(`${target}$`))
  await expect(page.locator(target)).toBeFocused()
  await expect(page.locator(target)).toBeInViewport()
  const header = (await page.locator('.floating-header').boundingBox())!
  await expect.poll(async () => (await page.locator(target).boundingBox())!.y).toBeGreaterThan(header.y + header.height)
  if (!isMobile) {
    await expect(toc).toBeInViewport()
    await expect(toc.locator('[aria-current]')).toHaveAttribute('href', target)
  }
  await expect(page.locator('pre').first()).toBeAttached()
  expect(await page.locator('pre').first().evaluate(el => ['auto', 'scroll'].includes(getComputedStyle(el).overflowX))).toBe(true)
  await noOverflow(page)
  await page.reload()
  await expect(page.locator(target)).toBeFocused()
  await expect(page.locator(target)).toBeInViewport()
})

test('reduced motion keeps reveals, theme, search and project controls usable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await navigationReady(page)
  await expect(page.locator('[data-reveal]').first()).toHaveCSS('opacity', '1')
  await expect(page.locator('[data-reveal]').first()).toHaveCSS('transform', 'none')
  await expect(page.locator('.nav-indicator')).toHaveCSS('transition-duration', '0s')
  expect(await page.locator('html').evaluate(el => getComputedStyle(el).scrollBehavior)).not.toBe('smooth')
  const theme = await page.locator('html').getAttribute('data-theme')
  await page.getByRole('button', { name: /Switch to/ }).click()
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', theme!)
  await expect(page.locator('html')).not.toHaveAttribute('data-theme-transition')
  await page.getByRole('button', { name: 'Open search' }).click()
  const search = page.getByRole('combobox')
  await expect(search).toBeFocused()
  await search.fill('python')
  await expect(page.getByRole('option').first()).toBeVisible()
  await page.keyboard.press('Escape')
  await visibleFocus(page.getByRole('button', { name: 'Open search' }))
  await (await destination(page, 'Projects')).click()
  await page.getByRole('button', { name: 'Grid', exact: true }).click()
  await page.getByLabel('Search projects').fill('Simpyll')
  await expect(page.locator('.lab-grid [data-project]')).toHaveCount(1)
  await page.getByRole('button', { name: 'Reset filters' }).click()
  await expect(page.locator('.lab-grid [data-project]').nth(1)).toBeVisible()
  await noOverflow(page)
})
