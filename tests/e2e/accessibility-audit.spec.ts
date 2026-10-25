import { readFileSync } from 'node:fs'
import { test, expect } from '@playwright/test'
import { ready, scan, tabTo, visibleFocus } from './helpers/accessibility'

const policyRoutes = JSON.parse(readFileSync(new URL('../../src/content/policies.json', import.meta.url), 'utf8')).map((p: { slug: string }) => `/${p.slug}`)

// Removing a focused filter must leave focus at a useful, stable control.
test('removing discovery filters preserves keyboard focus', async ({ page }) => {
  await page.goto('/explore?category=python')
  await ready(page)
  const search = page.getByRole('searchbox', { name: 'Search the journal' })
  await tabTo(page, page.getByRole('button', { name: 'Remove category: Python', exact: true }))
  await page.keyboard.press('Enter')
  await expect(search).toBeFocused()
  await visibleFocus(search)
  await expect(page.getByRole('status')).toContainText('articles found.')
})

for (const width of [320, 768, 1280]) {
  for (const route of [...policyRoutes, '/', '/about', '/blog', '/explore', '/projects', '/projects/simpyll', '/projects/ai-engineering', '/blog/001-python-fundamentals', '/audit-missing']) {
    test(`reflow and text spacing at ${width} CSS pixels: ${route}`, async ({ page }, info) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(route)
      await ready(page)
      await page.addStyleTag({ content: '* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }' })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), route).toBe(true)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await scan(page, info, `${width}-${route.replaceAll('/', '-') || 'home'}`)
    })
  }
}
