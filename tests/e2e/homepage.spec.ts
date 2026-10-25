import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { parseHTML } from 'linkedom'
import { createProjectSelectors, getCaseStudyPath } from '../../src/projects/schema'
import type { Project } from '../../src/projects/schema'

const featured = createProjectSelectors(JSON.parse(readFileSync('src/generated/projects.json', 'utf8')) as Project[]).getFeaturedProjects()
const { document: staticHome } = parseHTML(readFileSync('dist/index.html', 'utf8'))
const staticWriting = [...staticHome.querySelectorAll('#writing a[href^="/blog/"]')].map(a => ({ href: a.getAttribute('href')!, title: a.querySelector('h3')!.textContent }))

test('editorial homepage preserves content, keyboard destinations and hydration', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  await page.goto('/')
  await expect(page.locator('h1')).toHaveCount(1)
  await expect(page.locator('h1')).toHaveText('From bedside to build.')
  await expect(page.locator('main')).toContainText('David Becker')
  await expect(page.locator('main > section h2, main > section > div h2')).toHaveCount(3)
  for (const [name, href] of [['Explore projects', '/projects'], ['Browse the blog', '/blog'], ['More about me', '/about']]) {
    const link = page.getByRole('link', { name, exact: true })
    await expect(link).toHaveAttribute('href', href)
  }
  const first = page.getByRole('link', { name: 'Explore projects', exact: true })
  await page.locator('main').focus()
  await page.keyboard.press('Tab')
  await expect(first).toBeFocused()
  await expect(first).toHaveCSS('outline-style', 'solid')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL('/projects')
  await page.goBack()
  for (const project of featured) {
    const card = page.locator('#work .ui-card').filter({ has: page.getByRole('heading', { name: project.title, exact: true }) })
    const path = getCaseStudyPath(project)
    if (path) await expect(card.getByRole('link', { name: `View Case Study for ${project.title}` })).toHaveAttribute('href', path)
    else await expect(card.locator('a[href^="/projects/"]')).toHaveCount(0)
    for (const link of project.links) await expect(card.getByRole('link', { name: link.label, exact: true })).toHaveAttribute('href', link.url)
    await expect(card.locator('a a, a button')).toHaveCount(0)
  }
  for (const post of staticWriting) await expect(page.locator(`#writing a[href="${post.href}"] h3`)).toHaveText(post.title!)
  for (const id of ['work', 'writing', 'about']) {
    await page.goto(`/#${id}`)
    await expect(page.locator(`#${id}`)).toBeInViewport()
  }
  expect(errors).toEqual([])
})

for (const theme of ['light', 'dark'] as const) test(`${theme}: narrow layout, enlarged text and review captures`, async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
  await page.evaluate(() => document.fonts.ready)
  await page.locator('#about').scrollIntoViewIfNeeded()
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: testInfo.outputPath(`homepage-${testInfo.project.name}-${theme}.png`), fullPage: true })
  await page.setViewportSize({ width: 320, height: 740 })
  for (const size of ['100%', '200%']) {
    await page.evaluate(value => { document.documentElement.style.fontSize = value }, size)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.getByRole('link', { name: 'Browse the blog', exact: true })).toBeVisible()
  }
})

test('native homepage navigation remains useful without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL, reducedMotion: 'no-preference' })
  const page = await context.newPage()
  await page.goto('/')
  await expect(page.locator('h1')).toBeVisible()
  await page.getByRole('link', { name: 'View Case Study for Simpyll', exact: true }).click()
  await expect(page.locator('h1')).toHaveText('Simpyll.')
  await page.goto('/')
  if (staticWriting.length) {
    await page.locator(`#writing a[href="${staticWriting[0].href}"]`).click()
    await expect(page.locator('h1')).toHaveText(staticWriting[0].title!)
  }
  await context.close()
})
