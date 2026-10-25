import { expect, test } from '@playwright/test'
import process from 'node:process'

for (const theme of ['light', 'dark'] as const) {
  test(`article prints from ${theme}, including static no-JS markup`, async ({ browser, baseURL }, testInfo) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false, colorScheme: theme })
    const page = await context.newPage()
    await page.emulateMedia({ media: 'print' })
    await page.goto('/blog/hello-world/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('.article-content')).toBeVisible()
    await expect(page.locator('.article-metadata time')).toBeVisible()
    await expect(page.locator('.article-metadata')).toContainText('min read')
    for (const selector of ['.floating-header', '.navigation-slot', '#root > footer', '.breadcrumbs', '.article-tags']) {
      await expect(page.locator(selector)).toBeHidden()
    }
    await expect(page.locator('.print-attribution')).toBeVisible()
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    await expect(page.locator('.print-attribution a')).toHaveAttribute('href', canonical!)
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('color', 'rgb(24, 37, 31)')
    if (testInfo.project.name === 'desktop-chromium') {
      const path = testInfo.outputPath(`short-${theme}-Letter.pdf`)
      const pdf = await page.pdf({ path, format: 'Letter', preferCSSPageSize: true, printBackground: false })
      expect(pdf.toString('latin1').match(/\/Type \/Page\b/g)).toHaveLength(1)
      await testInfo.attach(`short-${theme}-Letter`, { path, contentType: 'application/pdf' })
    }
    await context.close()
  })
}

test('theme switching leaves print ink and screen preferences intact', async ({ page }) => {
  await page.goto('/blog/hello-world/')
  const h1 = page.getByRole('heading', { level: 1 })
  for (const theme of ['dark', 'light', 'dark'] as const) {
    if (await page.locator('html').getAttribute('data-theme') !== theme) {
      await page.getByRole('button', { name: `Switch to ${theme} theme` }).click()
    }
    const screenColor = await h1.evaluate(el => getComputedStyle(el).color)
    await expect(page.locator('.print-attribution')).toBeHidden()
    await page.emulateMedia({ media: 'print' })
    await expect(h1).toHaveCSS('color', 'rgb(24, 37, 31)')
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await expect(page.locator('.floating-header')).toBeHidden()
    await page.emulateMedia({ media: 'screen' })
    await expect(h1).toHaveCSS('color', screenColor)
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    await expect(page.locator('.floating-header')).toBeVisible()
  }
})

test('published technical article retains its body and hides discovery controls', async ({ page }, testInfo) => {
  await page.goto('/blog/the-art-of-reading-code/')
  await expect(page.locator('nav[aria-label="Article navigation"]')).toBeVisible()
  await expect(page.locator('#related-articles-heading')).toBeVisible()
  const body = await page.locator('.article-content').textContent()
  await page.emulateMedia({ media: 'print' })
  for (const selector of ['.article-toc', 'nav[aria-label="Article navigation"]', '#related-articles-heading', '.code-toolbar button']) {
    for (const element of await page.locator(selector).all()) await expect(element).toBeHidden()
  }
  expect(await page.locator('.article-content').textContent()).toBe(body)
  await expect(page.locator('article table')).toBeVisible()
  await expect(page.locator('article figure img')).toBeVisible()
  if (testInfo.project.name === 'desktop-chromium') {
    const path = testInfo.outputPath('published-technical-Letter.pdf')
    await page.pdf({ path, format: 'Letter', printBackground: false })
    await testInfo.attach('published-technical-Letter', { path, contentType: 'application/pdf' })
  }
})

test('technical content prints completely with wrapping, labels and figures', async ({ browser, baseURL }, testInfo) => {
  test.skip(!process.env.RICH_FIXTURE, 'Uses the existing isolated rich MDX integration build')
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, colorScheme: 'dark', viewport: { width: 680, height: 900 } })
  const page = await context.newPage()
  await page.emulateMedia({ media: 'print' })
  await page.goto('/blog/rich-content-fixture/')
  await expect(page.locator('.article-toc').first()).toBeHidden()
  await expect(page.locator('nav[aria-label="Article navigation"]')).toBeHidden()
  // Recommendations may be empty when the registry has no shared taxonomy.
  await expect(page.locator('section[aria-labelledby="related-articles-heading"]')).toBeHidden()
  await expect(page.locator('.code-toolbar button').first()).toBeHidden()
  await expect(page.locator('.code-toolbar').first()).toContainText('typescript')
  await expect(page.locator('.article-content h2').first()).toHaveCSS('break-after', /^avoid(?:-page)?$/)
  for (const code of await page.locator('.code-block pre').all()) {
    await expect(code).toBeVisible()
    await expect(code).toHaveCSS('white-space', 'pre-wrap')
    expect(await code.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
  }
  await expect(page.locator('.hljs-keyword').first()).toHaveCSS('color', 'rgb(36, 41, 47)')
  for (const table of await page.locator('.article-content table').all()) {
    await expect(table).toBeVisible()
    await expect(table).toHaveCSS('table-layout', 'fixed')
    expect(await table.evaluate(el => el.getBoundingClientRect().right <= document.querySelector('article')!.getBoundingClientRect().right + 1)).toBe(true)
  }
  await expect(page.locator('thead').first()).toHaveCSS('display', 'table-header-group')
  for (const variant of ['note', 'tip', 'information', 'warning', 'important']) {
    const callout = page.locator(`[data-variant="${variant}"]`).first()
    await expect(callout).toBeVisible()
    await expect(callout.locator('.callout-title')).toContainText(new RegExp(variant, 'i'))
    await expect(callout).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  }
  // Closed disclosure text is real article content, including when JS is disabled.
  await expect(page.locator('.article-content details').first()).not.toHaveAttribute('open')
  await expect(page.locator('.article-content details').first().getByText('They preserve keyboard controls and remain useful without JavaScript.')).toBeVisible()
  await expect(page.locator('.article-content img').first()).toHaveAttribute('loading', 'eager')
  for (const image of await page.locator('.article-content img').all()) {
    await expect(image).toBeVisible()
    expect(await image.evaluate(el => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0)).toBe(true)
    expect(await image.evaluate(el => el.getBoundingClientRect().width <= document.querySelector('article')!.clientWidth)).toBe(true)
  }
  await expect(page.locator('figcaption').first()).toBeVisible()
  const external = page.getByRole('link', { name: 'external documentation' })
  expect(await external.evaluate(el => getComputedStyle(el, '::after').content)).toContain('https://example.com/docs')
  expect(await page.getByRole('link', { name: 'journal', exact: true }).evaluate(el => getComputedStyle(el, '::after').content)).toBe('none')
  // Oversized examples should fragment, not be forced into an unbreakable page.
  await expect(page.locator('.code-block').last()).toHaveCSS('break-inside', 'auto')
  await expect(page.locator('.article-callout').last()).toHaveCSS('break-inside', 'auto')
  if (testInfo.project.name === 'desktop-chromium') {
    for (const format of ['Letter', 'A4'] as const) {
      const path = testInfo.outputPath(`technical-dark-${format}.pdf`)
      await page.pdf({ path, format, preferCSSPageSize: true, printBackground: false })
      await testInfo.attach(`technical-dark-${format}`, { path, contentType: 'application/pdf' })
    }
    const path = testInfo.outputPath('technical-print.png')
    await page.screenshot({ path, fullPage: true })
    await testInfo.attach('technical-print', { path, contentType: 'image/png' })
  }
  await context.close()
})
