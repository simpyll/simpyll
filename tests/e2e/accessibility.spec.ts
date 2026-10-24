import { test as base, expect } from '@playwright/test'
import { readdirSync } from 'node:fs'
import { ready, scan, tabTo, visibleFocus } from './helpers/accessibility'

const test = base.extend<{ health: void }>({
  health: [async ({ page, context, baseURL }, use) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await context.route('**/*', route => new URL(route.request().url()).origin === baseURL ? route.continue() : route.abort())
    await use()
    expect(errors, 'Hydrated application runtime errors').toEqual([])
  }, { auto: true }],
})
const articles = readdirSync(new URL('../../src/content/blog/', import.meta.url)).filter(f => f.endsWith('.mdx')).map(f => `/blog/${f.slice(0, -4)}`)
for (const theme of ['light', 'dark'] as const) {
  test.describe(theme, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme })
      await page.addInitScript(theme => localStorage.setItem('simpyll-theme', theme), theme)
    })
    for (const route of ['/', '/blog', '/about', '/projects', '/projects/ai-engineering', ...articles, '/accessibility-missing-page']) {
      test(`hydrated route ${route}`, async ({ page }, info) => {
        await page.goto(route)
        await ready(page)
        await expect(page.locator('html')).toHaveAttribute('lang', 'en-US')
        await expect(page).toHaveTitle(/\S/)
        await expect(page.getByRole('main')).toHaveCount(1)
        await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()
        await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
        const ids = await page.locator('[id]').evaluateAll(elements => elements.map(el => el.id))
        expect(ids.filter((id, index) => ids.indexOf(id) !== index), 'Duplicate document IDs').toEqual([])
        await scan(page, info, 'route')
      })
    }
    test('search results, empty state and navigation overflow', async ({ page }, info) => {
      await page.goto('/blog')
      await ready(page)
      const more = page.getByRole('button', { name: 'More', exact: true })
      if (await more.isVisible()) {
        await more.click()
        await scan(page, info, 'navigation-expanded')
        await page.keyboard.press('Escape')
      }
      await tabTo(page, page.getByRole('button', { name: 'Open search' }))
      await page.keyboard.press('Enter')
      const input = page.getByRole('combobox', { name: 'Search articles' })
      await visibleFocus(input)
      await input.fill('python')
      await expect(page.getByRole('option').first()).toBeVisible()
      await expect(page.getByRole('status')).toContainText('result')
      await page.keyboard.press('ArrowDown')
      await expect(page.getByRole('option').first()).toHaveAttribute('aria-selected', 'true')
      await expect(input).toHaveAttribute('aria-activedescendant', await page.getByRole('option').first().getAttribute('id') as string)
      await scan(page, info, 'search-results')
      await input.fill('unmatchedaccessibilityquery')
      await expect(page.getByRole('status')).toHaveText('No matching articles.')
      await scan(page, info, 'search-empty')
      await page.keyboard.press('Escape')
      await visibleFocus(page.getByRole('button', { name: 'Open search' }))
      await expect(input).toBeHidden()
      await page.keyboard.press('Space')
      await input.fill('my first cli tool')
      const targetArticle = page.getByRole('option').filter({ hasText: 'Learning Python #001:' })
      await expect(targetArticle).toHaveCount(1)
      await targetArticle.click()
      await expect(page).toHaveURL(/\/blog\/001-python-fundamentals/)
      await expect(page.getByRole('heading', { level: 1 })).toBeFocused()
      // The new category link precedes the focused article title, then Back.
      await page.keyboard.press('Shift+Tab')
      const category = page.locator('article a[href^="/explore?category="]').first()
      await expect(category).toBeFocused()
      await visibleFocus(category)
      await page.keyboard.press('Shift+Tab')
      await expect(page.getByRole('link', { name: /Back to/ }).first()).toBeFocused()
      await visibleFocus(page.getByRole('link', { name: /Back to/ }).first())
      await page.keyboard.press('Enter')
      await expect(page).toHaveURL('/blog')
      await expect(page.getByRole('heading', { level: 1 })).toBeFocused()
    })
  })
}

for (const motion of ['reduce', 'no-preference'] as const) {
  test(`keyboard order, theme focus and escape without traps: ${motion}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: motion, colorScheme: 'light' })
    await page.goto('/')
    await ready(page)
    const skip = page.getByRole('link', { name: 'Skip to content' })
    await page.keyboard.press('Tab')
    await visibleFocus(skip)
    await page.keyboard.press('Tab')
    const toggle = page.getByRole('button', { name: 'Switch to dark theme' })
    await visibleFocus(toggle)
    await page.keyboard.press('Shift+Tab')
    await visibleFocus(skip)
    await page.keyboard.press('Tab')
    await page.keyboard.press('Space')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.locator('html')).not.toHaveAttribute('data-theme-transition')
    await visibleFocus(page.getByRole('button', { name: 'Switch to light theme' }))
    await page.keyboard.press('Enter')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(page.locator('html')).not.toHaveAttribute('data-theme-transition')
    await page.evaluate(() => window.scrollTo(0, 300))
    await tabTo(page, page.getByRole('button', { name: 'Open search' }))
    await page.keyboard.press('Enter')
    await visibleFocus(page.getByRole('combobox'))
    await page.keyboard.press('Tab')
    await visibleFocus(page.getByRole('button', { name: 'Close search' }))
    await page.keyboard.press('Escape')
    await visibleFocus(page.getByRole('button', { name: 'Open search' }))
    for (const name of ['GitHub', 'LinkedIn', 'X (Twitter)']) {
      await tabTo(page, page.getByRole('contentinfo').getByRole('link', { name, exact: true }))
    }
    await tabTo(page, page.getByRole('contentinfo').getByRole('link', { name: 'Edit this page on GitHub' }))
  })
}

test('iPhone-sized enlarged text reflows with usable search and targets', async ({ page }, info) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  await ready(page)
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
  await ready(page)
  await page.getByRole('button', { name: 'Open search' }).click()
  await page.getByRole('combobox').fill('python')
  await expect(page.getByRole('option').first()).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  for (const control of await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button').all()) {
    if (!await control.isVisible()) continue
    const box = (await control.boundingBox())!
    expect(box.width).toBeGreaterThanOrEqual(24)
    expect(box.height).toBeGreaterThanOrEqual(24)
  }
  const input = page.getByRole('combobox')
  await input.focus()
  await page.keyboard.press('Tab')
  await visibleFocus(page.getByRole('button', { name: 'Close search' }))
  await page.keyboard.press('Tab')
  const panel = page.getByRole('region', { name: 'Article search results' })
  await visibleFocus(panel)
  await page.keyboard.press('ArrowDown')
  await expect.poll(() => panel.evaluate(el => el.scrollTop)).toBeGreaterThan(0)
  await scan(page, info, 'enlarged-mobile-search')
  await page.keyboard.press('Escape')
  await visibleFocus(page.getByRole('button', { name: 'Open search' }))
})
