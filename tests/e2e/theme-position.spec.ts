import { test, expect, type Page } from '@playwright/test'
import { navigationReady } from './helpers/navigation'

// Mark only the border: theme colors change, but painted geometry must not.
// Decode the real screenshot in an off-DOM canvas; no transition/browser mock.
async function outline(page: Page, png: Buffer) {
  return page.evaluate(async base64 => {
    const image = new Image()
    image.src = `data:image/png;base64,${base64}`
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    const context = canvas.getContext('2d')!
    context.drawImage(image, 0, 0)
    const pixels = context.getImageData(0, 0, image.width, image.height).data
    let left = image.width, top = image.height, right = -1, bottom = -1
    for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
      const offset = (y * image.width + x) * 4
      if (pixels[offset] > 190 && pixels[offset + 1] < 70 && pixels[offset + 2] > 190) {
        left = Math.min(left, x); right = Math.max(right, x)
        top = Math.min(top, y); bottom = Math.max(bottom, y)
      }
    }
    return { left, top, right, bottom }
  }, png.toString('base64'))
}

for (const position of ['top', 'scrolled', 'fragment']) {
  for (const direction of ['light', 'dark'] as const) {
    test(`theme reveal preserves painted and live nav geometry: ${position}, from ${direction}`, async ({ page, isMobile }, testInfo) => {
      // Match the reported compact layout (More is present), not a wide phone.
      if (isMobile) await page.setViewportSize({ width: 360, height: 780 })
      await page.emulateMedia({ reducedMotion: 'no-preference', colorScheme: direction })
      await page.goto(position === 'fragment' ? '/#work' : '/')
      await navigationReady(page)
      await page.evaluate(async () => {
        await document.fonts.ready
        window.scrollTo({ top: 0, behavior: 'instant' })
      })
      if (position !== 'top') {
        await page.evaluate(fragment => {
          if (fragment) document.getElementById('work')!.scrollIntoView({ behavior: 'instant' })
          else window.scrollTo({ top: 260, behavior: 'instant' })
        }, position === 'fragment')
      }
      await page.addStyleTag({ content: '.floating-nav { border-color: rgb(255, 0, 255) !important; }' })
      const button = page.getByRole('button', { name: /Switch to .* theme/ })
      await button.focus()
      await expect.poll(() => page.locator('[data-reveal]').evaluateAll(els => els.reduce((n, el) => n + el.getAnimations().length, 0))).toBe(0)
      const geometry = () => page.evaluate(() => {
        const rect = document.querySelector('.floating-nav')!.getBoundingClientRect()
        return { top: rect.top, left: rect.left, width: rect.width, height: rect.height, scroll: scrollY,
          focused: document.activeElement?.classList.contains('theme-toggle') }
      })
      const primaryCount = await page.locator('.floating-links a').count()
      const before = await geometry()
      const initialPng = await page.screenshot({ path: testInfo.outputPath('before.png'), scale: 'css' })
      const paintedBefore = await outline(page, initialPng)
      expect(paintedBefore.right).toBeGreaterThan(paintedBefore.left)
      await button.click()
      await page.waitForFunction(() => {
        const animation = document.documentElement.getAnimations({ subtree: true }).find(a =>
          (a.effect as KeyframeEffect)?.pseudoElement === '::view-transition-new(root)')
        if (!animation) return false
        animation.pause()
        return true
      })
      // Retain the actual Animation: getAnimations() may omit a paused end frame.
      const reveal = await page.evaluateHandle(() => document.documentElement.getAnimations({ subtree: true }).find(a =>
        (a.effect as KeyframeEffect)?.pseudoElement === '::view-transition-new(root)')!)
      const samples = []
      for (const progress of [0, .2, .5, .85, 1]) {
        await reveal.evaluate(async (animation, progress) => {
          animation.currentTime = Number(animation.effect!.getTiming().duration) * progress
          await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
        }, progress)
        if (progress < 1) await expect(page.locator('html')).toHaveAttribute('data-theme-transition')
        const png = await page.screenshot({ path: testInfo.outputPath(`frame-${progress}.png`), scale: 'css' })
        samples.push({ progress, geometry: await geometry(), painted: await outline(page, png) })
      }
      await reveal.evaluate(animation => animation.finish())
      await reveal.dispose()
      await expect(page.locator('html')).not.toHaveAttribute('data-theme-transition')
      const after = await geometry()
      const finalPng = await page.screenshot({ path: testInfo.outputPath('after.png'), scale: 'css' })
      const paintedAfter = await outline(page, finalPng)
      await testInfo.attach('geometry.json', { body: JSON.stringify({ before, paintedBefore, samples, after, paintedAfter }, null, 2), contentType: 'application/json' })
      // Geometry-only tests miss displaced snapshot pixels; require both to agree.
      for (const sample of samples) {
        for (const key of ['top', 'left', 'width', 'height', 'scroll'] as const) expect(sample.geometry[key]).toBeCloseTo(before[key], 1)
        expect(sample.geometry.focused).toBe(true)
        for (const key of ['top', 'left', 'right', 'bottom'] as const) expect(Math.abs(sample.painted[key] - paintedBefore[key]), `painted ${key} at ${sample.progress}`).toBeLessThanOrEqual(1)
      }
      expect(after).toEqual(before)
      expect(paintedAfter).toEqual(paintedBefore)
      await expect(page.locator('.floating-links a')).toHaveCount(primaryCount)
      const more = page.getByRole('button', { name: 'More' })
      if (await more.isVisible()) {
        await more.click()
        const nav = page.getByRole('navigation', { name: 'Main navigation' })
        for (const name of ['Home', 'Projects', 'Journal', 'About', 'Pulse']) {
          await expect(nav.getByRole('link', { name, exact: true })).toHaveCount(1)
        }
        await page.keyboard.press('Escape')
        await expect(more).toBeFocused()
      }
    })
  }
}
