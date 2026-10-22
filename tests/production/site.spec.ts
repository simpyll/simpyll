import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import process from 'node:process'
import { collectBrowserErrors } from '../../scripts/smoke/core.mjs'

interface Route { path: string; title: string; body?: string; date?: string }
const report = JSON.parse(readFileSync('artifacts/production/http.json', 'utf8')) as { result: string; observed: string; routes: Route[] }
const articles = report.routes.filter(route => route.body).sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '') || a.path.localeCompare(b.path))
const sample = [...new Map([articles[0], articles.at(-1)].filter((x): x is Route => !!x).map(x => [x.path, x])).values()]

test('public release hydrates, navigates and renders established and newest articles', async ({ page, baseURL }, testInfo) => {
  expect(report.result).toBe('passed')
  const errors: string[] = collectBrowserErrors(page, new URL(baseURL!).origin)
  const documents: string[] = []
  page.on('request', request => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documents.push(request.url()) })
  try {
    await page.goto('/')
    const initialDocuments = documents.length
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(report.routes[0].title)
    await page.getByRole('link', { name: 'Read the journal' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(report.routes.find(x => x.path === '/blog')!.title)
    expect(documents.length, 'Hydrated journal navigation must not fall back to a document reload').toBe(initialDocuments)
    for (const article of sample) {
      await page.locator(`main a[href="${article.path}"]`).click()
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(article.title)
      await expect(page.locator('article .prose')).toContainText(article.body!)
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://simpyll.com${article.path}`)
      // Direct requests test route-specific hydration independently of client navigation.
      await page.reload()
      await expect(page.locator('article .prose')).toBeVisible()
      await expect(page.locator('article .prose')).toContainText(article.body!)
      await page.getByRole('link', { name: 'Back to journal' }).click()
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(report.routes.find(x => x.path === '/blog')!.title)
    }
    await page.goto('/blog/__production-smoke-missing__')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found.')
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0)
    await page.getByRole('link', { name: 'Back to journal' }).click()
    await expect(page.locator('main a[href^="/blog/"]').first()).toBeVisible()
    const identity = await page.request.get('/deployment.json')
    expect((await identity.json()).sha, 'Deployment changed during browser verification; rerun for current release').toBe(process.env.SMOKE_EXPECTED_SHA ?? report.observed)
    expect(errors, 'Fatal application, hydration or required asset errors').toEqual([])
  } finally {
    await testInfo.attach('browser-errors', { body: JSON.stringify(errors, null, 2), contentType: 'application/json' })
  }
})
