import { test, expect } from '@playwright/test'

const routes = ['/', '/blog', '/blog/hello-world', '/projects', '/projects/simpyll', '/about', '/404']
for (const javaScriptEnabled of [true, false]) {
  test.describe(javaScriptEnabled ? 'SEO after hydration' : 'SEO without JavaScript', () => {
    test.use({ javaScriptEnabled })
    test('representative templates retain metadata, readable content and crawlable links', async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', error => errors.push(error.message))
      page.on('console', message => { if (/hydrati|Minified React error/i.test(message.text())) errors.push(message.text()) })
      for (const route of routes) {
        await page.goto(route)
        await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeVisible()
        await expect(page.locator('main h1')).toHaveCount(1)
        await expect(page.locator('title')).toHaveCount(1)
        await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /\S/)
        if (route === '/404') {
          await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
          await expect(page.locator('link[rel="canonical"]')).toHaveCount(0)
        } else {
          await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://simpyll.com${route}`)
          await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', `https://simpyll.com${route}`)
          await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', await page.title())
        }
        await expect(page.locator('a[href="/blog"]').first()).toBeAttached()
        if (route === '/blog/hello-world') await expect(page.locator('.article-content')).toContainText('Every website starts somewhere')
      }
      expect(errors).toEqual([])
    })
  })
}
