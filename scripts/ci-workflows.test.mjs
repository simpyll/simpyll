import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'

const pr = await readFile('.github/workflows/validate.yml', 'utf8')
test('required validation gate fails closed for failure, cancellation and skipped jobs', () => {
  const code = pr.match(/node -e '([^']+)'/)[1]
  const run = results => spawnSync(process.execPath, ['-e', code], {
    env: { ...process.env, RESULTS: JSON.stringify(Object.fromEntries(results.map((result, i) => [String(i), { result }]))) },
  }).status
  assert.equal(run(['success', 'success', 'success']), 0)
  for (const result of ['failure', 'cancelled', 'skipped']) assert.notEqual(run(['success', result, 'success']), 0)
  assert.match(pr, /validate:\n    if: always\(\)\n    needs: \[build, browser, fixtures\]/)
})
test('shards partition the complete current browser inventory without dropping or duplicating tests', () => {
  function inventory(extra = []) {
    const result = spawnSync('node_modules/.bin/playwright', ['test', '--list', '--reporter=json', ...extra], { encoding: 'utf8', maxBuffer: 10e6 })
    assert.equal(result.status, 0, result.stderr)
    const ids = []
    function walk(suite) {
      for (const spec of suite.specs ?? []) for (const t of spec.tests) ids.push(`${t.projectName}:${spec.id}`)
      for (const child of suite.suites ?? []) walk(child)
    }
    for (const suite of JSON.parse(result.stdout).suites) walk(suite)
    return ids.sort()
  }
  const all = inventory()
  const shards = [1, 2, 3].flatMap(n => inventory([`--shard=${n}/3`])).sort()
  assert.ok(all.length > 0)
  assert.deepEqual(shards, all)
  assert.equal(new Set(shards).size, all.length)
  for (const project of ['desktop-chromium', 'mobile-chromium', 'accessibility-firefox', 'accessibility-webkit']) assert.ok(all.some(id => id.startsWith(project + ':')))
})
