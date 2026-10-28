import { test, expect } from '@playwright/test'
import { navigationReady } from './helpers/navigation'
import { scan, visibleFocus } from './helpers/accessibility'

// Synthetic contextual anchors exercise the production enhancer and real public
// manifest without rewriting published content or enabling editorial approvals.
test.beforeEach(async ({ page }) => {
  await page.goto('/blog/the-art-of-reading-code/')
  await navigationReady(page)
  await page.locator('.article-content').waitFor()
  await page.evaluate(() => {
    const p = document.createElement('p')
    p.id = 'preview-fixture'
    p.innerHTML = '<a href="/blog/hello-world?source=preview#main-content">Article destination</a> <a href="/projects/simpyll">Project destination</a> <a href="/blog/deleted">Missing destination</a> <a href="#main-content">Fragment destination</a> <a href="https://example.com/">External destination</a>'
    document.querySelector('.article-content')!.prepend(p)
  })
})

test('keyboard delay, names, Escape suppression, blur, Enter and cleanup', async ({ page }, info) => {
  const link = page.getByRole('link', { name: 'Article destination', exact: true })
  await link.scrollIntoViewIfNeeded()
  await page.keyboard.press('Tab')
  await link.focus()
  await visibleFocus(link)
  const tip = page.getByRole('tooltip')
  await expect(tip).toHaveCount(0)
  await expect(tip).toBeVisible()
  await expect(tip).toContainText('Hello, World.')
  await page.screenshot({ path: info.outputPath('article-preview.png') })
  await expect(link).toHaveAccessibleName('Article destination')
  await expect(link).toHaveAccessibleDescription(/Article.*Hello, World/)
  await expect(tip.locator('a, button, [tabindex]')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(link).toBeFocused()
  await page.waitForTimeout(450)
  await expect(tip).toHaveCount(0)
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Project destination', exact: true })).toBeFocused()
  await expect(tip).toContainText('Project')
  await page.keyboard.press('Shift+Tab')
  await expect(tip).toContainText('Article')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/blog\/hello-world\?source=preview#main-content$/)
  await expect(tip).toHaveCount(0)
})

test('hover delay, panel transit, leaving, rapid transitions and viewport cleanup', async ({ page }, info) => {
  test.skip(info.project.name.startsWith('mobile'), 'Hover requires a mouse; mobile has a separate real tap test')
  const link = page.getByRole('link', { name: 'Article destination', exact: true })
  const project = page.getByRole('link', { name: 'Project destination', exact: true })
  const tip = page.getByRole('tooltip')
  await link.hover()
  await expect(tip).toHaveCount(0)
  await project.hover()
  await expect(tip).toContainText('Project')
  await tip.hover()
  await page.waitForTimeout(450)
  await expect(tip).toBeVisible()
  await page.mouse.move(0, 0)
  await expect(tip).toHaveCount(0)
  await link.hover()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(450)
  await expect(tip).toHaveCount(0)
  await project.hover()
  await expect(tip).toBeVisible()
  await page.evaluate(() => window.scrollBy(0, 80))
  await expect(tip).toBeVisible()
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await expect(tip).toHaveCount(0)
})

for (const theme of ['light', 'dark']) test(`viewport edges, reflow, theme and axe: ${theme}`, async ({ page }, info) => {
  await page.evaluate(theme => { document.documentElement.dataset.theme = theme }, theme)
  const link = page.getByRole('link', { name: 'Project destination', exact: true })
  await link.scrollIntoViewIfNeeded()
  await page.keyboard.press('Tab'); await link.focus()
  const tip = page.getByRole('tooltip')
  await expect(tip).toBeVisible()
  await scan(page, info, `preview-${theme}`)
  await page.screenshot({ path: info.outputPath(`preview-${theme}.png`) })
  await page.keyboard.press('Escape'); await page.keyboard.press('Tab')
  await page.setViewportSize({ width: 320, height: 568 })
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
    const p = document.querySelector<HTMLElement>('#preview-fixture')!
    p.style.cssText = 'position:fixed;right:0;bottom:0;z-index:50;max-width:200px'
  })
  await link.focus()
  await expect(tip).toBeVisible()
  const box = await tip.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.y).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(320)
  expect(box!.y + box!.height).toBeLessThanOrEqual(568)
  expect(await tip.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
  await page.screenshot({ path: info.outputPath(`preview-edge-${theme}.png`) })
})

test('unsupported destinations remain ordinary anchors', async ({ page }) => {
  for (const name of ['Missing destination', 'Fragment destination', 'External destination']) {
    await page.keyboard.press('Tab')
    const link = page.getByRole('link', { name, exact: true })
    await link.focus()
    await page.waitForTimeout(400)
    await expect(page.getByRole('tooltip')).toHaveCount(0)
    await expect(link).not.toHaveAttribute('aria-describedby')
  }
})

test('single click and native modified/middle clicks preserve destinations', async ({ page, context }, info) => {
  test.skip(info.project.name.startsWith('mobile'), 'Desktop native mouse semantics')
  const link = page.getByRole('link', { name: 'Article destination', exact: true })
  for (const options of [{ button: 'middle' as const }, { modifiers: ['ControlOrMeta' as const] }]) {
    const popup = context.waitForEvent('page')
    await link.click(options)
    const opened = await popup
    await opened.waitForLoadState()
    expect(opened.url()).toContain('/blog/hello-world?source=preview#main-content')
    await opened.close()
  }
  await link.click({ button: 'right' })
  await expect(page).toHaveURL(/the-art-of-reading-code/)
  await page.keyboard.press('Escape')
  await link.click()
  await expect(page).toHaveURL(/hello-world\?source=preview#main-content$/)
})

test('touch follows with one tap without preview interception', async ({ page }, info) => {
  test.skip(!info.project.name.startsWith('mobile'), 'Requires actual touch emulation')
  await page.getByRole('link', { name: 'Project destination', exact: true }).tap()
  await expect(page).toHaveURL(/\/projects\/simpyll$/)
  await expect(page.getByRole('tooltip')).toHaveCount(0)
})

test('static article links remain available without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
  const page = await context.newPage()
  await page.goto('/blog/the-art-of-reading-code/')
  await expect(page.locator('.article-content a[href="/blog"]')).toBeVisible()
  await expect(page.getByRole('tooltip')).toHaveCount(0)
  await context.close()
})


test('pending timers, route transitions and reload hydration stay clean', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (/hydration|did not match/i.test(message.text())) errors.push(message.text()) })
  await page.keyboard.press('Tab')
  await page.getByRole('link', { name: 'Article destination', exact: true }).focus()
  await page.locator('.article-content a[href="/blog"]').click()
  await expect(page).toHaveURL(/\/blog$/)
  await page.waitForTimeout(450)
  await expect(page.getByRole('tooltip')).toHaveCount(0)
  await page.goto('/blog/the-art-of-reading-code/')
  await page.reload()
  await expect(page.locator('.article-content')).toBeVisible()
  expect(errors).toEqual([])
})
