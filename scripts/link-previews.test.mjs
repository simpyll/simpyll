import test from 'node:test'
import assert from 'node:assert/strict'
import { previewRecords } from './link-previews.mjs'
import { previewRoute } from '../src/lib/link-preview-url.mjs'
import { readFile } from 'node:fs/promises'

test('public metadata projection excludes withdrawn/draft/private data and optional media', () => {
  const article = { slug: 'public', status: 'published', id: 'private-source-id', metadata: { title: 'Public', description: 'Excerpt', image: '/images/example.png', sourceId: 'secret' } }
  const project = { slug: 'example', title: 'Example', summary: 'Summary', visibility: 'public', caseStudy: { contentKey: 'example' } }
  const records = previewRecords([article, ...['draft', 'unpublished'].map(status => ({ ...article, slug: status, status })), ...[{ draft: true }, { published: false }, { noindex: true }, { test: true }, { status: 'draft' }].map((metadata, i) => ({ ...article, slug: `hidden-${i}`, metadata: { ...article.metadata, ...metadata } }))], [project, { ...project, slug: 'private', visibility: 'private' }, { ...project, slug: 'draft', caseStudy: { visibility: 'draft' } }, { ...project, slug: 'listing', caseStudy: undefined }])
  assert.deepEqual(records, { '/blog/public': { title: 'Public', excerpt: 'Excerpt', type: 'Article' }, '/projects/example': { title: 'Example', excerpt: 'Summary', type: 'Project' } })
  assert.doesNotMatch(JSON.stringify(records), /secret|private-source|contentKey|sourceId/)
  assert.equal(previewRecords([], [{ ...project, cover: { src: '/images/example.png' } }])['/projects/example'].thumbnail, '/images/example.png')
  assert.equal(previewRecords([{ ...article, metadata: { title: 'No image', image: 'https://remote.test/x.png' } }], [])['/blog/public'].thumbnail, undefined)
})

test('URL resolution supports aliases, queries, fragments and base paths without rewriting links', () => {
  const records = { '/blog/new': {}, '/projects/example': {} }, aliases = { old: 'new', deleted: 'missing' }
  const resolve = (href, base = '/') => previewRoute(href, `https://local.test${base}blog/source`, base, 'https://simpyll.com', records, aliases)
  for (const href of ['/blog/new', '/blog/new/?q=1#heading', '/blog/old', '/blog/%6eew', 'https://simpyll.com/blog/old#section', 'https://local.test/blog/new', 'new']) assert.equal(resolve(href), '/blog/new', href)
  assert.equal(resolve('/projects/example'), '/projects/example')
  assert.equal(resolve('/site/blog/old?x#y', '/site/'), '/blog/new')
  assert.equal(resolve('https://simpyll.com/site/projects/example', '/site/'), '/projects/example')
  for (const href of ['#heading', '/blog/missing', '/blog/deleted', '/blog', '/projects', '/about', '//external.test/blog/new', 'https://external.test/blog/new', 'javascript:alert(1)', '/blog/%2fnew', '/blog/%256eew', '/blog/%zz', 'https://user@simpyll.com/blog/new', '/blog/new/extra', '/blog/new\\x']) assert.equal(resolve(href), undefined, href)
  assert.equal(resolve('/blog/new', '/site/'), undefined)
})

test('generated previews are an allowlisted subset of eligible public routes', async () => {
  const read = async path => JSON.parse(await readFile(path, 'utf8'))
  const records = await read('src/generated/link-previews.json')
  const articles = await read('src/generated/articles.json'), projects = await read('src/generated/projects.json')
  for (const [route, record] of Object.entries(records)) {
    assert.ok(Object.keys(record).every(k => ['title', 'excerpt', 'type', 'thumbnail'].includes(k)))
    assert.ok(record.title && typeof record.excerpt === 'string')
    if (record.type === 'Article') assert.ok(articles.some(a => `/blog/${a.slug}` === route))
    else assert.ok(projects.some(p => `/projects/${p.slug}` === route && p.visibility === 'public' && p.caseStudy && (p.caseStudy.visibility ?? 'public') === 'public'))
  }
})

test('generation reads only published registry destinations and emits no private fixture data', async t => {
  const { mkdtemp, mkdir, writeFile, rm } = await import('node:fs/promises')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const { generateLinkPreviews } = await import('./link-previews.mjs')
  const root = await mkdtemp(join(tmpdir(), 'link-preview-fixture-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  for (const path of ['src/content/blog', 'src/generated', '.notion']) await mkdir(join(root, path), { recursive: true })
  await writeFile(join(root, 'src/generated/projects.json'), '[]')
  const metadata = { articleId: 'manual:public', title: 'Public fixture', description: 'Public excerpt' }
  await writeFile(join(root, 'src/content/blog/public.mdx'), `export const metadata = ${JSON.stringify(metadata)}\n\nPublic body must not be bundled in metadata.`)
  await writeFile(join(root, 'src/content/blog/draft.mdx'), `export const metadata = ${JSON.stringify({ ...metadata, articleId: 'manual:draft', status: 'draft', title: 'PRIVATE DRAFT', description: 'PRIVATE EXCERPT' })}`)
  // A stale owned file may remain in a checkout, but the ledger vetoes it.
  await writeFile(join(root, 'src/content/blog/withdrawn.mdx'), 'MALFORMED PRIVATE BODY SHOULD NEVER BE READ')
  await writeFile(join(root, '.notion/published.json'), JSON.stringify({ files: { 'src/content/blog/withdrawn.mdx': {} }, articles: { 'private-page-id': { slug: 'withdrawn', status: 'unpublished', history: ['old-private'] } } }))
  await generateLinkPreviews(root)
  const output = await readFile(join(root, 'src/generated/link-previews.json'), 'utf8')
  assert.deepEqual(JSON.parse(output), { '/blog/public': { title: metadata.title, excerpt: metadata.description, type: 'Article' } })
  assert.doesNotMatch(output, /PRIVATE|private-page|manual:|Public body|withdrawn/)
})
