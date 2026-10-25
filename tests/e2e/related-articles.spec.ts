import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { scan, visibleFocus } from './helpers/accessibility'
import { navigationReady } from './helpers/navigation'

const articles = JSON.parse(readFileSync('dist/deployment.json', 'utf8')).routes.filter((route: { path: string }) => route.path.startsWith('/blog/')) as { path: string }[]
for (const theme of ['light', 'dark'] as const) {
  test(`related articles have canonical links, keyboard focus and accessible ${theme} layout`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme: theme })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(articles[0].path)
    await navigationReady(page)
    const section = page.getByRole('region', { name: 'Related Articles', exact: true })
    await expect(section).toBeVisible()
    const links = section.getByRole('heading', { level: 3 }).getByRole('link')
    expect(await links.count()).toBe(Math.min(3, articles.length - 1))
    const hrefs = await links.evaluateAll(nodes => nodes.map(node => node.getAttribute('href')))
    expect(new Set(hrefs).size).toBe(hrefs.length)
    expect(hrefs).not.toContain(articles[0].path)
    for (const href of hrefs) expect(articles.map(article => article.path)).toContain(href)
    await expect(page.getByRole('navigation', { name: 'Article navigation', exact: true })).toBeVisible()
    await links.first().focus()
    await visibleFocus(links.first())
    await page.keyboard.press('Tab')
    await visibleFocus(page.locator(':focus'))
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
    await scan(page, info, `related-${theme}`)
    await links.first().focus()
    const href = await links.first().getAttribute('href')
    const title = await links.first().textContent()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(new RegExp(`${href}$`))
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title!)
    expect(errors).toEqual([])
  })
}

test('related articles work without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
  const page = await context.newPage()
  await page.goto(articles[0].path)
  const link = page.getByRole('region', { name: 'Related Articles', exact: true }).getByRole('heading', { level: 3 }).getByRole('link').first()
  const href = await link.getAttribute('href')
  await link.click()
  await expect(page).toHaveURL(new RegExp(`${href}$`))
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await context.close()
})
