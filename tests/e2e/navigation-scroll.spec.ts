import { test, expect } from '@playwright/test'
import { navigationReady } from './helpers/navigation'

for (const route of ['/', '/blog', '/blog/hello-world']) {
  test(`floating navigation remains visible through small scrolls and viewport changes: ${route}`, async ({ page, isMobile }, testInfo) => {
    if (isMobile) await page.setViewportSize({ width: 360, height: 780 })
    await page.goto(route)
    await navigationReady(page)
    const nav = page.locator('.floating-nav')
    const header = page.locator('.floating-header')
    const slot = page.locator('.navigation-slot')
    await expect.poll(async () => Math.abs((await slot.boundingBox())!.height - (await header.boundingBox())!.height)).toBeLessThan(1)
    const initial = (await nav.boundingBox())!
    const slotHeight = (await slot.boundingBox())!.height
    for (const y of [1, 4, 8, 12, 16, 24, 48, 96, 260, 96, 24, 8, 1, 0]) {
      await page.evaluate(async top => {
        window.scrollTo({ top, behavior: 'instant' })
        await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
      }, y)
      const box = (await nav.boundingBox())!
      expect(box.y).toBeCloseTo(initial.y, 1)
      expect(box.x).toBeCloseTo(initial.x, 1)
      expect(box.width).toBeCloseTo(initial.width, 1)
      expect(box.height).toBeCloseTo(initial.height, 1)
      await expect(nav).toBeInViewport({ ratio: 1 })
      // Catch clipping/occlusion of the capsule's actual controls, not just its outer box.
      expect(await nav.evaluate(el => [...el.querySelectorAll<HTMLElement>('a, button')]
        .filter(control => control.getClientRects().length)
        .every(control => {
          const rect = control.getBoundingClientRect()
          return control.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2))
        }))).toBe(true)
      expect((await slot.boundingBox())!.height).toBe(slotHeight)
      if (y === 8 || y === 24) await page.screenshot({ path: testInfo.outputPath(`scroll-${y}.png`), scale: 'css' })
    }
    for (const height of [640, 780, 680, 780]) {
      await page.setViewportSize({ width: isMobile ? 360 : 1280, height })
      await expect(nav).toBeInViewport({ ratio: 1 })
      await expect.poll(async () => Math.abs((await nav.boundingBox())!.y - initial.y)).toBeLessThan(1)
    }
    await page.screenshot({ path: testInfo.outputPath(`fixed-nav-${route.replaceAll('/', '_')}.png`), scale: 'css' })
  })
}

test('fixed header reserves wrapped content height and respects safe-area offset', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 })
  await page.goto('/blog')
  await navigationReady(page)
  const header = page.locator('.floating-header')
  const slot = page.locator('.navigation-slot')
  const nav = page.locator('.floating-nav')
  await header.evaluate(el => el.style.width = '190px')
  await page.addStyleTag({ content: '.floating-link { font-size: 2rem; }' })
  await expect.poll(async () => Math.abs((await slot.boundingBox())!.height - (await header.boundingBox())!.height)).toBeLessThan(1)
  await expect(page.locator('.floating-links a')).toHaveCount(0)
  // Exercise an inset larger than the default gap without requiring a physical notch.
  await header.evaluate(el => el.style.top = '40px')
  const before = (await nav.boundingBox())!
  await page.evaluate(() => window.scrollTo({ top: 24, behavior: 'instant' }))
  await expect.poll(async () => Math.abs((await nav.boundingBox())!.y - before.y)).toBeLessThan(1)
  await expect(nav).toBeInViewport({ ratio: 1 })
})
