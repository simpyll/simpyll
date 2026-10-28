import { test, expect } from '@playwright/test'

test('article images select responsive formats with reserved dimensions and no overflow', async ({ page }, info) => {
  const failures: string[] = []
  page.on('pageerror', e => failures.push(e.message))
  await page.goto('/blog/the-art-of-reading-code/')
  const img = page.locator('article figure picture img').first()
  await expect(img).toHaveAttribute('width', /\d+/)
  await expect(img).toHaveAttribute('height', /\d+/)
  await expect(img).toHaveAttribute('loading', 'eager')
  await img.scrollIntoViewIfNeeded()
  await expect.poll(() => img.evaluate((e: HTMLImageElement) => e.complete && e.naturalWidth > 0)).toBe(true)
  const selected = await img.evaluate((e: HTMLImageElement) => ({ src: e.currentSrc, width: e.getBoundingClientRect().width, ratio: e.getBoundingClientRect().width / e.getBoundingClientRect().height, intrinsic: Number(e.getAttribute('width')) / Number(e.getAttribute('height')) }))
  expect(selected.src).toMatch(/\/images\/optimized\/.+\.(avif|webp)$/)
  expect(selected.ratio).toBeCloseTo(selected.intrinsic, 1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(failures).toEqual([])
  await page.screenshot({ path: info.outputPath('responsive-image.png') })
})

test('responsive article images work without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto(`${baseURL}/blog/the-art-of-reading-code/`)
  const image = page.locator('article picture img').first()
  await image.scrollIntoViewIfNeeded()
  await expect(image).toBeVisible()
  await context.close()
})

test('enlargement reuses responsive candidates and requests the fitted size', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/blog/the-art-of-reading-code/')
  const inline = page.locator('article figure picture img').first()
  const alt = await inline.getAttribute('alt')
  const sources = await inline.locator('..').locator('source').evaluateAll(elements => elements.map(el => el.getAttribute('srcset')))
  await page.getByRole('button', { name: `Enlarge image: ${alt}`, exact: true }).click()
  const dialog = page.getByRole('dialog')
  const enlarged = dialog.getByRole('img')
  await expect.poll(() => enlarged.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true)
  expect(await dialog.locator('source').evaluateAll(elements => elements.map(el => el.getAttribute('srcset')))).toEqual(sources)
  await expect(enlarged).toHaveAttribute('sizes', /\d+px/)
  expect(await enlarged.evaluate((el: HTMLImageElement) => el.currentSrc)).toMatch(/\/images\/optimized\/.+\.(avif|webp)$/)
  const original = await inline.getAttribute('data-original-src')
  await expect(dialog.getByRole('link', { name: 'Open original image (new tab)' })).toHaveAttribute('href', original!)
  await page.keyboard.press('Escape')
  expect(errors).toEqual([])
})
