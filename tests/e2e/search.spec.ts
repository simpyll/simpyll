import { test, expect, type Page } from '@playwright/test'
import { navigationReady } from './helpers/navigation'

const fixture = [
  { slug: 'hello-world', title: 'Hello World', description: 'An introduction', category: 'Engineering', tags: ['React'], body: 'Building accessible interfaces' },
  { slug: '001-python-fundamentals', title: 'Python Fundamentals', description: 'Learning programming', category: 'Learning', tags: ['Python'], body: 'Variables and functions' },
]
async function ready(page: Page) {
  await page.route('**/search-index.json', route => route.fulfill({ json: fixture }))
  await page.goto('/blog')
  await navigationReady(page)
  await page.evaluate(() => document.fonts.ready)
}
const box = (page: Page) => page.locator('.floating-nav').boundingBox()
async function stable(page: Page, before: NonNullable<Awaited<ReturnType<typeof box>>>) {
  const after = (await box(page))!
  for (const key of ['x', 'y', 'width', 'height'] as const) expect(Math.abs(before[key] - after[key]), key).toBeLessThanOrEqual(.5)
}

test('search keyboard journey, route focus, states and theme preservation', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await ready(page)
  await page.getByRole('button', { name: 'Open search' }).focus()
  await page.keyboard.press('Enter')
  const input = page.getByRole('combobox', { name: 'Search articles' })
  await expect(input).toBeFocused()
  await expect(page.locator('.nav-destinations')).toHaveAttribute('inert', '')
  await expect(page.getByRole('status')).toContainText('Search articles, topics')
  await input.fill('react')
  await expect(page.getByRole('option')).toHaveCount(1)
  await page.getByRole('button', { name: /Switch to .* theme/ }).click()
  await expect(input).toHaveValue('react')
  await expect(page.getByRole('option')).toHaveCount(1)
  await input.focus()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('option')).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Open search' })).toBeFocused()
  await page.keyboard.press('Space')
  await input.fill('nothingmatches')
  await expect(page.getByRole('status')).toContainText('No matching')
  await input.fill('hello')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL('/blog/hello-world')
  await expect(page.getByRole('button', { name: 'Open search' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused()
  expect(errors).toEqual([])
})

for (const width of [320, 390, 768, 1280]) {
  test(`capsule stable through every search animation frame at ${width}px, scrolled and resized`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 800 })
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await ready(page)
    const initial = (await box(page))!
    for (const top of [1, 4, 16, 48, 260, 8]) {
      await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), top)
      await stable(page, initial)
    }
    // Collect actual rAF geometry before, during and after both internal transitions.
    const samples = await page.evaluate(async () => {
      const nav = document.querySelector('.floating-nav')!
      const read = () => { const r = nav.getBoundingClientRect(); return [r.x, r.y, r.width, r.height] }
      const samples = [read()]
      for (const action of ['Open search', 'Close search']) {
        document.querySelector<HTMLButtonElement>(`[aria-label="${action}"]`)!.click()
        const start = performance.now()
        while (performance.now() - start < 300) { await new Promise(requestAnimationFrame); samples.push(read()) }
      }
      return samples
    })
    expect(samples.length).toBeGreaterThan(10)
    for (const sample of samples) for (let i = 0; i < 4; i++) expect(Math.abs(sample[i] - samples[0][i])).toBeLessThanOrEqual(.5)
    await page.getByRole('button', { name: 'Open search' }).click()
    await page.getByRole('combobox').fill('python')
    await stable(page, initial)
    for (const theme of ['light', 'dark']) {
      await page.evaluate(value => window.dispatchEvent(new CustomEvent('simpyll-theme-select', { detail: value })), theme)
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      await stable(page, initial)
      await page.screenshot({ path: testInfo.outputPath(`search-${width}-${theme}.png`) })
    }
    await page.screenshot({ path: testInfo.outputPath(`search-${width}.png`) })
    await page.setViewportSize({ width: width === 320 ? 700 : 320, height: 700 })
    await expect.poll(async () => (await box(page))!.width).toBeLessThanOrEqual(width === 320 ? 700 : 320)
    await page.waitForFunction(() => document.querySelector('.floating-header')?.getAttribute('data-nav-ready') === 'true')
    const resized = (await box(page))!
    await page.getByRole('button', { name: 'Close search' }).click()
    await stable(page, resized)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

