import { test, expect } from '@playwright/test'

test('article images select responsive formats with reserved dimensions and no overflow', async ({ page }, info) => {
  const failures: string[] = []
  page.on('pageerror', e => failures.push(e.message))
  await page.goto('/blog/publishing-test/')
  const img = page.locator('article figure picture img').first()
  await expect(img).toHaveAttribute('width', /\d+/)
  await expect(img).toHaveAttribute('height', /\d+/)
  await expect(img).toHaveAttribute('loading', 'lazy')
  await img.scrollIntoViewIfNeeded()
  await expect.poll(() => img.evaluate((e: HTMLImageElement) => e.complete && e.naturalWidth > 0)).toBe(true)
  const selected = await img.evaluate((e: HTMLImageElement) => ({ src: e.currentSrc, width: e.getBoundingClientRect().width, ratio: e.getBoundingClientRect().width / e.getBoundingClientRect().height, intrinsic: Number(e.getAttribute('width')) / Number(e.getAttribute('height')) }))
  expect(selected.src).toMatch(/\/images\/optimized\/.+\.(avif|webp)$/)
  expect(selected.ratio).toBeCloseTo(selected.intrinsic, 1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(failures).toEqual([])
  await page.screenshot({ path: info.outputPath('responsive-image.png') })
})

test('responsive article images work without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('http://127.0.0.1:4173/blog/publishing-test/')
  const image = page.locator('article picture img').first()
  await image.scrollIntoViewIfNeeded()
  await expect(image).toBeVisible()
  await context.close()
})
