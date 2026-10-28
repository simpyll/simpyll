import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'

const pr = await readFile('.github/workflows/validate.yml', 'utf8')
const deploy = await readFile('.github/workflows/deploy.yml', 'utf8')
const awaitPackage = await readFile('package.json', 'utf8')

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
  assert.notEqual(run([]), 0)
  assert.notEqual(run([['build', 'success']]), 0)
  assert.notEqual(run([['build', 'success'], ['browser', 'success'], ['fixtures', 'success']], 'push'), 0)
  for (const bad of ['failure', 'cancelled', 'skipped']) {
    assert.notEqual(run([['build', bad], ['browser', 'skipped'], ['fixtures', 'skipped']]), 0)
  }
  assert.notEqual(run([['build', 'success'], ['browser', 'failure'], ['fixtures', 'skipped']]), 0)
  for (const event of ['schedule', 'workflow_dispatch']) {
    assert.equal(run([['build', 'success'], ['browser', 'success'], ['fixtures', 'success']], event), 0)
    for (const name of ['browser', 'fixtures']) {
      for (const bad of ['failure', 'cancelled', 'skipped']) {
        const results = [['build', 'success'], ['browser', 'success'], ['fixtures', 'success']]
        results.find(([job]) => job === name)[1] = bad
        assert.notEqual(run(results, event), 0, `${event}: ${name} ${bad} must fail`)
      }
    }
  }
  assert.notEqual(run([['build', 'success'], ['browser', 'skipped'], ['fixtures', 'cancelled']]), 0)
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
  assert.match(pr, /run: npm run test:unit/)
  assert.match(pr, /run: npm run audit:licenses/)
  const pkg = JSON.parse(awaitPackage)
  assert.doesNotMatch(pkg.scripts['test:unit'], /(?:preview-notion|projects|recovery)-build\.test/)
  assert.match(pr, /scripts\/lipidpath\.test\.mjs scripts\/lipidpath-ui\.test\.mjs/)
  assert.match(pr, /scripts\/projects\.test\.mjs/)
  assert.match(pr, /npm audit --audit-level=high/)
  assert.equal((pr.match(/run: npm run build\n/g) ?? []).length, 1)
})

test('full browser regression and publishing fixture checks remain available off PRs', () => {
  assert.match(pr, /run: npm run test:e2e:built/)
  assert.match(pr, /run: npm run test:notion:build/)
  assert.match(pr, /run: node --test scripts\/preview-notion-build.test.mjs/)
  assert.match(pr, /run: node --test scripts\/recovery-build.test.mjs/)
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

test('artifact consumers reject missing, malformed and mismatched release identity', async t => {
  const { mkdtemp, mkdir, writeFile, rm } = await import('node:fs/promises')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const root = await mkdtemp(join(tmpdir(), 'ci-artifact-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const commands = [...pr.matchAll(/node --input-type=module -e '([^']+)'/g)].map(match => match[1])
  assert.equal(commands.length, 3, 'browser, fixtures and performance all verify embedded release identity')
  await mkdir(join(root, 'dist'))
  const sha = 'a'.repeat(40)
  await writeFile(join(root, 'ci-revision.txt'), sha + '\n')
  for (const command of commands) {
    const run = () => spawnSync(process.execPath, ['--input-type=module', '-e', command], { cwd: root }).status
    for (const content of ['{}', '{broken', JSON.stringify({ sha: 'b'.repeat(40) })]) {
      await writeFile(join(root, 'dist/deployment.json'), content)
      assert.notEqual(run(), 0)
    }
    await rm(join(root, 'dist/deployment.json'))
    assert.notEqual(run(), 0)
    await writeFile(join(root, 'dist/deployment.json'), JSON.stringify({ sha }))
    assert.equal(run(), 0)
  }
})

test('PR trust boundary and active full shards cannot silently lose required work', () => {
  assert.doesNotMatch(pr, /pull_request_target|paths-ignore:|\n\s+paths:|continue-on-error:/)
  assert.doesNotMatch(pr, /secrets\.|contents: write|pages: write|id-token: write/)
  assert.match(pr, /permissions:\n  contents: read/)
  assert.match(pr, /persist-credentials: false/)
  assert.match(pr, /matrix:\n        shard: \[1, 2, 3\]/)
  assert.doesNotMatch(pr, /matrix.mode/)
  assert.match(pr, /cancel-in-progress: true/)
  assert.match(deploy, /group: pages\n  cancel-in-progress: false/)
  assert.match(deploy, /ref: \$\{\{ inputs.ref \|\| github.sha \}\}/)
  assert.match(deploy, /SMOKE_EXPECTED_SHA: \$\{\{ needs.build.outputs.revision \}\}/)
  // Artifact download defaults to this run; no privileged workflow_run bridge.
  assert.doesNotMatch(pr + deploy, /workflow_run:|run-id:|repository:.*head/)
})
