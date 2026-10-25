import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { visibleFocus } from './helpers/accessibility'

const articles = (JSON.parse(readFileSync('dist/deployment.json', 'utf8')).routes as { path: string }[]).filter(route => route.path.startsWith('/blog/'))

for (const theme of ['light', 'dark'] as const) {
  test(`article navigation supports keyboard, canonical routes and ${theme} layout`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    for (const article of articles) {
      await page.goto(article.path)
      const nav = page.getByRole('navigation', { name: 'Article navigation', exact: true })
      await expect(nav).toBeVisible()
      const links = nav.getByRole('link')
      for (const link of await links.all()) {
        await expect(link).toHaveAccessibleName(/^(Previous|Next) article .+/)
        expect(articles.map(article => article.path)).toContain(await link.getAttribute('href'))
      }
      await nav.scrollIntoViewIfNeeded()
      await links.first().focus()
      await visibleFocus(links.first())
      if (await links.count() === 2) {
        await page.keyboard.press('Tab')
        await expect(links.nth(1)).toBeFocused()
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
    }
    expect(errors).toEqual([])
    await page.goto(articles[0].path)
    const first = page.getByRole('navigation', { name: 'Article navigation', exact: true }).getByRole('link').first()
    await first.focus()
    const href = await first.getAttribute('href')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(new RegExp(`${href}$`))
  })
}

test('article navigation follows static links with JavaScript disabled', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
  const page = await context.newPage()
  await page.goto(articles[0].path)
  const link = page.getByRole('navigation', { name: 'Article navigation', exact: true }).getByRole('link').first()
  const href = await link.getAttribute('href')
  await link.click()
  await expect(page).toHaveURL(new RegExp(`${href}$`))
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await context.close()
})
