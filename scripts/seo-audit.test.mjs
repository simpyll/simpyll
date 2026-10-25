import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { auditSeo } from './seo-audit.mjs'

const origin = 'https://simpyll.com'
const description = 'A useful and accurate explanation of this example page for readers.'
function html({ route = '/', title = 'Example page | Simpyll', body = '<h1>Example page</h1>', head = '', schema } = {}) {
  return `<!doctype html><html lang="en"><head><title>${title}</title><meta name="description" content="${description}"><link rel="canonical" href="${origin}${route}">${Object.entries({ 'og:title': title, 'og:description': description, 'og:url': origin + route, 'og:type': 'website', 'og:image': origin + '/image.png', 'twitter:title': title, 'twitter:description': description, 'twitter:card': 'summary_large_image', 'twitter:image': origin + '/image.png' }).map(([key,value]) => `<meta ${key.startsWith('og:') ? 'property' : 'name'}="${key}" content="${value}">`).join('')}${head}</head><body><main>${body}</main>${schema ? `<script type="application/ld+json">${schema}</script>` : ''}</body></html>`
}
async function fixture(t, markup = html(), paths = ['/']) {
  const directory = await mkdtemp(join(tmpdir(), 'seo-audit-'))
  t.after(() => rm(directory, { force: true, recursive: true }))
  await writeFile(join(directory,'index.html'), markup)
  await writeFile(join(directory,'image.png'), 'fixture')
  await writeFile(join(directory,'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`)
  await writeFile(join(directory,'sitemap.xml'), `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(p => `<url><loc>${origin}${p}</loc></url>`).join('')}</urlset>`)
  return directory
}

test('all production static pages pass; repeated audits are deterministic', async () => {
  const before = await auditSeo()
  assert.equal(before.summary.errors, 0, JSON.stringify(before.issues))
  assert.deepEqual(await auditSeo(), before)
  assert.equal(before.summary.indexablePages, before.summary.canonicalUrls)
  assert.ok(before.pages.some(p => p.pageType === 'article' && p.articleCharacters > 100))
  assert.ok(before.pages.some(p => p.pageType === 'case-study'))
  const fallback = before.pages.find(p => p.pageType === '404')
  assert.equal(fallback.indexable, false)
  assert.deepEqual(fallback.canonicals, [])
})

test('valid minimal output passes and records local assets and static readability', async t => {
  const directory = await fixture(t)
  const result = await auditSeo({ directory, expectedRoutes: ['/'] })
  assert.deepEqual(result.issues, [])
  assert.equal(result.pages[0].prerendered, true)
  assert.equal(result.pages[0].httpStatus, null, 'offline artifacts cannot prove HTTP status')
})

for (const [name, markup, code] of [
  ['missing title', html().replace(/<title>.*?<\/title>/, ''), 'title'],
  ['duplicated description', html({ head: '<meta name="description" content="duplicate">' }), 'description'],
  ['staging canonical', html().replace('rel="canonical" href="https://simpyll.com/', 'rel="canonical" href="https://staging.invalid/'), 'canonical'],
  ['missing primary heading', html({ body: '<p>Body without a primary heading</p>' }), 'h1'],
  ['broken local destination', html({ body: '<h1>Example</h1><a href="/missing">Missing article</a>' }), 'broken-link'],
  ['broken fragment', html({ body: '<h1>Example</h1><a href="#absent">Absent section</a>' }), 'broken-fragment'],
  ['unsafe scheme', html({ body: '<h1>Example</h1><a href="javascript:alert(1)">Unsafe</a>' }), 'unsafe-link'],
  ['malformed JSON-LD', html({ schema: '{broken' }), 'invalid-jsonld'],
  ['missing alt', html({ body: '<h1>Example</h1><img src="/image.png" width="10" height="10">' }), 'image-alt'],
  ['broken image', html({ body: '<h1>Example</h1><img src="/absent.png" alt="Example" width="10" height="10">' }), 'broken-image'],
  ['inconsistent social', html().replace('property="og:url" content="https://simpyll.com/"', 'property="og:url" content="http://localhost/"'), 'social-consistency'],
  ['incorrect breadcrumb', html({ schema: JSON.stringify({ '@type': 'BreadcrumbList', itemListElement: [{ position: 2, name: 'Wrong', item: origin + '/missing' }] }) }), 'breadcrumb-schema'],
]) test(name, async t => {
  const result = await auditSeo({ directory: await fixture(t, markup) })
  assert.ok(result.issues.some(i => i.code === code && i.level === 'error'), JSON.stringify(result.issues))
})

test('heading and length suggestions stay warnings, and external outages are never fetched', async t => {
  const directory = await fixture(t, html({ title: 'Short', body: '<h1>Example</h1><h3>Review this hierarchy</h3><a href="https://unresolvable.invalid/">External reference</a><img src="/image.png" alt="">' }))
  const result = await auditSeo({ directory })
  assert.equal(result.summary.errors, 0)
  for (const code of ['title-review','heading-order','image-dimensions']) assert.ok(result.issues.some(i => i.code === code && i.level === 'warning'))
})

test('missing public routes, extra sitemap entries and blocked crawlers fail closed', async t => {
  const directory = await fixture(t, html(), ['/', '/missing'])
  await writeFile(join(directory,'robots.txt'), 'User-agent: *\nDisallow: /\n')
  const result = await auditSeo({ directory, expectedRoutes: ['/', '/missing'] })
  for (const code of ['missing-public-route','sitemap-extra','robots']) assert.ok(result.issues.some(i => i.code === code))
})

test('duplicate page identities, titles and descriptions are detected across files', async t => {
  const directory = await fixture(t, html(), ['/', '/two'])
  await mkdir(join(directory,'two'))
  await writeFile(join(directory,'two/index.html'), html())
  const result = await auditSeo({ directory })
  for (const code of ['duplicate-title','duplicate-description','duplicate-canonicals']) assert.ok(result.issues.some(i => i.code === code))
})

test('redirect aliases are excluded from sitemap and indexable metadata checks', async t => {
  const directory = await fixture(t)
  const { redirectHtml } = await import('./redirects.mjs')
  await mkdir(join(directory,'blog/old'), { recursive: true })
  await writeFile(join(directory,'blog/old/index.html'), redirectHtml(origin + '/blog/current'))
  const result = await auditSeo({ directory })
  assert.equal(result.pages.find(p => p.route === '/blog/old').indexable, false)
  assert.deepEqual(result.issues.filter(i => i.level === 'error').map(i => i.code), ['redirect-target'])
})

test('stale private article exposure in public artifacts is rejected', async t => {
  const directory = await fixture(t)
  await writeFile(join(directory,'search-index.json'), JSON.stringify([{ slug: 'private' }]))
  await writeFile(join(directory,'rss.xml'), '<rss><channel/></rss>')
  const result = await auditSeo({ directory, articles: [{ slug: 'private', status: 'unpublished' }] })
  assert.ok(result.issues.some(i => i.code === 'private-output'))
})

test('build invokes offline SEO gate and existing CI executes regression tests', async () => {
  const pkg = JSON.parse(await readFile('package.json','utf8'))
  assert.ok(pkg.scripts.build.endsWith('&& npm run audit:seo'))
  assert.match(await readFile('.github/workflows/validate.yml','utf8'), /npm run test:seo/)
})

 test('an article shell cannot pass static completeness validation', async t => {
  const directory = await fixture(t, html(), ['/', '/blog/shell'])
  await mkdir(join(directory, 'blog/shell'), { recursive: true })
  await writeFile(join(directory, 'blog/shell/index.html'), html({ route: '/blog/shell' }))
  const result = await auditSeo({ directory })
  assert.ok(result.issues.some(i => i.route === '/blog/shell' && i.code === 'empty-static-content'))
})
