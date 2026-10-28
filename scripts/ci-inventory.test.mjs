import test from 'node:test'
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'

async function inventory(root) {
  const entries = await readdir(root, { withFileTypes: true })
  return (await Promise.all(entries.map(entry => entry.isDirectory()
    ? inventory(`${root}/${entry.name}`)
    : entry.name.endsWith('.test.mjs') ? [`${root}/${entry.name}`] : []))).flat().sort()
}

test('every Node regression suite belongs to routine validation or an explicit build fixture', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'))
  const workflow = await readFile('.github/workflows/validate.yml', 'utf8')
  // These suites build isolated synthetic inputs and/or launch browsers. Keep
  // them sequential in the hosted fixture lane, never parallel with generation.
  const fixtures = [
    'scripts/notion-build.test.mjs', 'scripts/notion-growth.test.mjs',
    'scripts/preview-notion-build.test.mjs', 'scripts/projects-build.test.mjs',
    'scripts/recovery-build.test.mjs', 'scripts/rich-content.test.mjs',
  ]
  const routine = `${pkg.scripts['test:unit']} ${pkg.scripts['test:built']} scripts/ci-workflows.test.mjs scripts/lipidpath-ui.test.mjs scripts/seo-audit.test.mjs`
  assert.deepEqual((await inventory('scripts')).filter(path => !routine.split(/\s+/).includes(path) && !fixtures.includes(path)), [], 'Assign new tests to a CI tier')
  for (const path of fixtures) {
    assert.ok(!routine.split(/\s+/).includes(path), `${path} must remain isolated`)
    assert.ok(`${workflow} ${pkg.scripts['test:projects']} ${pkg.scripts['test:mdx']} ${pkg.scripts['test:notion:build']}`.includes(path), `${path} must have a fixture invocation`)
  }
  for (const script of ['test:unit', 'test:built', 'test:seo']) assert.ok(workflow.includes(`run: npm run ${script}`))
})
