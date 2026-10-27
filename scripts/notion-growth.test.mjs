import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, cp, symlink, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createHash } from 'node:crypto'
import { compile } from '@mdx-js/mdx'
import { synchronize } from './notion/publisher.mjs'
import { fixture, ROOT, page, block } from './notion/fixtures/api.mjs'
import { measureAssets, violations } from './performance/assets.mjs'

const exec = promisify(execFile)
test('isolated Notion content growth preserves static articles and budgets', { timeout: 240_000 }, async t => {
  const root = await mkdtemp(join(tmpdir(), 'notion-growth-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  for (const path of ['content', 'src', 'public', 'scripts', 'package.json', 'package-lock.json', 'performance-budgets.json', 'index.html', 'vite.config.ts', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json']) {
    await cp(path, join(root, path), { recursive: true })
  }
  // The synthetic publisher has its own manifest, and never touches real content.
  await symlink(resolve('.git'), join(root, '.git'), 'dir')
  await symlink(resolve('node_modules'), join(root, 'node_modules'), 'dir')
  const sha = (await exec('git', ['rev-parse', 'HEAD'])).stdout.trim()
  const marker = createHash('sha256').update('synthetic-20-0').digest('hex')
  for (const count of [50, 65]) {
    const content = Array.from({ length: count }, (_, i) => block('paragraph', `Synthetic passage ${i}. ` + Array.from({ length: 5 }, (_, j) => createHash('sha256').update(`synthetic-${i}-${j}`).digest('hex')).join(' ')))
    await synchronize({ root, pageId: ROOT, api: fixture({ pages: [page()], content }).api, validate: compile })
    try { await exec('npm', ['run', 'build'], { cwd: root, env: { ...process.env, SMOKE_BUILD_SHA: sha }, maxBuffer: 3e6 }) }
    catch (error) { throw new Error(error.stdout + error.stderr) }
    const html = await readFile(join(root, 'dist/blog/notion-fixture/index.html'), 'utf8')
    assert.ok(html.includes(marker), 'full fixture body is prerendered')
    assert.ok(html.includes(`Synthetic passage ${count - 1}`), 'last paragraph is prerendered')
    const manifest = JSON.parse(await readFile(join(root, 'dist/.vite/manifest.json'), 'utf8'))
    const seen = new Set()
    const visit = key => { if (seen.has(key)) return; seen.add(key); for (const dependency of manifest[key].imports ?? []) visit(dependency) }
    Object.keys(manifest).filter(key => manifest[key].isEntry).forEach(visit)
    for (const key of seen) if (manifest[key].file.endsWith('.js')) assert.ok(!(await readFile(join(root, 'dist', manifest[key].file), 'utf8')).includes(marker), 'fixture body excluded from shared entry')
    const report = await measureAssets(join(root, 'dist'))
    assert.deepEqual(violations(report, JSON.parse(await readFile(join(root, 'performance-budgets.json'), 'utf8'))), [])
  }
})
