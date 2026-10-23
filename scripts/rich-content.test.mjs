import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, cp, symlink, rm, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import { convertBlocks } from './notion/publisher.mjs'
import { block, rt } from './notion/fixtures/api.mjs'
const exec = promisify(execFile)

test('rich MDX fixture compiles, prerenders and hydrates through both publishing paths', { timeout: 180_000 }, async t => {
  const root = await mkdtemp(join(tmpdir(), 'rich-mdx-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  for (const path of ['content', 'src', 'public', 'scripts', 'tests', 'playwright.config.ts', 'package.json', 'package-lock.json', 'index.html', 'vite.config.ts', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json']) await cp(path, join(root, path), { recursive: true })
  await symlink(resolve('.git'), join(root, '.git'), 'dir')
  await rm(join(root, 'src/content/blog/publishing-test.mdx'), { force: true })
  await symlink(resolve('node_modules'), join(root, 'node_modules'), 'dir')
  const generated = await convertBlocks([
    block('heading_1', 'Notion heading'),
    block('paragraph', '<script>alert(1)</script> {globalThis.secret}'),
    block('callout', 'Notion informational content'),
    block('code', 'def notion_example():\n    return "safe"', { code: { rich_text: [rt('def notion_example():\n    return "safe"')], language: 'python' } }),
    { type: 'image', image: { caption: [rt('Notion caption')] } },
    { type: 'table', table: { table_width: 2, has_column_header: true, has_row_header: true }, children: [
      { type: 'table_row', table_row: { cells: [[rt('Setting')], [rt('Value')]] } },
      { type: 'table_row', table_row: { cells: [[rt('Enabled')], [rt('Yes')]] } },
    ] },
  ], async () => '/images/rich-fixture.svg')
  await writeFile(join(root, 'src/content/blog/rich-content-fixture.mdx'), await readFile('tests/fixtures/rich-content.mdx', 'utf8') + '\n' + generated)
  await writeFile(join(root, 'public/images/rich-fixture.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="320" viewBox="0 0 960 320"><rect width="960" height="320" fill="#176344"/><text x="60" y="175" fill="white" font-size="32">Markdown + Notion → shared renderer</text></svg>')
  try { await exec('npm', ['run', 'build'], { cwd: root, env: { ...process.env, SMOKE_BUILD_SHA: (await exec('git', ['rev-parse', 'HEAD'])).stdout.trim() }, maxBuffer: 3e6 }) } catch (error) { throw new Error(error.stdout + error.stderr) }
  const html = await readFile(join(root, 'dist/blog/rich-content-fixture/index.html'), 'utf8')
  assert.match(html, /class="hljs-keyword"/)
  assert.match(html, /scope="row"/)
  assert.match(html, /&lt;script&gt;alert/)
  assert.doesNotMatch(html, /<iframe|<script>alert/)
  try {
    await exec(resolve('node_modules/.bin/playwright'), ['test', 'rich-content.spec.ts', '--workers=2'], { cwd: root, env: { ...process.env, RICH_FIXTURE: '1' }, maxBuffer: 3e6 })
  } catch (error) {
    await cp(join(root, 'test-results'), 'artifacts/rich-content', { recursive: true }).catch(() => {})
    await cp(join(root, 'playwright-report'), 'artifacts/rich-content/report', { recursive: true }).catch(() => {})
    throw new Error(error.stdout + error.stderr)
  }
  // Keep review screenshots outside the temporary build, never production assets.
  await cp(join(root, 'test-results'), 'artifacts/rich-content', { recursive: true })
})
