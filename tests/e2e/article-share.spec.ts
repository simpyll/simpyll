import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFileSync } from 'node:fs'
const articles = JSON.parse(readFileSync('src/generated/articles.json', 'utf8'))

const article = articles[0]
const path = `/blog/${article.slug}`

for (const theme of ['light', 'dark']) test(`native share (${theme}), cancellation, failure, copy and manual fallback are honest and accessible`, async ({ page }) => {
  await page.addInitScript((theme) => {
    localStorage.setItem('simpyll-theme', theme)
    Object.defineProperty(navigator, 'share', { configurable: true, writable: true, value: async (data: ShareData) => {
      Object.assign(window, { shared: data })
    } })
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { Object.assign(window, { copied: text, copyCount: ((window as Window & { copyCount?: number }).copyCount ?? 0) + 1 }) } } })
  }, theme)
  await page.goto(path + '?source=test#top')
  const section = page.getByRole('region', { name: 'Share this article' })
  const share = section.getByRole('button', { name: 'Share article', exact: true })
  await share.focus()
  await expect(share).toBeFocused()
  expect(await share.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none')
  await section.screenshot({ path: `artifacts/share-${test.info().project.name}-${theme}.png` })
  await page.keyboard.press('Tab')
  await expect(section.getByRole('button', { name: 'Copy link', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(section.getByRole('status')).toHaveText('Link copied.')
  const canonical = await page.locator('link[rel=canonical]').getAttribute('href')
  expect(await page.evaluate(() => (window as Window & { copied?: string }).copied)).toBe(canonical)
  await share.click()
  await expect(section.getByRole('status')).toHaveText('Article shared.')
  expect(await page.evaluate(() => (window as Window & { shared?: ShareData }).shared)).toEqual({ title: article.metadata.title, url: canonical })
  await page.evaluate(() => { navigator.share = async () => { throw new DOMException('Canceled', 'AbortError') } })
  await share.click()
  await expect(section.getByRole('status')).toHaveText('Sharing canceled.')
  expect(await page.evaluate(() => (window as Window & { copyCount?: number }).copyCount)).toBe(1)
  await page.evaluate(() => { navigator.share = async () => { throw new Error('Denied') } })
  await share.click()
  await expect(section.getByRole('status')).toContainText('Could not share')
  await page.evaluate(() => { Object.defineProperty(navigator, 'share', { value: undefined }) })
  await share.click()
  await expect(section.getByRole('status')).toHaveText('Link copied.')
  await page.evaluate(() => { navigator.clipboard.writeText = async () => { throw new Error('Denied') } })
  await section.getByRole('button', { name: 'Copy link', exact: true }).click()
  await expect(section.getByRole('status')).toContainText('Could not copy')
  await expect(section.getByRole('textbox', { name: 'Article URL' })).toHaveValue(canonical!)
  await expect(section.getByRole('textbox', { name: 'Article URL' })).toBeEditable({ editable: false })
  expect((await new AxeBuilder({ page }).include('.article-share').analyze()).violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await section.screenshot({ path: `artifacts/share-${test.info().project.name}.png` })
})
