import { test, expect } from '@playwright/test'
import { destination } from './helpers/navigation'
import { ready, scan, tabTo, visibleFocus } from './helpers/accessibility'

for (const theme of ['light', 'dark'] as const) {
  test(`footer composition and accessible social links: ${theme}`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme: theme })
    await page.goto('/')
    const footer = page.getByRole('contentinfo')
    await expect(footer.getByRole('link', { name: 'simpyll.' })).toHaveCount(0)
    const contact = footer.getByRole('link', { name: 'Contact', exact: true })
    await expect(contact).toHaveAttribute('href', '/contact')
    await expect(contact.locator('svg')).toHaveCount(1)
    await expect(footer).toContainText('©')
    await expect(footer.getByRole('heading', { name: "Let's Connect" })).toBeVisible()
    await expect(footer.getByRole('button')).toHaveCount(0)
    await expect(footer.getByRole('link', { name: 'Projects', exact: true })).toHaveCount(0)
    await expect(footer).not.toContainText('Clinical roots')
    for (const [name, url] of [['GitHub', 'https://github.com/simpyll'], ['LinkedIn', 'https://www.linkedin.com/in/david-becker-rn-ccrn'], ['X (Twitter)', 'https://x.com/simpyll']]) {
      const link = footer.getByRole('link', { name, exact: true })
      await expect(link).toHaveAttribute('href', url)
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
      await expect(link.locator('svg')).toHaveAttribute('aria-hidden', 'true')
      await link.focus()
      expect(await link.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none')
    }
    await footer.scrollIntoViewIfNeeded()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await footer.screenshot({ path: info.outputPath(`footer-${theme}.png`) })
    await info.attach(`footer-${theme}`, { path: info.outputPath(`footer-${theme}.png`), contentType: 'image/png' })
  })
}

test('contextual contribution sources and client navigation', async ({ page }) => {
  await page.goto('/')
  const action = page.getByRole('contentinfo').getByRole('link', { name: /GitHub/ }).filter({ hasText: /Edit|Suggest/ })
  await expect(action).toHaveAttribute('href', /edit\/main\/src\/pages\/Home.tsx$/)
  await (await destination(page, 'Journal')).click()
  await expect(action).toHaveAttribute('href', /edit\/main\/src\/pages\/Blog.tsx$/)
  await expect(action).toHaveText('Edit this page on GitHub ↗')
  await page.goto('/blog/hello-world')
  await expect(action).toHaveText('Edit this article on GitHub ↗')
  await expect(action).toHaveAttribute('href', /edit\/main\/src\/content\/blog\/hello-world.mdx$/)
  await page.goto('/blog/why-simpyll')
  await expect(action).toHaveText('Suggest an edit to this article on GitHub ↗')
  const href = await action.getAttribute('href')
  const url = new URL(href!)
  expect(url.pathname).toBe('/simpyll/simpyll/issues/new')
  expect(url.searchParams.get('page-url')).toBe('https://simpyll.com/blog/why-simpyll')
  expect(url.searchParams.get('title')).toContain('Why Simpyll?')
  expect(href).not.toContain('403b3577')
  await page.goto('/projects/simpyll')
  await expect(action).toHaveAttribute('href', /edit\/main\/content\/case-studies\/simpyll.json$/)
  await page.goto('/about')
  await expect(action).toHaveAttribute('href', /edit\/main\/src\/content\/profile.ts$/)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (/hydration|hydrated|server rendered|Minified React error/i.test(message.text())) errors.push(message.text())
  })
  const failedAssets: string[] = []
  page.on('response', response => {
    if (response.status() >= 400 && response.request().resourceType() !== 'document') failedAssets.push(response.url())
  })
  // A missing document must return 404; Chromium logs that expected status.
  const response = await page.goto('/missing-page')
  expect(response?.status()).toBe(404)
  await expect.poll(async () => new URL((await action.getAttribute('href'))!).searchParams.get('page-url')).toBe('https://simpyll.com/missing-page')
  await expect(action).toHaveText('Suggest an edit on GitHub ↗')
  expect(errors).toEqual([])
  expect(failedAssets).toEqual([])
})

