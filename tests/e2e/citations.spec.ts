import { expect, test } from '@playwright/test'
import { scan, visibleFocus } from './helpers/accessibility'

// This published renderer showcase already contains a real GFM footnote.
const route = '/blog/the-art-of-reading-code/'
test('native citation navigation, themes, responsive layout and print', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(route)
  const marker = page.locator('[data-footnote-ref]').first()
  const backlink = page.locator('[data-footnote-backref]').first()
  await expect(marker).toHaveAccessibleName(/Footnote 1/)
  await marker.focus()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Shift+Tab')
  await visibleFocus(marker)
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#user-content-fn-/)
  await expect(backlink).toHaveAccessibleName(/Back to reference 1/)
  await backlink.click()
  await expect(page).toHaveURL(/#user-content-fnref-/)
  await page.reload()
  await expect(marker).toBeAttached()
  for (const theme of ['light', 'dark']) {
    await page.evaluate(t => document.documentElement.dataset.theme = t, theme)
    await scan(page, info, `citations-${theme}`)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
    await page.locator('[data-footnotes]').screenshot({ path: info.outputPath(`references-${theme}.png`) })
  }
  await page.emulateMedia({ media: 'print' })
  await expect(marker).toBeVisible()
  await expect(page.locator('[data-footnotes]')).toBeVisible()
  await expect(backlink).toBeHidden()
  expect(errors).toEqual([])
})
test('static footnote navigation without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
  const page = await context.newPage()
  await page.goto(route)
  await page.locator('[data-footnote-ref]').first().click()
  await expect(page).toHaveURL(/#user-content-fn-/)
  await page.locator('[data-footnote-backref]').first().click()
  await expect(page).toHaveURL(/#user-content-fnref-/)
  await context.close()
})
