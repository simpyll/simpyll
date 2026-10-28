import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { normalizeTags } from '../src/lib/tags.mjs'
import { taxonomy, prepareDiscovery, parseDiscovery } from '../src/lib/discovery.ts'
import { migrateTags } from './migrate-tags.mjs'
import { synchronize } from './notion/publisher.mjs'
import { ROOT, fixture, png, page } from './notion/fixtures/api.mjs'
import { createHash } from 'node:crypto'

test('canonical labels are independent of input order, preserve punctuation and deduplicate', () => {
  const values = [' Nursing ', 'nursing', 'NURSING', 'MDX', 'Notion', 'C++', 'C#', '  ']
  assert.deepEqual(normalizeTags(values), ['c#', 'c++', 'mdx', 'notion', 'nursing'])
  assert.deepEqual(normalizeTags(values), normalizeTags([...values].reverse()))
})
test('unique-post counts and old encoded query selections combine every variant', () => {
  const records = ['Nursing', 'nursing', 'NURSING'].map((tag, i) => ({ id: `${i}`, slug: `${i}`, title: 'Article', category: '', description: '', body: '', date: '', tags: [tag, ' Nursing '] }))
  assert.deepEqual(taxonomy(records, 'tags'), [{ id: 'nursing', label: 'nursing', count: 3 }])
  assert.deepEqual(taxonomy([...records].reverse(), 'tags'), taxonomy(records, 'tags'))
  assert.equal(taxonomy([...records, records[0]], 'tags')[0].count, 3)
  for (const query of ['tag=NURSING', 'tag=+Nursing+', 'tag=%6Eursing&tag=NURSING']) {
    assert.equal(prepareDiscovery(records)(parseDiscovery(new URLSearchParams(query))).length, 3)
  }
})
test('fixture migration preserves all other bytes, owns hashes, repeats and unchanged imports are no-ops', async t => {
  const root = await mkdtemp(join(tmpdir(), 'tag-migration-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(join(root, 'src/content/blog'), { recursive: true })
  const manual = 'export const metadata = {articleId: "manual:sample", slug: "sample", date: "2020-01-01", tags: [" Nursing ","nursing","NURSING"]}\n\n# Body untouched\n\nA permanent [link](/blog/sample).\n'
  await writeFile(join(root, 'src/content/blog/sample.mdx'), manual)
  const sync = () => synchronize({ root, api: fixture().api, pageId: ROOT, imageDownloader: async () => ({ bytes: png, extension: 'png' }) })
  await sync()
  const manifestPath = join(root, '.notion/published.json')
  const registry = JSON.parse(await readFile(manifestPath, 'utf8'))
  const path = Object.keys(registry.files).find(p => p.endsWith('.mdx'))
  const canonical = await readFile(join(root, path), 'utf8')
  assert.match(canonical, /tags: \["mdx","notion"\]/)
  // Simulate a legitimate pre-policy manifest, retaining source revision and identity.
  const legacy = canonical.replace('["mdx","notion"]', '["MDX","Notion","mdx"]')
  await writeFile(join(root, path), legacy)
  registry.files[path] = createHash('sha256').update(legacy).digest('hex')
  await writeFile(manifestPath, JSON.stringify(registry, null, 2) + '\n')
  const plan = await migrateTags({ root })
  assert.equal(plan.changes.length, 2)
  assert.equal(await readFile(join(root, path), 'utf8'), legacy)
  await migrateTags({ root, apply: true })
  assert.equal(await readFile(join(root, path), 'utf8'), canonical)
  assert.equal(await readFile(join(root, 'src/content/blog/sample.mdx'), 'utf8'), manual.replace('[" Nursing ","nursing","NURSING"]', '["nursing"]'))
  assert.deepEqual((await migrateTags({ root, apply: true })).changes, [])
  assert.equal((await sync()).changed, false)
  assert.equal((await sync()).changed, false)
  // Unchanged-source import also repairs legacy tags without a separate migration.
  await writeFile(join(root, path), legacy)
  await writeFile(manifestPath, JSON.stringify(registry, null, 2) + '\n')
  assert.equal((await sync()).changed, true)
  assert.equal(await readFile(join(root, path), 'utf8'), canonical)
  assert.equal((await sync()).changed, false)
  await writeFile(join(root, path), canonical + '\nManual change')
  await assert.rejects(migrateTags({ root, apply: true }), /Ownership mismatch/)
  await assert.rejects(sync(), /manually changed/)
  assert.equal(await readFile(join(root, path), 'utf8'), canonical + '\nManual change')
})

test('Notion imports and updates normalize mixed case, whitespace and duplicates', async t => {
  const root = await mkdtemp(join(tmpdir(), 'tag-import-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(join(root, 'src/content/blog'), { recursive: true })
  const article = page()
  const sync = () => synchronize({ root, pageId: ROOT, api: fixture({ pages: [article] }).api, imageDownloader: async () => ({ bytes: png, extension: 'png' }) })
  article.properties.Tags.multi_select = [' Nursing ', 'nursing', 'NURSING'].map(name => ({ name }))
  await sync()
  const path = join(root, 'src/content/blog/notion-fixture.mdx')
  const original = await readFile(path, 'utf8')
  assert.match(original, /tags: \["nursing"\]/)
  article.properties.Tags.multi_select = ['nursing', 'MDX', ' mdx '].map(name => ({ name }))
  article.last_edited_time = '2026-10-21T12:30:00Z'
  await sync()
  const updated = await readFile(path, 'utf8')
  assert.equal(updated, original.replace('["nursing"]', '["mdx","nursing"]'))
  assert.equal((await sync()).changed, false)
})

test('migration rejects an unowned Notion identity, including quoted metadata keys', async t => {
  const root = await mkdtemp(join(tmpdir(), 'tag-unowned-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(join(root, 'src/content/blog'), { recursive: true })
  const path = join(root, 'src/content/blog/sample.mdx')
  const source = 'export const metadata = {"articleId": "notion:44444444444444444444444444444444", tags: ["Nursing"]}\n\nBody.'
  await writeFile(path, source)
  await assert.rejects(migrateTags({ root, apply: true }), /Unowned Notion article/)
  assert.equal(await readFile(path, 'utf8'), source)
})
