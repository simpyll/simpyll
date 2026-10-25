import { test, expect } from '@playwright/test'
import { destination } from './helpers/navigation'

for (const theme of ['light', 'dark'] as const) {
  test(`footer composition and accessible social links: ${theme}`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme: theme })
    await page.goto('/')
    const footer = page.getByRole('contentinfo')
    await expect(footer.getByRole('link', { name: 'simpyll.' })).toBeVisible()
    await expect(footer).toContainText('©')
    await expect(footer.getByRole('heading', { name: "Let's Connect" })).toBeVisible()
    await expect(footer.getByRole('button')).toHaveCount(0)
    await expect(footer.getByRole('link', { name: 'Projects', exact: true })).toHaveCount(0)
    await expect(footer).not.toContainText('Clinical roots')
    for (const [name, url] of [['GitHub', 'https://github.com/simpyll'], ['LinkedIn', 'https://www.linkedin.com/in/david-becker-rn-ccrn'], ['X (Twitter)', 'https://x.com/simpyll']]) {
      const link = footer.getByRole('link', { name, exact: true })
      await expect(link).toHaveAttribute('href', url)
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
      await expect(link.locator('svg')).toHaveAttribute('aria-hidden', 'true')
      await link.focus()
      expect(await link.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none')
    }
    await footer.scrollIntoViewIfNeeded()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await footer.screenshot({ path: info.outputPath(`footer-${theme}.png`) })
    await info.attach(`footer-${theme}`, { path: info.outputPath(`footer-${theme}.png`), contentType: 'image/png' })
  })
}

test('contextual contribution sources and client navigation', async ({ page }) => {
  await page.goto('/')
  const action = page.getByRole('contentinfo').getByRole('link', { name: /GitHub/ }).filter({ hasText: /Edit|Suggest/ })
  await expect(action).toHaveAttribute('href', /edit\/main\/src\/pages\/Home.tsx$/)
  await (await destination(page, 'Journal')).click()
  await expect(action).toHaveAttribute('href', /edit\/main\/src\/pages\/Blog.tsx$/)
  await page.goto('/blog/hello-world')
  await expect(action).toHaveAttribute('href', /edit\/main\/src\/content\/blog\/hello-world.mdx$/)
  await page.goto('/blog/why-simpyll')
  const href = await action.getAttribute('href')
  const url = new URL(href!)
  expect(url.pathname).toBe('/simpyll/simpyll/issues/new')
  expect(url.searchParams.get('page-url')).toBe('https://simpyll.com/blog/why-simpyll')
  expect(url.searchParams.get('title')).toContain('Why Simpyll?')
  expect(href).not.toContain('403b3577')
  await page.goto('/projects/simpyll')
  await expect(action).toHaveAttribute('href', /edit\/main\/content\/case-studies\/simpyll.json$/)
  await page.goto('/about')
  await expect(action).toHaveAttribute('href', /edit\/main\/src\/content\/profile.ts$/)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (/hydration|hydrated|server rendered|Minified React error/i.test(message.text())) errors.push(message.text())
  })
  const failedAssets: string[] = []
  page.on('response', response => {
    if (response.status() >= 400 && response.request().resourceType() !== 'document') failedAssets.push(response.url())
  })
  // A missing document must return 404; Chromium logs that expected status.
  const response = await page.goto('/missing-page')
  expect(response?.status()).toBe(404)
  await expect.poll(async () => new URL((await action.getAttribute('href'))!).searchParams.get('page-url')).toBe('https://simpyll.com/missing-page')
  expect(errors).toEqual([])
  expect(failedAssets).toEqual([])
})
