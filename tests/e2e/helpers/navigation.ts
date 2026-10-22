import { expect, type Page } from '@playwright/test'

export async function navigationReady(page: Page) {
  await expect(page.locator('.floating-header')).toHaveAttribute('data-nav-ready', 'true')
}

export async function destination(page: Page, name: string) {
  await navigationReady(page)
  const nav = page.getByRole('navigation', { name: 'Main navigation' })
  const link = nav.getByRole('link', { name, exact: true })
  if (!await link.isVisible()) await nav.getByRole('button', { name: 'More' }).click()
  return link
}
