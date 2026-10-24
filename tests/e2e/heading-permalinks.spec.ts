import { test, expect } from '@playwright/test'
import { scan } from './helpers/accessibility'

test('editorial headings stay clean through hover, keyboard and theme changes', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto('/blog/hello-world')
  await page.locator('[data-nav-ready="true"]').waitFor()
  const heading = page.locator('#why-i-built-this')
  await expect(heading).toHaveText('Why I Built This')
  const removed = page.locator('.heading-actions, .heading-feedback, .heading-permalink, button[aria-label^="Copy link"], input[aria-label^="Section URL"]')
  await expect(removed).toHaveCount(0)
  await heading.hover()
  await expect(removed).toHaveCount(0)
  // Plain headings are not Tab stops. Use the real TOC navigation path to
  // establish fragment focus before checking the next keyboard destination.
  const mobileToc = page.locator('.toc-mobile summary')
  if (await mobileToc.isVisible()) await mobileToc.click()
  const toc = page.getByRole('navigation', { name: 'On this page', exact: true }).filter({ visible: true })
  await toc.locator('a[href="#why-i-built-this"]').focus()
  await page.keyboard.press('Enter')
  await expect(heading).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.locator('.skip-link')).not.toBeFocused()
  await expect(removed).toHaveCount(0)
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme)
    await scan(page, testInfo, `headings-${theme}`)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await heading.scrollIntoViewIfNeeded()
    await page.screenshot({ path: testInfo.outputPath(`headings-${theme}.png`) })
  }
  expect(errors).toEqual([])
})

test('direct fragments work without JavaScript and heading toolbars', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto(`${baseURL}/blog/hello-world#whats-next`)
  await expect(page.locator('#whats-next')).toBeInViewport()
  await expect(page.locator('.heading-actions, .heading-feedback')).toHaveCount(0)
  await context.close()
})

test('Notion H2–H4 retain semantic IDs without hover or focus controls', async ({ page }, testInfo) => {
  await page.goto('/blog/a-hospital-is-the-most-complicated-computer-ive-ever-used')
  await page.locator('[data-nav-ready="true"]').waitFor()
  for (const level of [2, 3, 4]) {
    const heading = page.locator(`.article-content h${level}`).first()
    await expect(heading).toHaveAttribute('id', /.+/)
    await heading.hover()
    await heading.focus()
    await page.keyboard.press('Tab')
    await expect(page.locator('.heading-actions, .heading-feedback, .heading-permalink')).toHaveCount(0)
    await expect(heading.locator('button, svg, input, [role="status"]')).toHaveCount(0)
  }
  const heading = page.locator('.article-content h4').first()
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme)
    await heading.scrollIntoViewIfNeeded()
    await expect(heading).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`notion-h4-${theme}.png`) })
  }
})
