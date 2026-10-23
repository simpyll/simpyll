import { test, expect } from '@playwright/test'
import { destination, navigationReady } from './helpers/navigation'

const article = '/blog/001-python-fundamentals'
async function scroll(page: import('@playwright/test').Page, y: number) {
  await page.evaluate(top => window.scrollTo({ top, behavior: 'instant' }), y)
  await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(y, 0)
}

test('ordinary routes reset scroll and announce through heading focus; history restores without focus theft', async ({ page }) => {
  await page.goto(article)
  await navigationReady(page)
  await scroll(page, 900)
  await (await destination(page, 'Journal')).click()
  await expect(page).toHaveURL('/blog')
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0)
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeFocused()
  await expect(page).toHaveTitle('Learning Journal | Simpyll')
  await page.goBack()
  await expect(page).toHaveURL(article)
  await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(900, 0)
  await expect(page.getByRole('heading', { level: 1 }).first()).not.toBeFocused()
  await page.goForward()
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0)
})

test('direct prerendered MDX fragment focuses an unobscured heading without hydration errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto(`${article}#lesson-001-functions-and-variables`)
  // Choose a real compile-generated fragment rather than depending on test-only markup.
  const ids = await page.locator('.prose h2[id]').evaluateAll(nodes => nodes.map(node => node.id))
  expect(ids.length).toBeGreaterThan(1)
  await page.goto(`${article}#${ids[1]}`)
  const heading = page.locator(`[id="${ids[1]}"]`)
  await expect(heading).toBeFocused()
  await expect(heading).toBeInViewport()
  expect((await heading.boundingBox())!.y).toBeGreaterThan((await page.locator('.floating-header').boundingBox())!.y + (await page.locator('.floating-header').boundingBox())!.height)
  expect(errors).toEqual([])
})

test('keyboard routes, same-page fragments, skip link and fragment history preserve semantics', async ({ page }) => {
  await page.goto('/')
  await navigationReady(page)
  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('main')).toBeFocused()
  const journal = await destination(page, 'Journal')
  await journal.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeFocused()
  await page.evaluate(() => { const link = document.createElement('a'); link.href = '/#work'; link.textContent = 'Legacy Work bookmark'; document.querySelector('main')!.append(link) })
  await page.getByRole('link', { name: 'Legacy Work bookmark' }).click()
  await expect(page.locator('#work')).toBeFocused()
  const workY = await page.evaluate(() => scrollY)
  await page.evaluate(() => { const link = document.createElement('a'); link.href = '/#about'; link.textContent = 'Legacy About bookmark'; link.style.cssText = 'position:fixed;bottom:0;left:0;z-index:1000;background:var(--ui-canvas);padding:12px'; document.querySelector('main')!.append(link) })
  await page.getByRole('link', { name: 'Legacy About bookmark' }).click()
  await expect(page.locator('#about')).toBeFocused()
  await expect(page).toHaveURL('/#about')
  await page.goBack()
  await expect(page).toHaveURL('/#work')
  await expect(page.locator('#work')).toBeFocused()
  await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(workY, 0)
  await page.goForward()
  await expect(page.locator('#about')).toBeFocused()
})

test('theme changes preserve reading position and subsequent navigation still resets', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto(article)
  await navigationReady(page)
  await scroll(page, 900)
  const nav = page.locator('.floating-nav')
  const before = (await nav.boundingBox())!
  await page.getByRole('button', { name: /Switch to/ }).click()
  await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(900, 0)
  expect((await nav.boundingBox())!.y).toBeCloseTo(before.y, 1)
  await (await destination(page, 'Journal')).click()
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeFocused()
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0)
})

test('homepage route reset, native article anchors and rapid history remain useful', async ({ page }) => {
  await page.goto('/')
  await navigationReady(page)
  await scroll(page, 400)
  await (await destination(page, 'Journal')).click()
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0)
  await page.goto(article)
  await navigationReady(page)
  const ids = await page.locator('.prose h2[id]').evaluateAll(nodes => nodes.map(node => node.id))
  // Exercise authored native MDX links without adding a fixture post to production.
  await page.evaluate(fragments => {
    for (const [index, id] of fragments.entries()) {
      const link = document.createElement('a')
      link.href = `#${id}`
      link.textContent = `Section ${index}`
      link.dataset.testAnchor = String(index)
      document.querySelector('.prose')!.prepend(link)
    }
  }, ids.slice(0, 2))
  await page.locator('[data-test-anchor="0"]').click()
  await expect(page.locator(`[id="${ids[0]}"]`)).toBeFocused()
  await page.locator('[data-test-anchor="1"]').click()
  await expect(page.locator(`[id="${ids[1]}"]`)).toBeFocused()
  await page.goBack()
  await expect(page.locator(`[id="${ids[0]}"]`)).toBeFocused()
  await page.goForward()
  await expect(page.locator(`[id="${ids[1]}"]`)).toBeFocused()
  await (await destination(page, 'Journal')).click()
  await page.goBack()
  await page.goForward()
  await expect(page).toHaveURL('/blog')
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0)
})
