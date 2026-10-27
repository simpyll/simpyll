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
      // Reading suggestions may link to the same article. Select its journal card.
      await page.locator(`main article h2 a[href="${article.path}"]`).click()
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(article.title)
      await expect(page.locator('article .prose')).toContainText(article.body!)
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://simpyll.com${article.path}`)
      // Direct requests test route-specific hydration independently of client navigation.
      await page.reload()
      await expect(page.locator('article .prose')).toBeVisible()
      await expect(page.locator('article .prose')).toContainText(article.body!)
      // Articles use breadcrumb navigation; the recovery-only "Back to journal" link
      // belongs to the 404 page, not to a successfully rendered article.
      await page.getByRole('navigation', { name: 'Breadcrumb' }).locator('a[href="/blog"]').click()
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

test('public LipidPath calculates a fictional profile, retains inputs and resets after reload', async ({ page, baseURL }) => {
  const errors = collectBrowserErrors(page, new URL(baseURL!).origin)
  await page.goto('/projects/lipidpath')
  await page.getByRole('link', { name: 'Launch the educational tool', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('LipidPath')
  // Exercise the Pages trailing-slash document and its hydration as well as client navigation.
  await page.goto('/tools/lipidpath/')
  const field = (label: string) => page.getByLabel(label, { exact: true })
  await field('Age (years)').fill('50')
  await page.getByText('Additional health and safety details', { exact: true }).click()
  await field('Current reproductive context').selectOption('none')
  for (const label of ['Established clinical ASCVD?', 'Diabetes?', 'History of untreated LDL-C ≥190 mg/dL?', 'Established CKD stage 3 or higher?', 'Living with HIV?', 'Complex care requiring individual review?']) {
    await field(label).selectOption('false')
  }
  await field('Confirmed familial hypercholesterolemia').selectOption('none')
  await field('Contraindications and drug interactions reviewed?').selectOption('true')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await field('Current LDL-C (mg/dL)').fill('120')
  await page.getByText('More laboratory results (optional)', { exact: true }).click()
  await field('Total cholesterol (optional) (mg/dL)').fill('220')
  await field('HDL-C (optional) (mg/dL)').fill('50')
  await expect(field('Current LDL-C (mg/dL)')).toHaveValue('120')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await field('Current statin intensity').selectOption('none')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await field('10-year PREVENT-ASCVD risk (%)').fill('5')
  await field('These results are from the official PREVENT-ASCVD outcome?').selectOption('true')
  await page.getByRole('button', { name: 'Review guideline results', exact: true }).click()
  await expect(page.getByText('Intermediate 10-year ASCVD risk:', { exact: true })).toBeVisible()
  await expect(page.getByText('below 100 mg/dL', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /Laboratory results$/ }).click()
  await expect(field('Current LDL-C (mg/dL)')).toHaveValue('120')
  await page.getByRole('button', { name: 'Reset all inputs', exact: true }).click()
  await expect(field('Age (years)')).toHaveValue('')
  await page.reload()
  await expect(field('Age (years)')).toHaveValue('')
  expect(errors, 'LipidPath application, hydration and required asset errors').toEqual([])
})