test('left button uses live reveal geometry after scrolling/resizing with search open', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await ready(page)
  for (const width of [360, 900, 390]) {
    await page.setViewportSize({ width, height: 800 })
    await page.evaluate(() => window.scrollTo({ top: 16, behavior: 'instant' }))
    // Drain the observer's batched frame and React's responsive partition before measuring.
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))))
    await expect.poll(async () => (await box(page))!.width).toBeLessThan(width)
    if (await page.getByRole('button', { name: 'Open search' }).isVisible()) await page.getByRole('button', { name: 'Open search' }).click()
    await page.getByRole('combobox').fill('react')
    const button = page.locator('.theme-toggle')
    await button.evaluate(el => el.addEventListener('click', () => {
      const r = el.getBoundingClientRect()
      el.setAttribute('data-test-origin', JSON.stringify({ x: r.x, y: r.y, width: r.width, height: r.height }))
    }, { capture: true, once: true }))
    const position = (await button.boundingBox())!
    const search = (await page.locator('.nav-search-control').boundingBox())!
    expect(position.x).toBeLessThan(search.x)
    const before = (await box(page))!
    await button.click()
    const origin = JSON.parse((await button.getAttribute('data-test-origin'))!) as { x: number; y: number; width: number; height: number }
    await page.waitForFunction(() => document.documentElement.getAnimations({ subtree: true }).some(a => (a.effect as KeyframeEffect)?.pseudoElement === '::view-transition-new(root)'))
    const animation = await page.evaluateHandle(() => document.documentElement.getAnimations({ subtree: true }).find(a => (a.effect as KeyframeEffect)?.pseudoElement === '::view-transition-new(root)')!)
    const frames = await animation.evaluate(a => { a.pause(); return (a.effect as KeyframeEffect).getKeyframes().map(k => String(k.clipPath)) })
    const match = frames[0].match(/circle\(0px at ([\d.]+)px ([\d.]+)px\)/)!
    expect(Number(match[1])).toBeCloseTo(origin.x + origin.width / 2, 1)
    expect(Number(match[2])).toBeCloseTo(origin.y + origin.height / 2, 1)
    const radius = Number(frames[1].match(/circle\((\d+)px/)![1])
    const x = Number(match[1]), y = Number(match[2])
    expect(radius).toBeGreaterThanOrEqual(Math.hypot(Math.max(x, width - x), Math.max(y, 800 - y)))
    for (const progress of [0, .25, .5, .9]) {
      await animation.evaluate((a, progress) => { a.currentTime = Number(a.effect!.getTiming().duration) * progress }, progress)
      await stable(page, before)
    }
    await page.screenshot({ path: testInfo.outputPath(`search-reveal-${width}.png`) })
    await animation.evaluate(a => a.finish())
    await expect(page.locator('html')).not.toHaveAttribute('data-theme-transition')
    await stable(page, before)
    await expect(page.getByRole('combobox')).toHaveValue('react')
  }
})

test('loading, failed index and retry remain usable', async ({ page }) => {
  let fail = true
  await page.route('**/search-index.json', async route => {
    await new Promise(resolve => setTimeout(resolve, 150))
    await route.fulfill(fail ? { status: 503 } : { json: fixture })
  })
  await page.goto('/')
  await navigationReady(page)
  await page.getByRole('button', { name: 'Open search' }).click()
  await expect(page.getByRole('status')).toHaveText('Loading search…')
  await expect(page.getByRole('status')).toContainText('unavailable')
  await page.getByRole('button', { name: 'Close search' }).click()
  fail = false
  await page.getByRole('button', { name: 'Open search' }).click()
  await page.getByRole('combobox').fill('python')
  await expect(page.getByRole('option')).toHaveCount(1)
})

test('deployed index searches real article body without fetching article content', async ({ page }) => {
  const requested: string[] = []
  page.on('request', request => { if (request.resourceType() === 'fetch') requested.push(request.url()) })
  await page.goto('/blog')
  await navigationReady(page)
  await page.getByRole('button', { name: 'Open search' }).click()
  await page.getByRole('combobox').fill('python')
  await expect(page.getByRole('option').filter({ hasText: 'Python' })).toHaveCount(1)
  await page.getByRole('combobox').fill('arch linux')
  await expect(page.getByRole('option').filter({ hasText: 'Python' })).toHaveCount(1)
  expect(requested.filter(url => url.endsWith('/search-index.json'))).toHaveLength(1)
  expect(requested.filter(url => url.includes('.mdx'))).toHaveLength(0)
})

test('rapid controls, predictable Tab and Escape from theme control', async ({ page }) => {
  await ready(page)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.getByRole('button', { name: 'Open search' }).click()
  await page.getByRole('combobox').fill('hello')
  await page.locator('.theme-toggle').click()
  await expect(page.getByRole('combobox')).toHaveValue('hello')
  await page.locator('.theme-toggle').focus()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Open search' })).toBeFocused()
  await expect(page.locator('html')).not.toHaveAttribute('data-theme-transition')
  await page.evaluate(() => { for (let i = 0; i < 10; i++) document.querySelector<HTMLButtonElement>('.nav-search-control')!.click() })
  await expect(page.getByRole('button', { name: 'Open search' })).toBeVisible()
  await page.getByRole('button', { name: 'Open search' }).click()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Close search' })).toBeFocused()
})


test('route change while the index is loading closes search without stealing destination focus', async ({ page }) => {
  let release!: () => void
  const waiting = new Promise<void>(resolve => { release = resolve })
  await page.route('**/search-index.json', async route => { await waiting; await route.fulfill({ json: fixture }) })
  await page.goto('/blog')
  await navigationReady(page)
  await page.getByRole('button', { name: 'Open search' }).click()
  await expect(page.getByRole('status')).toHaveText('Loading search…')
  await page.locator('main a[href="/blog/hello-world"]').click()
  await expect(page).toHaveURL('/blog/hello-world')
  release()
  await expect(page.getByRole('button', { name: 'Open search' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused()
})


for (const fallback of ['reduced', 'unsupported']) {
  test(`search state and capsule survive theme fallback: ${fallback}`, async ({ page }) => {
    if (fallback === 'unsupported') await page.addInitScript(() => Object.defineProperty(document, 'startViewTransition', { value: undefined }))
    await page.emulateMedia({ reducedMotion: fallback === 'reduced' ? 'reduce' : 'no-preference' })
    await ready(page)
    await page.getByRole('button', { name: 'Open search' }).click()
    await page.getByRole('combobox').fill('hello')
    const before = (await box(page))!
    const theme = await page.locator('html').getAttribute('data-theme')
    await page.locator('.theme-toggle').click()
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', theme!)
    await expect(page.locator('html')).not.toHaveAttribute('data-theme-transition')
    await expect(page.getByRole('combobox')).toHaveValue('hello')
    await expect(page.getByRole('option')).toHaveCount(1)
    await stable(page, before)
  })
}
