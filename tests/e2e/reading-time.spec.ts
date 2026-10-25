import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
const records = JSON.parse(readFileSync('dist/search-index.json', 'utf8')) as { slug: string; title: string; readingTimeMinutes: number }[]

for (const theme of ['light', 'dark'] as const) {
  test(`reading estimates match across cards and articles: ${theme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    const article = records[0]
    const label = `${article.readingTimeMinutes} min read`
    await page.goto('/blog')
    const card = page.locator('article').filter({ has: page.getByRole('link', { name: article.title, exact: true }) })
    await expect(card.getByText(label, { exact: true })).toBeVisible()
    await card.getByRole('link', { name: article.title, exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/blog/${article.slug}$`))
    await expect(page.locator('article > [data-reveal]').getByText(label, { exact: true })).toBeVisible()
    await page.reload()
    await expect(page.locator('article > [data-reveal]').getByText(label, { exact: true })).toBeVisible()
    await page.goto('/explore')
    const preview = page.locator('article').filter({ has: page.getByRole('link', { name: article.title, exact: true }) })
    await expect(preview.getByText(label, { exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(errors).toEqual([])
  })
}
