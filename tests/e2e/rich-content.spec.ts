import { expect, test } from '@playwright/test'
import process from 'node:process'
import { scan, visibleFocus } from './helpers/accessibility'

test.skip(!process.env.RICH_FIXTURE, 'Fixture exists only in the isolated integration build')

test('rich manual and Notion content hydrates, scrolls and works by keyboard', async ({ page, context }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await context.route('https://example.com/**', route => route.abort())
  await page.goto('/blog/rich-content-fixture')
  await expect(page.getByRole('heading', { name: 'Writing for clarity' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Notion heading' })).toHaveAttribute('id', 'notion-heading')
  await expect(page.locator('.heading-actions, .heading-feedback, .heading-permalink')).toHaveCount(0)
  await expect(page.getByRole('note', { name: 'Information: Shared renderer' })).toBeVisible()
  for (const variant of ['note', 'tip', 'information', 'warning', 'important']) await expect(page.locator(`.article-callout[data-variant="${variant}"]`).first()).toBeAttached()
  await expect(page.locator('code.hljs .hljs-keyword').first()).toBeAttached()
  await expect(page.locator('.code-toolbar').first()).toContainText('typescript')
  await expect(page.locator('.code-toolbar').filter({ hasText: 'python' })).toHaveCount(2)
  await expect(page.locator('figcaption')).toContainText(['One visual language', 'Notion caption'])
  await expect(page.getByAltText('Publishing flows converge on one article renderer')).toHaveAttribute('width', '960')
  await expect(page.getByRole('link', { name: 'external documentation' })).not.toHaveAttribute('target')
  await expect(page.getByRole('link', { name: 'journal', exact: true })).toHaveAttribute('href', '/blog')
  await expect(page.getByRole('link', { name: 'Optional new-tab resource' })).toHaveAttribute('rel', /noopener noreferrer/)
  await expect(page.getByRole('link', { name: 'Optional new-tab resource' })).toContainText('opens in a new tab')
  await expect(page.locator('iframe, .article-content script')).toHaveCount(0)
  await expect(page.getByText('Embed unavailable.')).toBeVisible()
  const disclosure = page.locator('details').filter({ hasText: 'Why use native disclosures?' })
  await disclosure.locator('summary').focus()
  await page.keyboard.press('Enter')
  await expect(disclosure).toHaveAttribute('open', '')
  await visibleFocus(disclosure.locator('summary'))
  await page.keyboard.press('Space')
  await expect(disclosure).not.toHaveAttribute('open')
  await scan(page, testInfo, 'rich-disclosure-closed')
  await page.keyboard.press('Enter')
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme)
    await scan(page, testInfo, `rich-disclosure-open-${theme}`)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
    await page.evaluate(() => window.scrollTo(0, 0))
    const screenshot = testInfo.outputPath(`rich-${theme}.jpg`)
    await page.screenshot({ path: screenshot, fullPage: true, type: 'jpeg', quality: 75, scale: 'css' })
    await testInfo.attach(`rich-${theme}`, { path: screenshot, contentType: 'image/jpeg' })
  }
  const scroll = page.getByRole('region', { name: 'Article table' }).first()
  await scroll.focus()
  if (testInfo.project.name.includes('mobile')) {
    expect(await scroll.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true)
    await page.keyboard.press('ArrowRight')
    await expect.poll(() => scroll.evaluate(el => el.scrollLeft)).toBeGreaterThan(0)
  }
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (value: string) => { document.body.dataset.copied = value } } }))
  await page.getByRole('button', { name: 'Copy code', exact: true }).first().click()
  await expect(page.locator('.code-block [role="status"]').first()).toHaveText('Copied code.')
  expect(await page.locator('body').getAttribute('data-copied')).toBe(await page.locator('.code-block pre').first().textContent())
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('denied') } } }))
  await page.getByRole('button', { name: 'Copy code', exact: true }).first().click()
  await expect(page.locator('.code-block [role="status"]').first()).toContainText('Copy unavailable')
  expect(errors).toEqual([])
})

test('static content and disclosures work without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  await page.goto('http://127.0.0.1:4173/blog/rich-content-fixture/')
  await expect(page.locator('.article-content table')).toHaveCount(2)
  await expect(page.getByRole('link', { name: 'https://example.com/guide?topic=notion' })).toHaveAttribute('href', 'https://example.com/guide?topic=notion')
  await expect(page.getByRole('link', { name: 'guide.pdf (PDF)' })).toHaveAttribute('href', 'https://example.com/guide.pdf')
  await expect(page.getByRole('img', { name: 'Shared renderer illustration' })).toBeVisible()
  await expect(page.locator('code.hljs').first()).toBeAttached()
  const disclosure = page.locator('details').first()
  await disclosure.locator('summary').click()
  await expect(disclosure).toHaveAttribute('open', '')
  await expect(page.getByText('Both publishing paths use the same component mapping')).toBeVisible()
  await context.close()
})

