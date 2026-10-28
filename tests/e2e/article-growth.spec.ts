import { expect, test } from '@playwright/test'
import process from 'node:process'

test('large article data chunks hydrate and survive journal navigation and history', async ({ page }) => {
  test.skip(!process.env.GROWTH_FIXTURE, 'Uses the isolated synthetic growth build')
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error' && /hydrat/i.test(message.text())) errors.push(message.text()) })
  await page.goto('/blog/notion-fixture/')
  await expect(page.locator('.article-content')).toContainText('Synthetic passage 109')
  await page.reload()
  await expect(page.locator('.article-content')).toContainText('Synthetic passage 109')
  await page.goto('/blog')
  await page.getByRole('link', { name: 'Notion fixture article', exact: true }).click()
  await expect(page.locator('.article-content')).toContainText('Synthetic passage 109')
  await page.goBack()
  await expect(page).toHaveURL(/\/blog\/?$/)
  await page.goForward()
  await expect(page.locator('.article-content')).toContainText('Synthetic passage 109')
  expect(errors).toEqual([])
})
