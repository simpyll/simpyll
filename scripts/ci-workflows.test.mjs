import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'

const pr = await readFile('.github/workflows/validate.yml', 'utf8')
const deploy = await readFile('.github/workflows/deploy.yml', 'utf8')

test('required validate gate fails closed on build failures and other non-skipped errors', () => {
  const match = pr.match(/node -e '([^']+)'/)
  assert.ok(match, 'Required validation gate must have a fail-closed script')
  const run = (results, event = 'pull_request') => spawnSync(process.execPath, ['-e', match[1]], {
    env: {
      ...process.env,
      EVENT: event,
      RESULTS: JSON.stringify(Object.fromEntries(results.map(([name, result]) => [name, { result }]))),
    },
  }).status

  assert.equal(run([['build', 'success'], ['browser', 'skipped'], ['fixtures', 'skipped']]), 0)
  for (const bad of ['failure', 'cancelled', 'skipped']) {
    assert.notEqual(run([['build', bad], ['browser', 'skipped'], ['fixtures', 'skipped']]), 0)
  }
  assert.notEqual(run([['build', 'success'], ['browser', 'failure'], ['fixtures', 'skipped']]), 0)
  assert.notEqual(run([['build', 'success'], ['browser', 'skipped'], ['fixtures', 'skipped']], 'schedule'), 0)
  assert.match(pr, /validate:\n    if: always\(\)\n    needs: \[build, browser, fixtures\]/)
})

test('routine PRs do not schedule costly browser, fixture or Lighthouse jobs', () => {
  for (const job of ['browser', 'fixtures', 'performance']) {
    assert.match(pr, new RegExp(`  ${job}:\\n    if: github.event_name != 'pull_request'`))
  }
  assert.match(pr, /pull_request:\n    branches: \[main\]/)
  assert.match(pr, /schedule:/)
  assert.match(pr, /workflow_dispatch:/)
  assert.match(pr, /run: npm run build/)
  assert.match(pr, /run: npm run lint/)
  assert.match(pr, /scripts\/lipidpath\.test\.mjs scripts\/lipidpath-ui\.test\.mjs/)
  assert.match(pr, /scripts\/projects\.test\.mjs/)
  assert.match(pr, /npm audit --audit-level=high/)
  assert.equal((pr.match(/run: npm run build\n/g) ?? []).length, 1)
})

test('full browser regression and publishing fixture checks remain available off PRs', () => {
  assert.match(pr, /run: npm run test:e2e:built/)
  assert.match(pr, /run: npm run test:notion:build/)
  assert.match(pr, /run: npm run test:mdx/)
  assert.match(pr, /run: npm run perf:lighthouse/)
  assert.match(pr, /run: npm run test:projects/)
  assert.match(pr, /PLAYWRIGHT_FULL_MATRIX:/)
})

test('production deployment builds once, preserves manifest and verifies published release', () => {
  const [beforeVerify, verify] = deploy.split('  verify:')
  assert.ok(beforeVerify && verify)
  assert.match(beforeVerify, /git merge-base --is-ancestor HEAD origin\/main/)
  assert.equal((beforeVerify.match(/run: npm run build/g) ?? []).length, 1)
  assert.match(beforeVerify, /needs: build/)
  assert.match(beforeVerify, /actions\/upload-pages-artifact@/)
  assert.match(beforeVerify, /actions\/deploy-pages@/)
  assert.match(beforeVerify, /path: dist\/deployment\.json/)
  assert.match(verify, /needs: \[build, deploy\]/)
  assert.match(verify, /run: npm run smoke:http/)
  assert.match(verify, /run: npm run smoke:browser/)
  assert.doesNotMatch(beforeVerify, /run: npm run test:e2e:built/)
  assert.doesNotMatch(beforeVerify, /run: npm run test:notion:build/)
  assert.doesNotMatch(beforeVerify, /uses: \.\/\.github\/actions\/browsers/)
})
