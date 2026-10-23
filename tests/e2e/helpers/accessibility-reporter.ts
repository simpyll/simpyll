import type { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter'
import { appendFileSync } from 'node:fs'
import process from 'node:process'
import { stripVTControlCharacters } from 'node:util'

export default class AccessibilityReporter implements Reporter {
  private failures: string[] = []
  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status === test.expectedStatus || result.status === 'skipped') return
    const message = stripVTControlCharacters(result.errors.map(error => error.message || '').join('\n')).replace(/`/g, "'").slice(0, 6000)
    this.failures.push(`### ${test.titlePath().join(' / ')}\n\nExpected: ${test.expectedStatus}; actual: ${result.status}.\n\n\`\`\`text\n${message}\n\`\`\`\n`)
  }
  onEnd(result: FullResult) {
    if (!process.env.GITHUB_STEP_SUMMARY) return
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Browser and accessibility gate: ${result.status}\n\nWCAG 2.0/2.1/2.2 A/AA and best-practice scans plus keyboard contracts. Automated passes do not establish conformance.\n\n${this.failures.slice(0, 12).join('\n') || 'No unexpected browser test failures.'}\n\nSee playwright-results for JSON axe details (including incomplete/manual-review results), screenshots, traces and HTML report.\n`)
  }
}
