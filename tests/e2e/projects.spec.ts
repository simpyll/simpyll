import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { createProjectSelectors, workflowStages, lifecycleStatuses, technologies } from '../../src/projects/schema'
import type { Project } from '../../src/projects/schema'
const projects = JSON.parse(readFileSync('src/generated/projects.json', 'utf8')) as Project[]
test('homepage projects match the shared public manifest after hydration', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto('/')
  const work = page.locator('#work')
  const featured = createProjectSelectors(projects).getFeaturedProjects()
  await expect(work.locator('h3')).toHaveText(featured.map(p => p.title))
  for (const project of featured) {
    await expect(work.getByText(project.summary, {exact:true})).toBeVisible()
    await expect(work.locator('.ui-card').filter({has: page.getByRole('heading', {name:project.title,exact:true})}).getByText(`${workflowStages[project.workflowStage].toUpperCase()} · ${lifecycleStatuses[project.lifecycleStatus]}`, {exact:true})).toBeVisible()
    for (const label of [...project.technologies.map(t => technologies[t]), ...(project.tags ?? [])]) await expect(work.getByText(label,{exact:true})).toBeVisible()
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(errors).toEqual([])
  await work.screenshot({path:testInfo.outputPath('project-cards.png')})
})
test('project metadata is present without JavaScript',async ({browser})=>{
  const context=await browser.newContext({javaScriptEnabled:false})
  const page=await context.newPage()
  await page.goto('/')
  await expect(page.locator('#work h3')).toHaveText(createProjectSelectors(projects).getFeaturedProjects().map(p=>p.title))
  await context.close()
})
