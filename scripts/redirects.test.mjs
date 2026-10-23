import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { normalizeSlug, advanceHistory, resolveRegistry, redirectHtml, manualHistory } from './redirects.mjs'
import { synchronize } from './notion/publisher.mjs'
import { fixture, ROOT, page, rt } from './notion/fixtures/api.mjs'

const article = (id, slug, aliases = [], status = 'published') => ({ id, slug, aliases, status })
test('normalization rejects unsafe, external, ambiguous and reserved URLs', () => {
  assert.equal(normalizeSlug('/blog/old-slug/'), 'old-slug')
  assert.equal(normalizeSlug('%6fld-slug'), 'old-slug')
  for (const value of ['/', '/blog', '/about', '/projects', '/404', 'https://evil.com', '//evil.com', 'javascript:alert(1)', '../x', 'x/../y', 'a//b', 'a%2fb', '%252e', 'UPPER', 'résumé', 'x?y', 'x#y', 'x.html', 'assets', '<img>', 'a\\b', '%00', '%']) assert.throws(() => normalizeSlug(value), undefined, value)
})
test('history flattens first publication, repeat, rename, multiple renames and reversion', () => {
  assert.deepEqual(advanceHistory(undefined, 'a'), [])
  assert.deepEqual(advanceHistory({ slug: 'a' }, 'a'), [])
  const history = advanceHistory({ slug: 'a' }, 'b')
  assert.deepEqual(history, ['a'])
  assert.deepEqual(advanceHistory({ slug: 'b', history }, 'c'), ['a', 'b'])
  assert.deepEqual(advanceHistory({ slug: 'c', history: ['a', 'b'] }, 'a'), ['b', 'c'])
  assert.deepEqual(resolveRegistry([article('one', 'c', ['a', 'b'])]), { a: 'c', b: 'c' })
})
test('collisions, duplicate identities, self redirects, chains and cycles fail closed', () => {
  for (const articles of [
    [article('one', 'a'), article('two', 'a')],
    [article('one', 'a', ['x']), article('two', 'b', ['x'])],
    [article('one', 'a', ['b']), article('two', 'b')],
    [article('one', 'a', ['a'])],
    [article('one', 'a', ['b']), article('two', 'b', ['c'])],
    [article('one', 'a', ['b']), article('two', 'b', ['a'])],
    [article('one', 'a', ['x', '/blog/x/'])],
    [article('one', 'a'), article('one', 'b')],
    [article('one', '404')],
    [article('one', 'a', ['https://evil.com'])],
  ]) assert.throws(() => resolveRegistry(articles))
  assert.deepEqual(resolveRegistry([article('private', 'private', ['secret'], 'draft'), article('removed', 'gone', ['older'], 'unpublished')]), {})
})
test('static redirect is deterministic, immediate, canonical, accessible and script-free', () => {
  const html = redirectHtml('https://simpyll.com/blog/current')
  assert.equal(html, redirectHtml('https://simpyll.com/blog/current'))
  for (const expression of [/<!doctype html>/, /lang="en-US"/, /content="0;url=https:\/\/simpyll.com\/blog\/current"/, /rel="canonical"/, /noindex,follow/, /<a href="https:\/\/simpyll.com\/blog\/current">/, /<main>/]) assert.match(html, expression)
  assert.doesNotMatch(html, /<script/)
  for (const url of ['https://evil.com/blog/current', 'javascript:alert(1)', 'https://simpyll.com/blog/a?next=https://evil.com', 'https://simpyll.com/blog/a#x']) assert.throws(() => redirectHtml(url))
})
test('Notion stable identity survives renames, unpublish, deletion, republish and failed sync', async t => {
  const root = await mkdtemp(join(tmpdir(), 'redirect-sync-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(join(root, 'src/content/blog'), { recursive: true })
  const p = page()
  const sync = pages => synchronize({ root, pageId: ROOT, api: fixture({ pages, content: [] }).api })
  const manifest = async () => JSON.parse(await readFile(join(root, '.notion/published.json'), 'utf8'))
  for (const slug of ['a', 'b', 'c', 'a']) {
    p.properties.Slug.rich_text = [rt(slug)]
    await sync([p])
  }
  let state = await manifest(), entry = Object.values(state.articles)[0]
  assert.equal(entry.slug, 'a')
  assert.deepEqual(entry.history, ['b', 'c'])
  assert.deepEqual(resolveRegistry([article('notion:test', entry.slug, entry.history)]), { b: 'a', c: 'a' })
  const before = JSON.stringify(state)
  p.properties.Slug.rich_text = [rt('../unsafe')]
  await assert.rejects(sync([p]))
  assert.equal(JSON.stringify(await manifest()), before)
  p.properties.Status.status.name = 'Draft'
  await sync([p])
  await sync([]) // deletion after unpublishing retains the same inactive history
  entry = Object.values((await manifest()).articles)[0]
  assert.equal(entry.status, 'unpublished')
  await assert.rejects(readFile(join(root, 'src/content/blog/a.mdx')), { code: 'ENOENT' })
  p.properties.Status.status.name = 'Published'
  p.properties.Slug.rich_text = [rt('d')]
  await sync([p])
  state = await manifest(); entry = Object.values(state.articles)[0]
  assert.deepEqual(entry.history, ['a', 'b', 'c'])
  assert.equal((await sync([p])).changed, false)
  assert.match(await readFile(join(root, 'src/content/blog/d.mdx'), 'utf8'), /articleId: "notion:/)
})
test('manual IDs preserve committed historical slugs across renames and clean rebuilds', async t => {
  const root = await mkdtemp(join(tmpdir(), 'redirect-git-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'pipe' })
  git('init'); git('config', 'user.email', 'test@example.com'); git('config', 'user.name', 'Test')
  await mkdir(join(root, 'src/content/blog'), { recursive: true })
  await writeFile(join(root, 'src/content/blog/a.mdx'), 'export const metadata = { articleId: "stable-one" }\n\nPublic article\n')
  git('add', '.'); git('commit', '-m', 'publish a')
  git('mv', 'src/content/blog/a.mdx', 'src/content/blog/b.mdx'); git('commit', '-m', 'rename b')
  assert.deepEqual([...(await manualHistory(root)).get('stable-one')].sort(), ['a', 'b'])
  assert.deepEqual([...(await manualHistory(root)).get('stable-one')].sort(), ['a', 'b'])
})

test('missing published target fails while inactive Notion records emit no private information', async t => {
  const { collectArticles } = await import('./redirects.mjs')
  const root = await mkdtemp(join(tmpdir(), 'redirect-private-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(join(root, 'src/content/blog'), { recursive: true })
  const notion = { articles: { abc: { slug: 'secret-current', history: ['secret-old'], status: 'published', title: 'PRIVATE TITLE' } } }
  await assert.rejects(collectArticles(root, { notion, history: new Map() }), /Missing published redirect target/)
  notion.articles.abc.status = 'unpublished'
  const output = JSON.stringify(resolveRegistry(await collectArticles(root, { notion, history: new Map() })))
  assert.equal(output, '{}')
  assert.doesNotMatch(output, /secret|abc|PRIVATE/)
})

test('unpublished hosted media and stale optimized caches are absent from public artifacts', async t => {
  const { removeInactiveMedia } = await import('./publishing-media.mjs')
  const root = await mkdtemp(join(tmpdir(), 'redirect-media-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const id = 'a'.repeat(32)
  for (const path of ['.notion', 'src/generated', `dist/images/notion/${id}`, 'dist/images/optimized']) await mkdir(join(root, path), { recursive: true })
  await writeFile(join(root, '.notion/published.json'), JSON.stringify({ articles: { [id]: { status: 'unpublished' } } }))
  await writeFile(join(root, 'src/generated/images.json'), JSON.stringify({ '/images/public.png': { variants: [{ src: '/images/optimized/public.webp' }] } }))
  for (const file of [`dist/images/notion/${id}/private.png`, 'dist/images/optimized/stale.webp', 'dist/images/optimized/public.webp']) await writeFile(join(root, file), 'image')
  await removeInactiveMedia(root)
  await assert.rejects(readFile(join(root, `dist/images/notion/${id}/private.png`)), { code: 'ENOENT' })
  await assert.rejects(readFile(join(root, 'dist/images/optimized/stale.webp')), { code: 'ENOENT' })
  assert.equal(await readFile(join(root, 'dist/images/optimized/public.webp'), 'utf8'), 'image')
})
