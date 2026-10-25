import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { workflowStages, lifecycleStatuses, type Project } from '../../src/projects/schema'

const projects = JSON.parse(readFileSync('src/generated/projects.json', 'utf8')) as Project[]
for (const theme of ['light', 'dark'] as const) for (const route of ['/', '/projects?view=grid', ...projects.filter(p => p.caseStudy).map(p => `/projects/${p.slug}`)]) test(`registry status at ${route} in ${theme}`, async ({ page }, info) => {
  await page.emulateMedia({ colorScheme: theme })
  await page.addInitScript(theme => localStorage.setItem('simpyll-theme', theme), theme)
  const featured = projects.filter(p => p.featured.enabled).sort((a,b) => a.featured.order-b.featured.order).slice(0,2)
  await page.goto(route)
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
  if (route.includes('?')) await expect(page.locator('.lab-grid')).toBeVisible()
  const records = route === '/' ? featured : route.includes('?') ? projects : projects.filter(p => route === `/projects/${p.slug}`)
  for (const [index,p] of records.entries()) {
    const status = route === '/' ? page.locator('#work .project-status').nth(index)
      : route.includes('?') ? page.locator(`[data-project="${p.id}"] .project-status`) : page.locator('.case-metadata .project-status')
    await expect(status.locator('dt')).toHaveText(['Workflow stage','Lifecycle'])
    await expect(status.locator('dd')).toHaveText([workflowStages[p.workflowStage], lifecycleStatuses[p.lifecycleStatus]])
    await expect(status.locator('a,button,[tabindex],[role="status"],[aria-live]')).toHaveCount(0)
  }
  // A narrow CSS viewport plus larger type exercises wrapping and text scaling.
  await page.setViewportSize({ width: 320, height: 900 })
  await page.addStyleTag({ content: 'html { font-size: 200% }' })
  for (const status of await page.locator('.project-status').all()) {
    expect(await status.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
    for (const value of await status.locator('dd').all()) {
      const box = await value.boundingBox()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(321)
    }
  }
  await page.screenshot({ path: info.outputPath(`${route.replace(/\W/g, '_')}-${theme}.png`), fullPage: true })
})
