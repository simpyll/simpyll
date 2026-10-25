import { test, expect } from '@playwright/test'
import { ready, scan } from './helpers/accessibility'
import { readFileSync } from 'node:fs'
const policies = JSON.parse(readFileSync(new URL('../../src/content/policies.json', import.meta.url), 'utf8')) as { slug: string; title: string; description: string; sections: { text: string }[] }[]

for (const theme of ['light', 'dark'] as const) {
  test(`policy routes, metadata, reflow and accessibility: ${theme}`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (/hydration|Minified React error/i.test(message.text())) errors.push(message.text()) })
    for (const policy of policies) {
      const response = await page.goto(`/${policy.slug}`)
      expect(response?.status()).toBe(200)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(policy.title)
      await expect(page).toHaveTitle(`${policy.title} | Simpyll`)
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://simpyll.com/${policy.slug}`)
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', policy.description)
      await expect(page.getByRole('complementary', { name: 'Document status' })).toContainText('Published October 25, 2026')
      await expect(page.getByRole('complementary', { name: 'Document status' }).getByRole('link', { name: 'simpyll.com@gmail.com' })).toHaveAttribute('href', 'mailto:simpyll.com@gmail.com')
      await page.getByRole('navigation', { name: 'On this page' }).getByRole('link').first().click()
      await expect(page.locator('#section-1')).toBeFocused()
      await ready(page)
      await scan(page, info, policy.slug)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.screenshot({ path: info.outputPath(`${policy.slug}-${theme}.png`), fullPage: true })
      await info.attach(`${policy.slug}-${theme}`, { path: info.outputPath(`${policy.slug}-${theme}.png`), contentType: 'image/png' })
    }
    const nav = page.getByRole('navigation', { name: 'Legal and transparency' })
    for (const policy of policies) await expect(nav.locator(`a[href="/${policy.slug}"]`)).toHaveCount(1)
    await nav.getByRole('link', { name: 'Privacy', exact: true }).click()
    await expect(page).toHaveURL('/privacy')
    await page.goBack()
    await expect(page).toHaveURL(/accessibility/)
    expect(errors).toEqual([])
  })
}

test('policies remain meaningful without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  for (const policy of policies) {
    await page.goto(`http://127.0.0.1:4173/${policy.slug}/`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(policy.title)
    await expect(page.locator('main')).toContainText(policy.sections[0].text)
  }
  await context.close()
})