// Uses the same isolated fixture build as the existing renderer/copy/axe journey.
test('GitHub palettes follow theme selection with readable tokens and scrolling', async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/blog/rich-content-fixture/')
  const pre = page.locator('.code-block pre').first()
  const palettes = {
    light: { background: 'rgb(246, 248, 250)', keyword: 'rgb(207, 34, 46)', string: 'rgb(10, 48, 105)', comment: 'rgb(104, 113, 123)', title: 'rgb(130, 80, 223)', number: 'rgb(5, 80, 174)' },
    dark: { background: 'rgb(13, 17, 23)', keyword: 'rgb(255, 123, 114)', string: 'rgb(165, 214, 255)', comment: 'rgb(139, 148, 158)', title: 'rgb(210, 168, 255)', number: 'rgb(121, 192, 255)' },
  }
  for (const theme of ['light', 'dark', 'light'] as const) {
    if (await page.locator('html').getAttribute('data-theme') !== theme) {
      await page.getByRole('button', { name: `Switch to ${theme} theme` }).click()
    }
    await expect(pre).toHaveCSS('background-color', palettes[theme].background)
    for (const token of ['keyword', 'string', 'comment', 'title', 'number'] as const) {
      await expect(pre.locator(token === 'title' ? '.hljs-title.function_' : `.hljs-${token}`).first()).toHaveCSS('color', palettes[theme][token])
    }
    // Measure every rendered text token against its effective background,
    // including nested substitutions and diff addition/deletion surfaces.
    const contrast = await page.locator('.code-block pre').evaluateAll(blocks => {
      const luminance = (color: string) => {
        const channels = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(v => {
          const c = v / 255
          return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4
        })
        return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722
      }
      const ratio = (a: string, b: string) => {
        const x = luminance(a), y = luminance(b)
        return (Math.max(x, y) + .05) / (Math.min(x, y) + .05)
      }
      const results: { token: string; ratio: number }[] = []
      for (const block of blocks) {
        for (const el of [block, ...block.querySelectorAll('code, span')]) {
          if (![...el.childNodes].some(n => n.nodeType === Node.TEXT_NODE && n.textContent?.trim())) continue
          let background = getComputedStyle(el).backgroundColor
          let parent = el.parentElement
          while (background === 'rgba(0, 0, 0, 0)' && parent) {
            background = getComputedStyle(parent).backgroundColor
            parent = parent.parentElement
          }
          results.push({ token: el.className, ratio: ratio(getComputedStyle(el).color, background) })
        }
        const selection = getComputedStyle(block.querySelector('code')!, '::selection')
        results.push({ token: 'selection', ratio: ratio(selection.color, selection.backgroundColor) })
      }
      return results
    })
    expect(contrast.length).toBeGreaterThan(50)
    expect(contrast.filter(result => result.ratio < 4.5)).toEqual([])
    await testInfo.attach(`syntax-contrast-${theme}`, { body: JSON.stringify(contrast, null, 2), contentType: 'application/json' })
    await scan(page, testInfo, `syntax-${theme}`)
    await pre.scrollIntoViewIfNeeded()
    await pre.locator('..').screenshot({ path: testInfo.outputPath(`syntax-${theme}.png`) })
  }
  await page.reload()
  await expect(pre).toHaveCSS('background-color', palettes.light.background)
  await expect(page.locator('code.language-unknown-language span')).toHaveCount(0)
  await expect(page.locator('code.language-unknown-language')).toHaveText('unknown syntax remains readable <script>never executed</script>\n')
  await expect(page.locator('code.language-text')).toContainText('Plain text stays readable')
  const long = page.locator('.code-block pre').filter({ hasText: 'long_line_' })
  await long.focus()
  await visibleFocus(long)
  expect(await long.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true)
  await page.keyboard.press('ArrowRight')
  await expect.poll(() => long.evaluate(el => el.scrollLeft)).toBeGreaterThan(0)
  // A narrow CSS viewport and 200% text scaling exercise reflow without wrapping code.
  await page.setViewportSize({ width: 320, height: 800 })
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  await expect(long).toHaveCSS('white-space', 'pre')
  await page.emulateMedia({ media: 'print' })
  await expect(page.getByRole('button', { name: 'Copy code', exact: true }).first()).toBeHidden()
  await expect(pre.locator('.hljs-keyword').first()).toHaveCSS('color', 'rgb(36, 41, 47)')
  await expect(pre).toHaveCSS('white-space', 'pre-wrap')
  await expect(pre.locator('code')).toHaveCSS('white-space', 'pre-wrap')
})

