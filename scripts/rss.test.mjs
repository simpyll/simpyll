import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { XMLParser, XMLValidator } from 'fast-xml-parser'
import { parseHTML } from 'linkedom'
import { renderRss, generateRss } from './generate-rss.mjs'
const site = { name: 'Simpyll', url: 'https://simpyll.com', description: 'Technical writing & learning', language: 'en-US' }
const article = (extra = {}, metadata = {}) => ({ id: 'manual:one', slug: 'one', status: 'published', ...extra, metadata: { title: 'Nursing & AI <today> — 世界', description: 'Read **this** [article](https://example.com) & learn.', date: '2026-10-20', category: 'AI', tags: ['AI', '护理'], author: 'David Becker', ...metadata } })
function parse(xml) {
  assert.equal(XMLValidator.validate(xml), true)
  return new XMLParser({ ignoreAttributes: false }).parse(xml).rss
}
test('RSS channel, escaped Unicode, excerpts, canonical links, date and stable GUID', () => {
  const rss = parse(renderRss([article()], site))
  assert.equal(rss['@_version'], '2.0')
  const c = rss.channel
  assert.equal(c.title, 'Simpyll'); assert.equal(c.link, site.url)
  assert.equal(c.language, 'en-US'); assert.equal(c.description, site.description)
  assert.equal(c['atom:link']['@_href'], site.url + '/rss.xml')
  assert.equal(c.item.title, article().metadata.title)
  assert.equal(c.item.description, 'Read this article & learn.')
  assert.deepEqual(c.item.category, ['AI', '护理'])
  assert.equal(c.item.pubDate, 'Tue, 20 Oct 2026 00:00:00 GMT')
  assert.equal(c.item.link, site.url + '/blog/one')
  assert.equal(c.item.guid['@_isPermaLink'], 'false')
  const renamed = parse(renderRss([article({ slug: 'renamed' }, { title: 'Edited' })], site))
  assert.deepEqual(c.item.guid, renamed.channel.item.guid)
  assert.equal(renderRss([article()], site), renderRss([article()], site))
})
test('exclude drafts, withdrawals, invalid dates and incomplete entries', () => {
  const entries = [article({ status: 'unpublished' }), article({ status: 'draft' }), ...[{ draft: true }, { published: false }, { status: 'withdrawn' }, { test: true }, { date: '2026-02-30' }, { title: '' }, { description: '' }, { tags: null }].map(m => article({}, m))]
  assert.equal(parse(renderRss(entries, site)).channel.item, undefined)
  assert.equal(parse(renderRss([], site)).channel.lastBuildDate, undefined)
})
test('newest first, deterministic ties, duplicates fail closed', () => {
  const a = article(), b = article({ id: 'notion:two', slug: 'two' }), c = article({ id: 'manual:three', slug: 'three' }, { date: '2026-10-21' })
  assert.equal(renderRss([a,b,c], site), renderRss([c,b,a], site))
  assert.deepEqual(parse(renderRss([a,b,c], site)).channel.item.map(i => i.link), ['three', 'one', 'two'].map(s => site.url + '/blog/' + s))
  assert.throws(() => renderRss([a,a], site), /Duplicate/)
  assert.throws(() => renderRss([a], { ...site, url: 'http://localhost' }), /production/)
})
test('registry includes manual and Notion articles, excludes withdrawn files and aliases', async () => {
  const root = await mkdtemp(join(tmpdir(), 'rss-'))
  try {
    for (const dir of ['src/content/blog', 'src/config', '.notion', 'public']) await mkdir(join(root, dir), { recursive: true })
    await writeFile(join(root, 'src/config/site.ts'), 'export const siteConfig = ' + JSON.stringify(site).replaceAll('"name":', 'name:').replaceAll('"url":', 'url:').replaceAll('"description":', 'description:').replaceAll('"language":', 'language:'))
    const manual = article(), notion = article({ id: 'notion:abc', slug: 'new-slug' }), withdrawn = article({ id: 'notion:def', slug: 'withdrawn' })
    for (const a of [manual, notion, withdrawn]) await writeFile(join(root, `src/content/blog/${a.slug}.mdx`), `export const metadata = ${JSON.stringify({ ...a.metadata, articleId: a.id })}\n\nPublic prose.`)
    await writeFile(join(root, '.notion/published.json'), JSON.stringify({ articles: { abc: { slug: 'new-slug', history: ['old-slug'], status: 'published' }, def: { slug: 'withdrawn', status: 'unpublished' } }, files: { 'src/content/blog/new-slug.mdx': 'hash', 'src/content/blog/withdrawn.mdx': 'hash' } }))
    const xml = await generateRss(root), items = parse(xml).channel.item
    assert.equal(items.length, 2)
    assert.ok(!xml.includes('/blog/old-slug')); assert.ok(!xml.includes('/blog/withdrawn'))
    assert.ok(xml.includes('urn:simpyll:article:notion:abc'))
    assert.equal(await readFile(join(root, 'public/rss.xml'), 'utf8'), xml)
  } finally { await rm(root, { recursive: true, force: true }) }
})
test('production build ships parsed RSS, autodiscovery and no-JS subscription', async () => {
  const xml = await readFile('dist/rss.xml', 'utf8')
  const rss = parse(xml)
  const items = [rss.channel.item].flat().filter(Boolean)
  for (const i of items) assert.equal(new URL(i.link).origin, site.url)
  const sitemap = parseHTML(await readFile('dist/sitemap.xml', 'utf8')).document
  assert.ok(sitemap.querySelector('urlset'))
  for (const path of ['dist/index.html', 'dist/blog/index.html']) {
    const { document } = parseHTML(await readFile(path, 'utf8'))
    const links = document.querySelectorAll('head link[rel="alternate"][type="application/rss+xml"]')
    assert.equal(links.length, 1)
    assert.equal(links[0].getAttribute('href'), site.url + '/rss.xml')
    if (path.includes('/blog/')) assert.equal(document.querySelector('a[href="/rss.xml"]').textContent, 'Subscribe via RSS')
  }
})
