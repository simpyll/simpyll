import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import process from 'node:process'

test('existing article displays original date without invented update or history', async ({ page }) => {
  await page.goto('/blog/hello-world/')
  await expect(page.locator('.article-metadata')).toContainText('Published')
  await expect(page.locator('.article-metadata')).not.toContainText('Updated')
  await expect(page.locator('.editorial-history')).toHaveCount(0)
  const schemas = await page.locator('script[type="application/ld+json"]').allTextContents()
  const article = schemas.map(s => JSON.parse(s)).find(s => s['@type'] === 'BlogPosting')
  expect(article.dateModified).toBeUndefined()
})

for (const slug of ['editorial-fixture', 'notion-fixture']) {
  for (const theme of ['light', 'dark'] as const) {
    test(`${slug} editorial dates, anchors and static disclosures in ${theme}`, async ({ browser, baseURL }, info) => {
      test.skip(!process.env.EDITORIAL_FIXTURE, 'Uses the existing isolated Notion integration build')
      for (const javaScriptEnabled of [true, false]) {
        const context = await browser.newContext({ baseURL, javaScriptEnabled, colorScheme: theme, reducedMotion: 'reduce', viewport: info.project.use.viewport })
        const page = await context.newPage()
        const errors: string[] = []
        page.on('pageerror', error => errors.push(error.message))
        await page.goto(`/blog/${slug}/`)
        await expect(page.locator('.article-metadata')).toContainText('Published October 20, 2026')
        await expect(page.locator('.article-metadata')).toContainText('Updated October 25, 2026')
        await expect(page.locator('.article-metadata time')).toHaveCount(2)
        await expect(page.getByRole('heading', { name: 'Revision history' })).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Editorial corrections' })).toBeVisible()
        await expect(page.locator('.editorial-history ol li')).toHaveCount(2)
        const link = page.getByRole('link', { name: /Correction — October 24, 2026/ })
        if (javaScriptEnabled) { await link.focus(); await expect(link).toBeFocused(); await page.keyboard.press('Enter') }
        else await link.click()
        await expect(page).toHaveURL(/#editorial-correction-hydration$/)
        await expect(page.locator('#editorial-correction-hydration')).toBeInViewport()
        const ids = await page.locator('[id]').evaluateAll(nodes => nodes.map(n => n.id))
        expect(new Set(ids).size).toBe(ids.length)
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
        const schemas = await page.locator('script[type="application/ld+json"]').allTextContents()
        const articles = schemas.map(s => JSON.parse(s)).filter(s => s['@type'] === 'BlogPosting')
        expect(articles).toHaveLength(1)
        expect(articles[0]).toMatchObject({ datePublished: '2026-10-20', dateModified: '2026-10-25' })
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://simpyll.com/blog/${slug}`)
        // axe uses page timers, which browsers suppress when JavaScript is disabled.
        // Scan the full hydrated document; retain all static no-JS assertions below.
        if (javaScriptEnabled) expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
        if (javaScriptEnabled) {
          await page.locator('.article-metadata').screenshot({ path: info.outputPath(`metadata-${slug}-${theme}.png`) })
          await page.locator('.editorial-history').first().screenshot({ path: info.outputPath(`corrections-${slug}-${theme}.png`) })
          await page.locator('.editorial-history').last().screenshot({ path: info.outputPath(`revisions-${slug}-${theme}.png`) })
        }
        await page.emulateMedia({ media: 'print' })
        await expect(page.locator('#editorial-correction-hydration')).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Revision history' })).toBeVisible()
        await expect(page.locator('.editorial-history p').first()).toHaveCSS('color', 'rgb(24, 37, 31)')
        if (javaScriptEnabled && info.project.name === 'desktop-chromium') await page.pdf({ path: info.outputPath(`${slug}-${theme}.pdf`), format: 'A4', printBackground: false })
        expect(errors).toEqual([])
        await context.close()
      }
    })
  }
}
test('same-day editorial date does not duplicate the visible date', async ({ page }) => {
  test.skip(!process.env.EDITORIAL_FIXTURE, 'Isolated fixture only')
  await page.goto('/blog/editorial-same-day/')
  await expect(page.locator('.article-metadata time')).toHaveCount(1)
  await expect(page.locator('.article-metadata')).not.toContainText('Updated')
  await expect(page.locator('.editorial-history')).toHaveCount(0)
})
