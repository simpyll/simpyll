import { test, expect } from '@playwright/test'

test('a filled honeypot is not sent or reported as delivered', async ({ page }) => {
  let requests = 0
  await page.route('https://formspree.io/**', async route => { requests++; await route.abort() })
  await page.goto('/contact')
  await page.getByLabel('Name', { exact: true }).fill('Example')
  await page.getByLabel('Email', { exact: true }).fill('example@example.com')
  await page.getByLabel('Subject', { exact: true }).fill('Example')
  await page.getByLabel('Message', { exact: true }).fill('Example message')
  await page.locator('input[name="_gotcha"]').evaluate((input: HTMLInputElement) => { input.value = 'filled' })
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.getByRole('alert')).toContainText('could not be sent')
  await expect(page.getByText('your message was submitted')).toHaveCount(0)
  expect(requests).toBe(0)
})
