import AxeBuilder from '@axe-core/playwright'
import { writeFile } from 'node:fs/promises'
import { expect, type Locator, type Page, type TestInfo } from '@playwright/test'
import { navigationReady } from './navigation'

// Include best practices as well as all supported WCAG A/AA rules through 2.2.
export const accessibilityTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']
export async function scan(page: Page, info: TestInfo, state: string) {
  const results = await new AxeBuilder({ page }).withTags(accessibilityTags).analyze()
  const report = {
    route: new URL(page.url()).pathname,
    theme: await page.locator('html').getAttribute('data-theme'),
    viewport: page.viewportSize(), state,
    violations: results.violations.map(v => ({
      rule: v.id, impact: v.impact, description: v.description, criterion: v.tags,
      documentation: v.helpUrl, remediation: v.help,
      elements: v.nodes.map(n => ({ selector: n.target, element: n.html, actual: n.failureSummary })),
    })),
    incomplete: results.incomplete.map(v => ({ rule: v.id, documentation: v.helpUrl, selectors: v.nodes.map(n => n.target) })),
  }
  const path = info.outputPath(`accessibility-${state}.json`)
  await writeFile(path, JSON.stringify(report, null, 2))
  await info.attach(`accessibility-${state}`, { path, contentType: 'application/json' })
  expect(report.violations, JSON.stringify(report, null, 2)).toEqual([])
}

export async function ready(page: Page) {
  await navigationReady(page)
  await page.evaluate(() => document.fonts.ready)
}

// Keyboard-origin focus must have a discernible outline or shadow, be in view,
// and not be covered at its center. Contrast/complex backgrounds still need review.
export async function visibleFocus(control: Locator) {
  await expect(control).toBeFocused()
  await expect(control).toBeInViewport()
  await expect.poll(() => control.evaluate(el => {
    const style = getComputedStyle(el)
    // Inline links can wrap across lines: the union box's center may be blank
    // space, so hit-test actual fragments rather than reporting false occlusion.
    const unobscured = [...el.getClientRects()].some(rect => {
      if (!rect.width || !rect.height) return false
      const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)
      return !!hit && (hit === el || el.contains(hit))
    })
    return {
      visible: (parseFloat(style.outlineWidth) >= 2 && !['none', 'hidden'].includes(style.outlineStyle) && !['transparent', 'rgba(0, 0, 0, 0)'].includes(style.outlineColor)) || style.boxShadow !== 'none',
      unobscured,
    }
  }), { message: 'Focused control needs a visible indicator and must not be obscured' }).toMatchObject({ visible: true, unobscured: true })
}

export async function tabTo(page: Page, control: Locator, limit = 50) {
  // Diagnose stale targets before entering a keyboard journey.
  await expect(control, 'Keyboard target must exist exactly once').toHaveCount(1)
  for (let i = 0; i < limit; i++) {
    await page.keyboard.press('Tab')
    const focused = page.locator(':focus')
    if (await focused.count() && await focused.evaluate(el => el !== document.body)) {
      expect(await focused.evaluate(el => !!el.closest('[inert], [hidden], [aria-hidden="true"]')), 'Hidden controls must not enter Tab order').toBe(false)
      await visibleFocus(focused)
    }
    if (await control.evaluate(el => el === document.activeElement)) return
  }
  throw new Error(`Keyboard trap or unreachable control: ${await control.getAttribute('aria-label') || await control.textContent()}`)
}
