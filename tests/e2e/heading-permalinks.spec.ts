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
  await heading.focus()
  await page.keyboard.press('Enter')
  await page.keyboard.press('Tab')
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
