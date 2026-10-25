import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { compile, evaluate } from '@mdx-js/mdx'
import * as runtime from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { synchronize, discoverSource, convertBlocks, notionClient, downloadImage, paginate, metadataFor, richText, API_VERSION } from './publisher.mjs'
import { ROOT, DB, SOURCE, PAGE, fixture, page, block, blocks, rt, png } from './fixtures/api.mjs'

async function setup(t) {
  const root = await mkdtemp(join(tmpdir(), 'notion-test-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(join(root, 'src/content/blog'), { recursive: true })
  await writeFile(join(root, 'src/content/blog/hello-world.mdx'), 'manual sample, never overwrite')
  const sync = (options = {}) => synchronize({ root, pageId: ROOT, api: fixture().api, imageDownloader: async () => ({ bytes: png, extension: 'png' }), validate: compile, ...options })
  return { root, sync }
}
async function snapshot(root) {
  const files = await readdir(root, { recursive: true, withFileTypes: true })
  return Object.fromEntries(await Promise.all(files.filter(f => f.isFile()).map(async f => {
    const path = join(f.parentPath, f.name)
    return [path.slice(root.length), (await readFile(path)).toString('base64')]
  })))
}

test('discovers nested database and actual data source using paginated children', async () => {
  const f = fixture({ nested: true })
  assert.equal((await discoverSource(f.api, ROOT)).id, SOURCE)
  assert.ok(f.calls.some(c => c.path.includes('start_cursor=second')))
  assert.equal((await discoverSource(f.api, DB)).id, SOURCE)
})
test('rejects ambiguous/missing source and permission failures', async () => {
  const f = fixture()
  await assert.rejects(discoverSource(async (path, body) => {
    if (path === `databases/${DB}`) return { data_sources: [{ id: SOURCE }, { id: PAGE }] }
    if (path === `data_sources/${PAGE}`) return { ...f.source, id: PAGE }
    return f.api(path, body)
  }, ROOT), /found 2/)
  await assert.rejects(discoverSource(async () => { const e = new Error('No access'); e.status = 403; throw e }, ROOT), /No access/)
  await assert.rejects(discoverSource(async (path, body) => path === `data_sources/${SOURCE}` ? { properties: {} } : f.api(path, body), ROOT), /found 0/)
})
test('publish, re-run unchanged with rotated image URL, update, rename, and unpublish preserve manual files', async t => {
  const { root, sync } = await setup(t)
  const f = fixture()
  assert.equal((await sync({ api: f.api })).changed, true)
  assert.deepEqual(f.calls.find(c => c.path.endsWith('/query')).body.filter, { property: 'Status', status: { equals: 'Published' } })
  const before = await snapshot(root)
  const changedUrl = structuredClone(blocks)
  changedUrl.at(-1).image.file.url += '&expires=later'
  assert.equal((await sync({ api: fixture({ content: changedUrl }).api })).changed, false)
  assert.deepEqual(await snapshot(root), before)
  const mdx = await readFile(join(root, 'src/content/blog/notion-fixture.mdx'), 'utf8')
  assert.doesNotMatch(mdx, /signature=|amazonaws/)
  const module = await evaluate(mdx, { ...runtime })
  assert.equal(module.metadata.title, 'Notion fixture article')
  assert.equal(module.metadata.author, 'David Becker')
  const html = renderToStaticMarkup(createElement(module.default))
  for (const text of ['<strong>', '<em>', '<a href=', '<ul>', '<ol>', '<blockquote>', '<pre><code class="language-plaintext">', '<img', 'Nested paragraph', '&lt;script&gt;', '{process.env.TOKEN}']) assert.ok(html.includes(text), text)
  const updated = page(); updated.properties.Name.title = [rt('Updated title')]
  await sync({ api: fixture({ pages: [updated], content: [block('paragraph', 'Updated body')] }).api })
  assert.match(await readFile(join(root, 'src/content/blog/notion-fixture.mdx'), 'utf8'), /Updated body/)
  updated.properties.Slug.rich_text = [rt('renamed-post')]
  await sync({ api: fixture({ pages: [updated], content: [] }).api })
  await assert.rejects(readFile(join(root, 'src/content/blog/notion-fixture.mdx')), { code: 'ENOENT' })
  await sync({ api: fixture({ pages: [] }).api })
  assert.deepEqual(await readdir(join(root, 'src/content/blog')), ['hello-world.mdx'])
  assert.equal(await readFile(join(root, 'src/content/blog/hello-world.mdx'), 'utf8'), 'manual sample, never overwrite')
  assert.equal((await sync({ api: fixture({ pages: [] }).api })).changed, false)
})
test('Draft, Ready and trashed articles never have their blocks fetched or written', async t => {
  const { sync } = await setup(t)
  const pages = ['Draft', 'Ready', 'Published'].map((status, i) => { const p = page({ id: String(i + 6).repeat(32), in_trash: i === 2 }); p.properties.Status.status.name = status; return p })
  const f = fixture({ pages, queryPages: true })
  assert.equal((await sync({ api: f.api })).changed, false)
  assert.ok(!f.calls.some(c => pages.some(p => c.path.startsWith(`blocks/${p.id}/`))))
})
test('dry-run validates without writing, and empty first run is a no-op', async t => {
  const { root, sync } = await setup(t), before = await snapshot(root)
  assert.equal((await sync({ dryRun: true })).changed, true)
  assert.deepEqual(await snapshot(root), before)
  assert.equal((await sync({ api: fixture({ pages: [] }).api })).changed, false)
})
test('duplicate/invalid/manual slugs fail without partially writing', async t => {
  const { root, sync } = await setup(t), before = await snapshot(root)
  const second = page({ id: '66666666666666666666666666666666' })
  await assert.rejects(sync({ api: fixture({ pages: [page(), second], queryPages: true }).api }), /Duplicate published slug/)
  for (const slug of ['../escape', 'Upper Case', 'hello-world', 'a'.repeat(101)]) {
    const p = page(); p.properties.Slug.rich_text = [rt(slug)]
    await assert.rejects(sync({ api: fixture({ pages: [p] }).api }), /Slug|collides|Redirect collision/)
  }
  assert.deepEqual(await snapshot(root), before)
})
test('unsupported blocks, image failures, compiler errors and mid-read status changes abort all writes', async t => {
  const { root, sync } = await setup(t)
  await sync()
  const before = await snapshot(root)
  const draft = page(); draft.properties.Status.status.name = 'Draft'
  for (const options of [
    { api: fixture({ content: [block('child_page', 'Private')] }).api },
    { imageDownloader: async () => { throw new Error('Download failure') } },
    { validate: async () => { throw new Error('Compile failure') } },
    { api: fixture({ latest: draft }).api },
    { api: fixture({ latest: page({ last_edited_time: 'new revision' }) }).api },
  ]) await assert.rejects(sync(options))
  assert.deepEqual(await snapshot(root), before)
})
test('manual changes to generated files and unsafe manifest paths are rejected', async t => {
  const { root, sync } = await setup(t)
  await sync()
  await writeFile(join(root, 'src/content/blog/notion-fixture.mdx'), 'manual modification')
  await assert.rejects(sync(), /manually changed/)
  await writeFile(join(root, '.notion/published.json'), JSON.stringify({ version: 1, articles: {}, files: { '../private': 'hash' } }))
  await assert.rejects(sync(), /Unsafe manifest/)
})
test('missing optional metadata has stable defaults, dates are validated, and select Status works', async t => {
  const p = page(); p.properties = { Name: p.properties.Name, Status: { type: 'select', select: { name: 'Published' } } }
  const m = metadataFor(p, undefined, [])
  assert.equal(m.slug, 'notion-fixture-article'); assert.equal(m.date, '2026-10-20'); assert.equal(m.category, 'Journal'); assert.deepEqual(m.tags, [])
  assert.equal(metadataFor(p, { slug: 'stable-url', date: '2025-01-01' }, []).slug, 'stable-url')
  const { sync } = await setup(t), f = fixture({ pages: [p], statusType: 'select' })
  await sync({ api: f.api })
  assert.equal(f.calls.find(c => c.body?.filter).body.filter.select.equals, 'Published')
  p.properties['Published Date'] = { date: { start: '2026-02-30' } }
  assert.throws(() => metadataFor(p, undefined, []), /Date/)
  p.properties.Name.title = []; assert.throws(() => metadataFor(p, undefined, []), /Name/)
})
test('API retries 429 with Retry-After and 5xx, uses current version, and redacts errors', async () => {
  const waits = [], requests = [], statuses = [429, 503, 200]
  const api = notionClient('secret-test-token', { wait: async ms => waits.push(ms), fetcher: async (url, options) => {
    requests.push({ url, options }); const status = statuses.shift()
    return new Response(status === 200 ? '{"ok":true}' : 'private response and secret-test-token', { status, headers: { 'Retry-After': '2' } })
  } })
  assert.deepEqual(await api('test', { test: true }), { ok: true })
  assert.ok(waits.includes(2000)); assert.equal(requests[0].options.headers['Notion-Version'], API_VERSION)
  await assert.rejects(notionClient('secret', { wait: async () => {}, fetcher: async () => new Response('secret', { status: 401 }) })('test'), error => error.message === 'Notion request failed (HTTP 401)')
  let count = 0
  await assert.rejects(notionClient('secret', { wait: async () => {}, fetcher: async () => { count++; return new Response('', { status: 429 }) } })('test'), /429/)
  assert.equal(count, 6)
})
test('invalid pagination, unsafe links and private block embeds fail closed', async () => {
  await assert.rejects(paginate(async () => ({ results: [], has_more: true, next_cursor: 'same' }), 'test'), /cursor/)
  assert.throws(() => richText([rt('Bad link', {}, 'javascript:alert(1)')]), /Unsafe/)
  await assert.rejects(convertBlocks([block('synced_block', '')], async () => ''), /Unsupported/)
})
test('downloads Notion files without credentials; validates hosts, size, MIME, redirects and retries', async () => {
  let count = 0
  const result = await downloadImage('https://prod-files-secure.s3.us-west-2.amazonaws.com/x?secret=signature', async (_url, options) => {
    assert.equal(options.headers, undefined); assert.equal(options.redirect, 'error')
    if (!count++) return new Response('', { status: 503 })
    return new Response(png, { headers: { 'Content-Type': 'image/png' } })
  }, async () => {})
  assert.deepEqual(result.bytes, png); assert.equal(result.extension, 'png'); assert.equal(count, 2)
  await assert.rejects(downloadImage('http://localhost/x'), /Unsafe/)
  await assert.rejects(downloadImage('https://localhost/x'), /host/)
  await assert.rejects(downloadImage('https://secure.notion-static.com/x', async () => new Response('<svg/>', { headers: { 'Content-Type': 'image/svg+xml' } })), /format/)
  await assert.rejects(downloadImage('https://secure.notion-static.com/x', async () => new Response(new Uint8Array(21 * 1024 * 1024), { headers: { 'Content-Type': 'image/png' } })), /20 MiB/)
})

test('Notion-hosted external images are localized, ordinary HTTPS images stay external', async t => {
  const { root, sync } = await setup(t)
  const content = [
    { type: 'image', image: { type: 'external', external: { url: 'https://secure.notion-static.com/upload.png?signed=secret' }, caption: [] } },
    { type: 'image', image: { type: 'external', external: { url: 'https://example.com/public.png' }, caption: [] } },
  ]
  let downloads = 0
  await sync({ api: fixture({ content }).api, imageDownloader: async () => { downloads++; return { bytes: png, extension: 'png' } } })
  assert.equal(downloads, 1)
  const text = await readFile(join(root, 'src/content/blog/notion-fixture.mdx'), 'utf8')
  assert.match(text, /example.com\/public.png/)
  assert.doesNotMatch(text, /signed=secret/)
})

test('revision cache reuses local bytes and preserves old public image URLs', async t => {
  const { root, sync } = await setup(t)
  const content = structuredClone(blocks)
  content.at(-1).last_edited_time = '2026-01-01T00:00:00Z'
  let downloads = 0
  const options = { api: fixture({ content }).api, imageDownloader: async () => { downloads++; return { bytes: png, extension: 'png' } } }
  await sync(options)
  const before = JSON.parse(await readFile(join(root, '.notion/published.json'), 'utf8'))
  const imagePath = Object.keys(before.files).find(p => p.startsWith('public/images/'))
  assert.match(imagePath, /fixture-image-[a-f0-9]{12}\.png$/)
  await sync({ ...options, api: fixture({ content }).api })
  assert.equal(downloads, 1)
  await sync({ api: fixture({ pages: [] }).api })
  assert.deepEqual(await readFile(join(root, imagePath)), png)
})

test('article headings start at h2 and preserve nesting without skipped ranks', async () => {
  for (const [ranks, expected] of [
    [[1,2,3,2,1],[2,3,4,3,2]],
    [[2,2,3,2],[2,2,3,2]],
    [[3,3,1,3],[2,2,2,3]],
    [[1,3,2,3],[2,3,3,4]],
  ]) {
    const output = await convertBlocks(ranks.map(rank => block(`heading_${rank}`, `Heading ${rank}`)), async () => '')
    assert.deepEqual([...output.matchAll(/<h([2-4])>/g)].map(match => Number(match[1])), expected)
  }
  const nested = block('heading_2','Parent')
  nested.children = [block('heading_3','Nested')]
  const output = await convertBlocks([nested,block('heading_2','Sibling')],async () => '')
  assert.deepEqual([...output.matchAll(/<h([2-4])>/g)].map(match => Number(match[1])),[2,3,2])
  const literal = await convertBlocks([block('code','<h3>literal</h3>')],async () => '')
  assert.equal(JSON.parse(literal.slice(literal.indexOf('{') + 1, literal.lastIndexOf('}'))), '<h3>literal</h3>')
})

test('technical edits do not revise dates; explicit editorial metadata is deterministic and publication stays immutable', async t => {
  const { root, sync } = await setup(t)
  await sync()
  const before = await snapshot(root)
  const technical = page({ last_edited_time: '2026-10-25T12:00:00Z' })
  technical.properties['Published Date'].date.start = '2026-10-25'
  assert.equal((await sync({ api: fixture({ pages: [technical] }).api })).changed, false)
  assert.deepEqual(await snapshot(root), before)
  technical.properties['Updated Date'] = { type: 'date', date: { start: '2026-10-25' } }
  technical.properties['Revision Notes'] = { type: 'rich_text', rich_text: [rt(JSON.stringify([{ date: '2026-10-25', description: 'Updated examples.' }]))] }
  technical.properties.Corrections = { type: 'rich_text', rich_text: [rt(JSON.stringify([{ date: '2026-10-24', description: 'Corrected the explanation.', id: 'explanation' }]))] }
  assert.equal((await sync({ api: fixture({ pages: [technical] }).api })).changed, true)
  const source = await readFile(join(root, 'src/content/blog/notion-fixture.mdx'), 'utf8')
  const { metadata } = await evaluate(source, runtime)
  assert.equal(metadata.date, '2026-10-20')
  assert.equal(metadata.updatedAt, '2026-10-25')
  assert.equal(metadata.articleId, `notion:${PAGE}`)
  assert.equal(metadata.corrections[0].id, 'explanation')
  assert.equal(metadata.revisions[0].description, 'Updated examples.')
  const after = await snapshot(root)
  technical.last_edited_time = '2026-10-26T12:00:00Z'
  assert.equal((await sync({ api: fixture({ pages: [technical] }).api })).changed, false)
  assert.deepEqual(await snapshot(root), after)
  technical.properties.Corrections.rich_text = [rt('{invalid')]
  await assert.rejects(sync({ api: fixture({ pages: [technical] }).api }), /Corrections must contain a JSON array/)
  assert.deepEqual(await snapshot(root), after)
})
test('optional Notion editorial fields fail clearly for invalid shapes, dates and property types', () => {
  const p = page()
  assert.equal(metadataFor(p, undefined, []).updatedAt, undefined)
  p.properties['Updated Date'] = { type: 'date', date: null }
  assert.equal(metadataFor(p, undefined, []).updatedAt, undefined)
  for (const value of ['2026-10-19', '2026-02-30', '2026-10-25T01:00:00Z']) {
    p.properties['Updated Date'].date = { start: value }
    assert.throws(() => metadataFor(p, undefined, []), /metadata.updatedAt/)
  }
  p.properties['Updated Date'] = { type: 'rich_text', rich_text: [] }
  assert.throws(() => metadataFor(p, undefined, []), /Updated Date must be a Notion date/)
  delete p.properties['Updated Date']
  p.properties.Corrections = { type: 'rich_text', rich_text: [rt('{}')] }
  assert.throws(() => metadataFor(p, undefined, []), /corrections must be an array/)
  p.properties.Corrections = { type: 'select' }
  assert.throws(() => metadataFor(p, undefined, []), /Corrections must be a Notion text/)
})
