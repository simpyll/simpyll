
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'

const pr = await readFile('.github/workflows/validate.yml', 'utf8')
const deploy = await readFile('.github/workflows/deploy.yml', 'utf8')

function inventory(config, extra = []) {
  const args = ['test', '--list', '--reporter=json']

  if (config) args.push('--config', config)
  args.push(...extra)

  const result = spawnSync(
    'node_modules/.bin/playwright',
    args,
    { encoding: 'utf8', maxBuffer: 10e6 },
  )

  assert.equal(result.status, 0, result.stderr)

  const found = []

  function walk(suite) {
    for (const spec of suite.specs ?? []) {
      for (const item of spec.tests) {
        found.push(`${item.projectName}:${spec.id}`)
      }
    }

    for (const child of suite.suites ?? []) {
      walk(child)
    }
  }

  for (const suite of JSON.parse(result.stdout).suites) {
    walk(suite)
  }

  return found.sort()
}

test(
  'required validation gate fails closed for failed, cancelled and skipped jobs',
  () => {
    const match = pr.match(/node -e '([^']+)'/)
    assert.ok(match, 'Expected a validation gate script')

    const code = match[1]

    const run = results =>
      spawnSync(process.execPath, ['-e', code], {
        env: {
          ...process.env,
          RESULTS: JSON.stringify(
            Object.fromEntries(
              results.map((result, i) => [
                String(i),
                { result },
              ]),
            ),
          ),
        },
      }).status

    assert.equal(run(['success', 'success', 'success']), 0)

    for (const result of ['failure', 'cancelled', 'skipped']) {
      assert.notEqual(
        run(['success', result, 'success']),
        0,
      )
    }

    assert.match(
      pr,
      /validate:\n    if: always\(\)\n    needs: \[build, browser, fixtures\]/,
    )
  },
)

test(
  'PR shards cover the complete critical browser inventory',
  () => {
    const all = inventory('playwright.pr.config.ts')

    const shards = [1, 2]
      .flatMap(n =>
        inventory('playwright.pr.config.ts', [
          `--shard=${n}/2`,
        ]),
      )
      .sort()

    assert.ok(all.length > 0)
    assert.deepEqual(shards, all)
    assert.equal(new Set(shards).size, all.length)

    for (const project of [
      'desktop-chromium',
      'mobile-chromium',
      'accessibility-firefox',
      'accessibility-webkit',
    ]) {
      assert.ok(
        all.some(id => id.startsWith(`${project}:`)),
        `Missing critical coverage for ${project}`,
      )
    }
  },
)

test(
  'full browser inventory remains available without dropped tests',
  () => {
    const all = inventory(null)

    const shards = [1, 2, 3]
      .flatMap(n =>
        inventory(null, [`--shard=${n}/3`]),
      )
      .sort()

    assert.ok(all.length > 0)
    assert.deepEqual(shards, all)
    assert.equal(new Set(shards).size, all.length)

    for (const project of [
      'desktop-chromium',
      'mobile-chromium',
      'accessibility-firefox',
      'accessibility-webkit',
      'desktop-firefox',
      'desktop-webkit',
      'mobile-webkit',
    ]) {
      assert.ok(
        all.some(id => id.startsWith(`${project}:`)),
        `Missing full-suite coverage for ${project}`,
      )
    }
  },
)

test(
  'production deployment builds once and retains release safeguards',
  () => {
    const [beforeVerify, verify] = deploy.split('  verify:')

    assert.ok(beforeVerify)
    assert.ok(verify)

    assert.match(
      beforeVerify,
      /git merge-base --is-ancestor HEAD origin\/main/,
    )

    assert.match(beforeVerify, /run: npm run build/)
    assert.equal(
      (beforeVerify.match(/run: npm run build/g) ?? []).length,
      1,
    )

    assert.match(beforeVerify, /needs: build/)
    assert.match(verify, /needs: \[build, deploy\]/)

    assert.match(
      beforeVerify,
      /actions\/upload-pages-artifact@/,
    )

    assert.match(
      beforeVerify,
      /actions\/deploy-pages@/,
    )

    assert.match(
      beforeVerify,
      /path: dist\/deployment\.json/,
    )

    assert.match(
      verify,
      /name: production-manifest/,
    )

    for (const command of ['smoke:http', 'smoke:browser']) {
      assert.ok(
        verify.includes(`run: npm run ${command}`),
        `Missing post-deployment ${command}`,
      )
    }

    assert.doesNotMatch(
      beforeVerify,
      /run: npm run test:e2e:built/,
    )

    assert.doesNotMatch(
      beforeVerify,
      /run: npm run test:notion:build/,
    )

    assert.doesNotMatch(
      beforeVerify,
      /uses: \.\/\.github\/actions\/browsers/,
    )
  },
)

test(
  'pull requests use focused browser tests while full coverage remains available',
  async () => {
    const critical = await readFile(
      'playwright.pr.config.ts',
      'utf8',
    )

    for (const pattern of [
      /accessibility-firefox/,
      /accessibility-webkit/,
      /lipidpath/,
      /navigation/,
      /missing-page/,
      /redirects/,
      /theme/,
    ]) {
      assert.match(critical, pattern)
    }

    assert.match(
      pr,
      /test:e2e:pr/,
    )

    assert.match(
      pr,
      /PLAYWRIGHT_FULL_MATRIX:/,
    )

    assert.match(
      pr,
      /--shard=\$\{\{ matrix.shard \}\}\/2/,
    )

    assert.match(
      pr,
      /--shard=\$\{\{ matrix.shard \}\}\/3/,
    )

    assert.doesNotMatch(
      deploy,
      /run: npm run test:e2e:built/,
    )

    assert.doesNotMatch(
      deploy,
      /run: npm run test:e2e:pr/,
    )

    assert.doesNotMatch(
      deploy,
      /PLAYWRIGHT_FULL_MATRIX: '1'/,
    )
  },
)

test(
  'extended browser matrix stays available independently of deployment',
  async () => {
    const config = await readFile(
      'playwright.config.ts',
      'utf8',
    )

    assert.match(config, /PLAYWRIGHT_FULL_MATRIX/)
    assert.match(config, /iPhone SE/)

    assert.match(pr, /schedule:/)
    assert.match(pr, /full_matrix:/)
    assert.match(pr, /PLAYWRIGHT_FULL_MATRIX:/)

    assert.equal(
      (pr.match(/run: npm run build\n/g) ?? []).length,
      1,
    )

    assert.match(
      pr,
      /browser:\n    needs: build/,
    )

    assert.match(
      deploy,
      /timeout-minutes: 15/,
    )

    assert.doesNotMatch(
      deploy,
      /run: npm run test:e2e:built/,
    )
  },
)
