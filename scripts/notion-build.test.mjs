import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, readdir, cp, symlink, rm, readFile, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import { compile } from '@mdx-js/mdx'
import { synchronize } from './notion/publisher.mjs'
import { fixture, ROOT, png, page, rt, blocks } from './notion/fixtures/api.mjs'
const exec = promisify(execFile)

test('Notion fixture reaches built HTML, metadata, sitemap and durable image through real pipeline', { timeout: 120_000 }, async t => {
  const root = await mkdtemp(join(tmpdir(), 'notion-build-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  for (const path of ['content', 'src', 'public', 'scripts', 'tests', 'playwright.config.ts', 'package.json', 'performance-budgets.json', 'package-lock.json', 'index.html', 'vite.config.ts', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json']) {
    await cp(path, join(root, path), { recursive: true })
  }
  await symlink(resolve('.git'), join(root, '.git'), 'dir')
  await rm(join(root, 'src/content/blog/publishing-test.mdx'), { force: true })
  await symlink(resolve('node_modules'), join(root, 'node_modules'), 'dir')
  const editorial = page()
  editorial.properties['Updated Date'] = { type: 'date', date: { start: '2026-10-25' } }
  editorial.properties['Revision Notes'] = { type: 'rich_text', rich_text: [rt(JSON.stringify([{ date: '2026-10-25', description: 'Updated the React examples.' }]))] }
  editorial.properties.Corrections = { type: 'rich_text', rich_text: [rt(JSON.stringify([{ date: '2026-10-24', description: 'Corrected hydration behavior.', id: 'hydration' }, { date: '2026-10-23', description: 'Corrected the command name.' }]))] }
  const manual = { articleId: 'manual:editorial-fixture', title: 'Editorial metadata fixture', description: 'Manual editorial metadata example.', date: '2026-10-20', updatedAt: '2026-10-25', author: 'David Becker', category: 'Technology', tags: [], revisions: [{ date: '2026-10-25', description: 'Updated the React examples.' }], corrections: [{ date: '2026-10-24', description: 'Corrected hydration behavior.', id: 'hydration' }, { date: '2026-10-23', description: 'Corrected the command name.' }] }
  await writeFile(join(root, 'src/content/blog/editorial-fixture.mdx'), `export const metadata = ${JSON.stringify(manual)}\n\n## Example\n\nThis is an isolated editorial example.\n`)
  await writeFile(join(root, 'src/content/blog/editorial-same-day.mdx'), `export const metadata = ${JSON.stringify({ ...manual, articleId: 'manual:editorial-same-day', title: 'Same-day editorial metadata fixture', description: 'A separate example with publication and revision on the same day.', updatedAt: manual.date, revisions: [], corrections: [] })}\n\nSame-day example.\n`)
  const richBlocks = [
    ...blocks,
    { type: 'bookmark', bookmark: { url: 'https://example.com/reference', caption: [rt('Rich block reference')] } },
    { type: 'file', file: { type: 'external', external: { url: 'https://example.com/report.pdf' } } },
    { type: 'table', table: { table_width: 2, has_column_header: true, has_row_header: true }, children: [
      { type: 'table_row', table_row: { cells: [[rt('Measure')], [rt('Value')]] } },
      { type: 'table_row', table_row: { cells: [[rt('Row label')], [rt('Formatted value', { bold: true })]] } },
    ] },
  ]
  const options = { root, pageId: ROOT, api: fixture({ pages: [editorial], content: richBlocks }).api, imageDownloader: async () => ({ bytes: png, extension: 'png' }), validate: compile }
  const renamed = page()
  for (const slug of ['notion-original', 'notion-middle']) {
    renamed.properties.Slug.rich_text = [rt(slug)]
    await synchronize({ ...options, api: fixture({ pages: [renamed] }).api })
  }
  await synchronize(options)
  try { await exec('npm', ['run', 'build'], { cwd: root, env: { ...process.env, SMOKE_BUILD_SHA: (await exec('git', ['rev-parse', 'HEAD'])).stdout.trim() }, maxBuffer: 2 * 1024 * 1024 }) } catch (error) { throw new Error(error.stdout + error.stderr) }
  for (const alias of ['notion-original', 'notion-middle']) {
    const stub = await readFile(join(root, `dist/blog/${alias}/index.html`), 'utf8')
    assert.match(stub, /content="0;url=https:\/\/simpyll.com\/blog\/notion-fixture"/)
    assert.match(stub, /<a href="https:\/\/simpyll.com\/blog\/notion-fixture">/)
    assert.doesNotMatch(await readFile(join(root, 'dist/sitemap.xml'), 'utf8'), new RegExp(alias))
  }
  const html = await readFile(join(root, 'dist/blog/notion-fixture/index.html'), 'utf8')
  assert.match(html, /<title>Notion fixture article \| Simpyll<\/title>/)
  assert.match(html, /rel="canonical" href="https:\/\/simpyll.com\/blog\/notion-fixture"/)
  assert.match(html, /Fixture intro/)
  for (const expected of ['Rich block reference', 'report.pdf (PDF)', 'scope="col"', 'scope="row"', '<strong>Formatted value</strong>', 'alt="One-pixel fixture"', '<figcaption>Fixture image</figcaption>']) assert.ok(html.includes(expected), expected)
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
  assert.equal(schema.dateModified, '2026-10-25')
  assert.match(html, /id="editorial-correction-hydration"/)
  assert.match(html, /Revision history/)
  const beforeRebuild = await readFile(join(root, 'src/content/blog/notion-fixture.mdx'), 'utf8')
  assert.equal((await synchronize(options)).changed, false)
  assert.equal(await readFile(join(root, 'src/content/blog/notion-fixture.mdx'), 'utf8'), beforeRebuild)
  const manualHtml = await readFile(join(root, 'dist/blog/editorial-fixture/index.html'), 'utf8')
  assert.match(manualHtml, /Updated <time dateTime="2026-10-25"/)
  assert.match(await readFile(join(root, 'dist/sitemap.xml'), 'utf8'), /<lastmod>2026-10-25<\/lastmod>/)
  assert.match(await readFile(join(root, 'dist/sitemap.xml'), 'utf8'), /https:\/\/simpyll.com\/blog\/notion-fixture/)
  assert.equal((await synchronize(options)).changed, false)
  try { const browserRun = exec(resolve('node_modules/.bin/playwright'), ['test', 'redirects.spec.ts', 'editorial.spec.ts', '--project=desktop-chromium', '--project=mobile-chromium', '--workers=2'], { cwd: root, env: { ...process.env, REDIRECT_FIXTURE: '1', EDITORIAL_FIXTURE: '1', PLAYWRIGHT_PREVIEW_PORT: '4174' }, maxBuffer: 3e6 })
    browserRun.child.stdout.on('data', chunk => process.stdout.write(chunk))
    browserRun.child.stderr.on('data', chunk => process.stderr.write(chunk))
    await browserRun
  } catch (error) {
    await mkdir('artifacts/editorial', { recursive: true })
    await cp(join(root, 'test-results'), 'artifacts/editorial', { recursive: true }).catch(() => {})
    throw new Error(error.stdout + error.stderr)
  }
  await mkdir('artifacts/editorial', { recursive: true })
  await cp(join(root, 'test-results'), 'artifacts/editorial', { recursive: true })
  assert.ok((await readdir(join(root, 'dist/blog'))).includes('hello-world'))
})
