import { test, expect } from '@playwright/test'
import process from 'node:process'

// The isolated Notion build test creates these real historical URLs through sync
// and the full production pipeline; fixtures never ship in production content.
test.describe('published slug history', () => {
  test.skip(process.env.REDIRECT_FIXTURE !== '1', 'Run npm run test:notion:build for the isolated production redirect fixture')
  test('direct aliases, trailing slash, client navigation and back/forward reach canonical content', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    // Stubs use the actual production canonical origin. Serve its bytes from the
    // local production build, with no requests to the live website.
    await page.route('https://simpyll.com/**', async route => {
      const url = new URL(route.request().url())
      await route.fulfill({ response: await route.fetch({ url: new URL(`${url.pathname}${url.search}`, test.info().project.use.baseURL).href }) })
    })
    for (const alias of ['notion-original', 'notion-middle/']) {
      await page.goto(`/blog/${alias}`)
      await expect(page).toHaveURL('https://simpyll.com/blog/notion-fixture')
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Notion fixture article')
      await expect(page.getByRole('navigation', { name: 'Breadcrumb', exact: true }).locator('[aria-current="page"]')).toHaveText('Notion fixture article')
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://simpyll.com/blog/notion-fixture')
    }
    await page.goto('/blog/notion-fixture')
    // Keep Notion-image browser coverage independent of live editorial posts.
    const image = page.locator('article figure img').first()
    await expect(image).toHaveAttribute('src', /^\/images\/optimized\/.+\.png$/)
    await image.scrollIntoViewIfNeeded()
    await expect.poll(() => image.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.evaluate(() => {
      history.pushState({}, '', '/blog/notion-original?source=bookmark#main-content')
      dispatchEvent(new PopStateEvent('popstate'))
    })
    await expect(page).toHaveURL(/\/blog\/notion-fixture\?source=bookmark#main-content$/)
    await page.goBack()
    await expect(page).toHaveURL(/\/blog\/notion-fixture$/)
    await page.goForward()
    await expect(page).toHaveURL(/\/blog\/notion-fixture\?source=bookmark#main-content$/)
    expect(errors).toEqual([])
  })
})