for (const theme of ['light', 'dark'] as const) {
  for (const width of [320, 768, 1440]) {
    for (const route of ['/', '/blog/why-simpyll']) {
      test(`footer layout, keyboard and reflow: ${theme} ${width} ${route}`, async ({ page }, info) => {
        await page.setViewportSize({ width, height: 900 })
        await page.emulateMedia({ colorScheme: theme })
        await page.goto(route)
        await ready(page)
        const footer = page.getByRole('contentinfo')
        const connect = footer.locator('.footer-connect')
        const legal = footer.getByRole('navigation', { name: 'Legal and transparency' })
        const legalLinks = legal.getByRole('link')
        await expect(legalLinks).toHaveText(['Privacy', 'Terms', 'Disclaimers', 'Accessibility', 'Editorial Standards'])
        const slugs = ['privacy', 'terms', 'disclaimers', 'accessibility', 'editorial-standards']
        for (const [i, link] of (await legalLinks.all()).entries()) {
          await expect(link).toBeVisible()
          await expect(link).toHaveAttribute('href', `/${slugs[i]}`)
        }
        const checkLayout = async () => {
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
          const links = await legalLinks.evaluateAll(els => els.map(el => {
            const r = el.getBoundingClientRect()
            return { x: r.x, y: r.y, bottom: r.bottom, height: r.height }
          }))
          for (let i = 0; i < links.length; i++) {
            expect(links[i].x).toBeCloseTo(links[0].x, 0)
            expect(links[i].height).toBeGreaterThanOrEqual(44)
            if (i) expect(links[i].y).toBeGreaterThanOrEqual(links[i - 1].bottom)
          }
          const icons = await footer.locator('.footer-socials a').evaluateAll(els => els.map(el => {
            const r = el.getBoundingClientRect()
            return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right }
          }))
          expect(icons).toHaveLength(4)
          for (let i = 0; i < icons.length; i++) {
            expect(icons[i].width).toBeGreaterThanOrEqual(44)
            expect(icons[i].height).toBeGreaterThanOrEqual(44)
            expect(icons[i].y).toBeCloseTo(icons[0].y, 0)
            if (i) expect(icons[i].x).toBeGreaterThanOrEqual(icons[i - 1].right)
          }
          const grid = (await footer.locator('.site-footer').boundingBox())!
          const copyright = footer.locator('.footer-copyright')
          const box = (await copyright.boundingBox())!
          expect(box.x).toBeCloseTo(grid.x, 0)
          expect(box.width).toBeCloseTo(grid.width, 0)
          expect(await copyright.evaluate(el => getComputedStyle(el).textAlign)).toBe('center')
          for (const group of [connect, legal]) {
            const r = (await group.boundingBox())!
            expect(box.y).toBeGreaterThanOrEqual(r.y + r.height)
          }
          expect(await copyright.evaluate(el => el === el.parentElement?.lastElementChild)).toBe(true)
        }
        await checkLayout()
        const connectionBox = (await connect.boundingBox())!
        const legalBox = (await legal.boundingBox())!
        if (width >= 640) {
          expect(connectionBox.y).toBeCloseTo(legalBox.y, 0)
          expect(legalBox.x).toBeGreaterThanOrEqual(connectionBox.x + connectionBox.width)
        } else expect(legalBox.y).toBeGreaterThanOrEqual(connectionBox.y + connectionBox.height)
        await footer.scrollIntoViewIfNeeded()
        await scan(page, info, 'footer')
        const screenshot = info.outputPath(`footer-${theme}-${width}-${route === '/' ? 'home' : 'article'}.png`)
        await footer.screenshot({ path: screenshot })
        await info.attach('footer layout', { path: screenshot, contentType: 'image/png' })
        const contact = footer.getByRole('link', { name: 'Contact', exact: true })
        // Enter the footer from the final article/page control; article length
        // must not exhaust a fixed global tab-count before this footer journey.
        await page.locator('main a[href], main button:not(:disabled), main summary, main [tabindex="0"]').last().focus()
        await tabTo(page, contact)
        await expect(contact.locator('.footer-icon-label')).toBeVisible()
        // From Contact, traverse the actual remaining footer controls in DOM order.
        for (const name of ['GitHub', 'LinkedIn', 'X (Twitter)']) {
          await page.keyboard.press('Tab')
          await visibleFocus(footer.getByRole('link', { name, exact: true }))
        }
        await page.keyboard.press('Tab')
        await visibleFocus(footer.locator('.footer-contribution'))
        for (const link of await legalLinks.all()) {
          await page.keyboard.press('Tab')
          await visibleFocus(link)
        }
        await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
        await checkLayout()
        await scan(page, info, 'footer-enlarged-text')
        await contact.focus()
        await page.keyboard.press('Enter')
        await expect(page).toHaveURL('/contact')
      })
    }
  }
}
