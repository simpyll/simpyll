import { expect, test } from '@playwright/test'
import { scan } from './helpers/accessibility'

test('section links copy canonical URLs and handle denial without movement', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/blog/hello-world/?utm_source=test')
  const heading = page.locator('#why-i-built-this')
  const copy = page.getByRole('button', { name: 'Copy link to Why I Built This section', exact: true })
  await heading.scrollIntoViewIfNeeded()
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (value: string) => { document.body.dataset.copied = value } } }))
  const before = await heading.boundingBox()
  await copy.focus()
  await page.keyboard.press('Space')
  await expect(page.locator('.heading-feedback').first()).toHaveText('Link copied.')
  await expect(page.locator('body')).toHaveAttribute('data-copied', 'https://simpyll.com/blog/hello-world#why-i-built-this')
  await expect(copy).toBeFocused()
  expect(await heading.boundingBox()).toEqual(before)
  for (const unavailable of [false, true]) {
    await page.evaluate(unavailable => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: unavailable ? undefined : { writeText: async () => { throw new Error('denied') } } }), unavailable)
    await copy.click()
    await expect(page.locator('.heading-feedback').first()).toContainText('Could not copy automatically')
    const field = page.getByRole('textbox', { name: 'Section URL for Why I Built This' })
    await expect(field).toHaveValue('https://simpyll.com/blog/hello-world#why-i-built-this')
    await field.focus()
    expect(await field.evaluate(el => (el as HTMLInputElement).selectionEnd)).toBe((await field.inputValue()).length)
  }
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme)
    await scan(page, testInfo, `permalink-${theme}`)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`permalink-${theme}.png`) })
  }
  expect(errors).toEqual([])
})

test('native links and direct fragments work before hydration', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto(`${baseURL}/blog/hello-world`)
  const anchor = page.getByRole('link', { name: 'Link to Why I Built This section', exact: true })
  await expect(anchor).toHaveAttribute('href', '#why-i-built-this')
  await anchor.click()
  await expect(page).toHaveURL(/#why-i-built-this$/)
  await page.goto(`${baseURL}/blog/hello-world#whats-next`)
  await expect(page.locator('#whats-next')).toBeInViewport()
  await context.close()
})