for (const colorScheme of ['light', 'dark'] as const) {
  test(`static syntax uses OS ${colorScheme} without JavaScript`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, colorScheme, baseURL, viewport: { width: 320, height: 800 } })
    const page = await context.newPage()
    await page.goto('/blog/rich-content-fixture/')
    await expect(page.locator('html')).not.toHaveAttribute('data-theme')
    await expect(page.locator('.article-callout').first()).toHaveCSS('border-inline-start-color', colorScheme === 'light' ? 'rgb(29, 78, 216)' : 'rgb(96, 165, 250)')
    await expect(page.locator('.code-block pre').first()).toHaveCSS('background-color', colorScheme === 'light' ? 'rgb(246, 248, 250)' : 'rgb(13, 17, 23)')
    for (const language of ['javascript', 'typescript', 'tsx', 'json', 'bash', 'python', 'css', 'html', 'markdown', 'sql', 'diff']) {
      const code = page.locator(`code.language-${language}`).first()
      await expect(code).toHaveClass(/hljs/)
      expect(await code.locator('span').count()).toBeGreaterThan(0)
    }
    await expect(page.locator('code.language-text')).toHaveCSS('color', colorScheme === 'light' ? 'rgb(36, 41, 47)' : 'rgb(201, 209, 217)')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
    await context.close()
  })
}

test('semantic callouts share accessible palettes, fallback and print styles', async ({ page }, testInfo) => {
  await page.goto('/blog/rich-content-fixture/')
  const variants = ['note', 'tip', 'information', 'warning', 'important']
  const palettes = { dark: ['#a5b4fc', '#65d6b4', '#60a5fa', '#fbbf24', '#fb7185'], light: ['#4f46e5', '#047857', '#1d4ed8', '#92400e', '#be123c'] }
  for (const theme of ['dark', 'light'] as const) {
    await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme)
    for (const [i, variant] of variants.entries()) {
      const callout = page.locator(`.article-callout[data-variant="${variant}"]`).first()
      const expected = palettes[theme][i]
      const colors = await callout.evaluate(el => {
        const style = getComputedStyle(el)
        const icon = el.querySelector('svg')!
        return { accent: style.getPropertyValue('--callout-accent').trim().toLowerCase(), border: style.borderInlineStartColor, icon: getComputedStyle(icon).color }
      })
      expect(colors.accent).toBe(expected)
      expect(colors.border).toBe(colors.icon)
      const contrasts = await callout.evaluate(el => {
        const luminance = (color: string) => {
          const c = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(v => { const n = v / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4 })
          return c[0] * .2126 + c[1] * .7152 + c[2] * .0722
        }
        const background = luminance(getComputedStyle(el).backgroundColor)
        const ratio = (color: string) => { const value = luminance(color); return (Math.max(background, value) + .05) / (Math.min(background, value) + .05) }
        return { icon: ratio(getComputedStyle(el.querySelector('svg')!).color), title: ratio(getComputedStyle(el.querySelector('.callout-title')!).color), body: ratio(getComputedStyle(el).color) }
      })
      expect(contrasts.icon).toBeGreaterThanOrEqual(3)
      expect(contrasts.title).toBeGreaterThanOrEqual(4.5)
      expect(contrasts.body).toBeGreaterThanOrEqual(4.5)
      await testInfo.attach(`${theme}-${variant}-contrast`, { body: JSON.stringify(contrasts), contentType: 'application/json' })
      await expect(callout.locator('svg')).toHaveAttribute('aria-hidden', 'true')
      await expect(callout.locator('.callout-title')).toContainText(variant === 'information' ? 'Information' : variant[0].toUpperCase() + variant.slice(1))
    }
    const fallback = page.getByRole('note', { name: 'Note: Fallback contract' })
    await expect(fallback).toHaveAttribute('data-variant', 'note')
    await expect(fallback.locator('ul ul li')).toHaveText('Nested item')
    await expect(fallback.locator('pre')).toContainText('const safe = true')
    await fallback.getByRole('link').focus()
    await visibleFocus(fallback.getByRole('link'))
    await page.evaluate(() => document.documentElement.style.fontSize = '200%')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
    await page.evaluate(() => document.documentElement.style.fontSize = '')
    await scan(page, testInfo, `semantic-callouts-${theme}`)
  }
  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('.article-callout').first()).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(page.locator('.callout-title').first()).toHaveCSS('color', 'rgb(24, 37, 31)')
})
