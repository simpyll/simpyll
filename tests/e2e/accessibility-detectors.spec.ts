import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { accessibilityTags, tabTo, visibleFocus } from './helpers/accessibility'

// Broken markup exists only in isolated about:blank documents, never the site.
for (const [rule, markup] of [
  ['button-name', '<button></button>'],
  ['image-alt', '<img src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E">'],
  ['aria-valid-attr', '<button aria-madeup="true">Save</button>'],
  ['color-contrast', '<p style="color:#aaa;background:#fff">Low contrast text</p>'],
  ['aria-dialog-name', '<div role="dialog" aria-modal="true"><button>Close</button></div>'],
]) {
  test(`detector rejects ${rule}`, async ({ page }, info) => {
    await page.setContent(`<html lang="en"><head><title>Detector fixture</title></head><body><main><h1>Fixture</h1>${markup}</main></body></html>`)
    const results = await new AxeBuilder({ page }).withTags(accessibilityTags).analyze()
    await info.attach('detected-violations', { body: JSON.stringify(results.violations, null, 2), contentType: 'application/json' })
    expect(results.violations.map(v => v.id)).toContain(rule)
    // The same zero-violation assertion used by the application scanner rejects it.
    expect(() => expect(results.violations).toEqual([])).toThrow()
  })
}

test('detector rejects absent visible focus', async ({ page }) => {
  await page.setContent('<style>button:focus { outline:none; box-shadow:none }</style><button>Save</button>')
  await page.keyboard.press('Tab')
  await expect(visibleFocus(page.getByRole('button'))).rejects.toThrow(/visible indicator/)
})

test('detector rejects broken Enter activation', async ({ page }) => {
  await page.setContent('<div role="button" tabindex="0">Open</div><section hidden>Panel</section>')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')
  const opened = await page.locator('section').isVisible()
  expect(opened).toBe(false)
  expect(() => expect(opened, 'Enter must open panel').toBe(true)).toThrow()
})

test('detector rejects a keyboard trap', async ({ page }) => {
  await page.setContent('<style>:focus-visible { outline: 2px solid blue }</style><button id="trap">Trap</button><button>Exit</button>')
  await page.locator('#trap').evaluate(el => el.addEventListener('keydown', e => { if ((e as KeyboardEvent).key === 'Tab') e.preventDefault() }))
  await page.keyboard.press('Tab')
  await expect(tabTo(page, page.getByRole('button', { name: 'Exit' }), 3)).rejects.toThrow(/Keyboard trap/)
})

test('modal contract rejects escaped focus in an inaccessible modal', async ({ page }) => {
  await page.setContent('<button>Background</button><div role="dialog" aria-label="Fixture" aria-modal="true"><button>Close</button></div>')
  await page.getByRole('button', { name: 'Close' }).focus()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  const contained = await page.getByRole('dialog').evaluate(el => el.contains(document.activeElement))
  expect(contained).toBe(false)
  expect(() => expect(contained, 'Modal must contain keyboard focus').toBe(true)).toThrow()
})
