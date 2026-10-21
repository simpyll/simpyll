import { test, expect } from '@playwright/test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Button } from '../../src/components/Button'
import { Card } from '../../src/components/Card'
import { Badge } from '../../src/components/Badge'

// Render the actual primitives without adding a public showcase route or production UI.
async function fixtureMarkup() {
  return renderToStaticMarkup(createElement('form', { id: 'design-system-fixture' },
    createElement(Card, { padding: 'roomy', 'aria-label': 'Example card' },
      createElement(Badge, { children: 'React' }),
      createElement(Button, { children: 'Primary', name: 'action', value: 'save' }),
      createElement(Button, { children: 'Secondary', variant: 'secondary' }),
      createElement(Button, { children: 'Unavailable', disabled: true }),
      createElement(Button, { children: 'Submit', type: 'submit' }),
    ),
  ))
}

function luminance(hex: string) {
  if (/^#[a-f\d]{3}$/i.test(hex)) hex = '#' + [...hex.slice(1)].map(c => c + c).join('')
  const values = hex.match(/[a-f\d]{2}/gi)!.map(value => {
    const channel = parseInt(value, 16) / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722
}

function contrast(a: string, b: string) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

for (const theme of ['light', 'dark']) {
test(`semantic text, action and focus roles meet contrast: ${theme}`, async ({ page }) => {
  await page.goto('/')
  if (await page.locator('html').getAttribute('data-theme') !== theme) await page.getByRole('button', { name: `Switch to ${theme} theme` }).click()
  const tokens = await page.evaluate(() => {
    const styles = getComputedStyle(document.documentElement)
    return Object.fromEntries(['canvas', 'surface', 'surface-hover', 'foreground', 'muted', 'subtle', 'accent', 'accent-hover', 'on-accent', 'focus', 'control-outline']
      .map(name => [name, styles.getPropertyValue(`--ui-${name}`).trim()]))
  })
  for (const surface of ['canvas', 'surface', 'surface-hover']) {
    for (const text of ['foreground', 'muted', 'subtle', 'accent']) {
      expect(contrast(tokens[text], tokens[surface]), `${text} on ${surface}`).toBeGreaterThanOrEqual(4.5)
    }
    expect(contrast(tokens.focus, tokens[surface])).toBeGreaterThanOrEqual(3)
    expect(contrast(tokens['control-outline'], tokens[surface])).toBeGreaterThanOrEqual(3)
  }
  for (const background of ['accent', 'accent-hover']) {
    expect(contrast(tokens['on-accent'], tokens[background])).toBeGreaterThanOrEqual(4.5)
  }
})

}

test('button recipes preserve native keyboard, disabled and form semantics', async ({ page }) => {
  await page.goto('/')
  const markup = await fixtureMarkup()
  await page.evaluate(html => {
    document.querySelector('main')!.innerHTML = html
    const form = document.querySelector('form')!
    form.addEventListener('submit', event => {
      event.preventDefault()
      form.dataset.submitted = 'true'
    })
  }, markup)
  const primary = page.getByRole('button', { name: 'Primary', exact: true })
  await expect(primary).toHaveAttribute('type', 'button')
  await expect(primary).toHaveAttribute('name', 'action')
  await primary.focus()
  await page.keyboard.press('Space')
  await expect(page.locator('form')).not.toHaveAttribute('data-submitted', 'true')
  await page.keyboard.press('Tab')
  const secondary = page.getByRole('button', { name: 'Secondary', exact: true })
  await expect(secondary).toBeFocused()
  await expect(secondary).toHaveCSS('outline-style', 'solid')
  await expect(secondary).toHaveCSS('outline-width', '2px')
  await expect(secondary).toHaveCSS('outline-offset', '4px')
  const disabled = page.getByRole('button', { name: 'Unavailable' })
  await expect(disabled).toBeDisabled()
  await expect(disabled).toHaveCSS('opacity', '0.5')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Submit', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('form')).toHaveAttribute('data-submitted', 'true')
  await expect(page.locator('.ui-badge')).not.toHaveAttribute('tabindex')
})

test('semantic overrides reach utilities and prose without a theme controller', async ({ page }) => {
  await page.goto('/blog/001-python-fundamentals')
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--ui-canvas', '#101010')
    document.documentElement.style.setProperty('--ui-accent', '#ffffff')
  })
  await expect(page.getByRole('main')).toHaveCSS('background-color', 'rgb(16, 16, 16)')
  await expect(page.locator('header .text-accent')).toHaveCSS('color', 'rgb(255, 255, 255)')
  await expect(page.locator('.prose a').first()).toHaveCSS('color', 'rgb(255, 255, 255)')
})

test('smallest supported viewport fits navigation and reduced motion removes hover travel', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const nav = page.getByRole('navigation', { name: 'Main navigation' })
  await nav.getByRole('button', { name: 'More' }).click()
  for (const name of ['Projects', 'Journal', 'About']) {
    await expect(nav.getByRole('link', { name, exact: true }).filter({ visible: true })).toBeInViewport()
  }
  const link = page.locator('#navigation-overflow').getByRole('link', { name: 'Projects' })
  await link.focus()
  await expect(link).toHaveCSS('outline-style', 'solid')
  await expect(link).toHaveCSS('transition-duration', '0s')
  await expect(page.locator('[data-reveal]').first()).toHaveCSS('transform', 'none')
  const markup = renderToStaticMarkup(createElement(Card, { hoverable: true, children: 'Hover card' }))
  await page.evaluate(html => document.querySelector('main')!.insertAdjacentHTML('afterbegin', html), markup)
  const card = page.getByText('Hover card', { exact: true })
  await card.hover()
  await expect(card).toHaveCSS('translate', '0px')
  await expect(card).toHaveCSS('transform', 'none')
})
