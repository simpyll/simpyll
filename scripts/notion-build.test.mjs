import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, readdir, cp, symlink, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import { compile } from '@mdx-js/mdx'
import { synchronize } from './notion/publisher.mjs'
import { fixture, ROOT, png } from './notion/fixtures/api.mjs'
const exec = promisify(execFile)

test('Notion fixture reaches built HTML, metadata, sitemap and durable image through real pipeline', { timeout: 120_000 }, async t => {
  const root = await mkdtemp(join(tmpdir(), 'notion-build-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  for (const path of ['src', 'public', 'scripts', 'package.json', 'package-lock.json', 'index.html', 'vite.config.ts', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json']) {
    await cp(path, join(root, path), { recursive: true })
  }
  await symlink(resolve('node_modules'), join(root, 'node_modules'), 'dir')
  const options = { root, pageId: ROOT, api: fixture().api, imageDownloader: async () => ({ bytes: png, extension: 'png' }), validate: compile }
  await synchronize(options)
  try { await exec('npm', ['run', 'build'], { cwd: root, env: { ...process.env, SMOKE_BUILD_SHA: (await exec('git', ['rev-parse', 'HEAD'])).stdout.trim() }, maxBuffer: 2 * 1024 * 1024 }) } catch (error) { throw new Error(error.stdout + error.stderr) }
  const html = await readFile(join(root, 'dist/blog/notion-fixture/index.html'), 'utf8')
  assert.match(html, /<title>Notion fixture article \| Simpyll<\/title>/)
  assert.match(html, /rel="canonical" href="https:\/\/simpyll.com\/blog\/notion-fixture"/)
  assert.match(html, /Fixture intro/)
  assert.match(html, /<strong>Bold<\/strong>/)
  assert.match(html, /&lt;script&gt;/)
  assert.doesNotMatch(html, /signature=one|prod-files-secure/)
  const image = html.match(/src="(\/images\/optimized\/[^" ]+)"/)[1]
  assert.ok((await readFile(join(root, 'dist', image))).length > 0)
  assert.match(html, /srcSet=/i)
  assert.match(html, /<picture>/)
  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])
  assert.equal(schema.headline, 'Notion fixture article')
  assert.equal(schema.datePublished, '2026-10-20')
  assert.match(await readFile(join(root, 'dist/sitemap.xml'), 'utf8'), /https:\/\/simpyll.com\/blog\/notion-fixture/)
  assert.equal((await synchronize(options)).changed, false)
  assert.ok((await readdir(join(root, 'dist/blog'))).includes('hello-world'))
})
