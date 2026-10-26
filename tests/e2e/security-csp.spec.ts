import { test, expect } from '@playwright/test'

test('production CSP blocks base URL changes and object loads', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const original = document.baseURI
    const blocked: string[] = []
    document.addEventListener('securitypolicyviolation', event => blocked.push(event.violatedDirective))
    const base = document.createElement('base')
    base.href = 'https://example.invalid/'
    document.head.prepend(base)
    const object = document.createElement('object')
    object.data = '/icon.svg'
    document.body.append(object)
    await new Promise(resolve => setTimeout(resolve, 500))
    return { original, current: document.baseURI, blocked }
  })
  expect(result.current).toBe(result.original)
  expect(result.blocked).toContain('base-uri')
  expect(result.blocked).toContain('object-src')
})
