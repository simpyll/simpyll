/** Bounded offline checks of the actual deployment artifact; no remote-link requests. */
import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises'
import { resolve, join, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseHTML } from 'linkedom'
import { XMLParser, XMLValidator } from 'fast-xml-parser'
import { collectArticles, readMetadata } from './redirects.mjs'
import { caseStudyRoutes } from './project-routes.mjs'

const origin = 'https://simpyll.com'
const text = node => (node?.textContent ?? '').replace(/\s+/g, ' ').trim()
const content = (doc, selector) => doc.querySelector(selector)?.getAttribute('content') ?? ''
const routePath = path => path.replace(/\/index\.html$/, '').replace(/\/$/, '') || '/'
export async function auditSeo({ directory = 'dist', expectedRoutes, articles }  = {}) {
  const base = resolve(directory), pages = [], issues = []
  const add = (page, code, severity, evidence, level = 'error') => issues.push({ route: page, code, severity, level, evidence })
  async function scan(dir) {
    for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a,b) => a.name.localeCompare(b.name))) {
      if (entry.isDirectory()) await scan(join(dir, entry.name))
      else if (entry.name === 'index.html' || dir === base && entry.name === '404.html') {
        const file = join(dir, entry.name), relative = file.slice(base.length).split(sep).join('/')
        const route = relative === '/404.html' ? '/404' : routePath(relative)
        const html = await readFile(file, 'utf8'), { document: doc } = parseHTML(html)
        const robots = [...doc.querySelectorAll('meta[name="robots"]')].map(n => n.getAttribute('content')).join(',')
        const redirect = !!doc.querySelector('meta[http-equiv="refresh"]')
        const indexable = !/\bnoindex\b/i.test(robots) && !redirect && route !== '/404'
        const canonicals = [...doc.querySelectorAll('link[rel="canonical"]')].map(n => n.getAttribute('href'))
        const presentationalHeadings = [...doc.querySelectorAll('main h1[role="presentation"]')].map(text)
        const headings = [...doc.querySelectorAll('main h1,main h2,main h3,main h4,main h5,main h6')].filter(n => n.getAttribute('role') !== 'presentation').map(n => ({ level: Number(n.localName[1]), text: text(n) }))
        const schemas = []
        for (const node of doc.querySelectorAll('script[type="application/ld+json"]')) {
          try { const data = JSON.parse(node.textContent); schemas.push(...(Array.isArray(data) ? data : data['@graph'] ?? [data])) }
          catch { add(route, 'invalid-jsonld', 'High', 'JSON-LD cannot be parsed') }
        }
        const links = [...doc.querySelectorAll('a[href]')].map(n => ({ href: n.getAttribute('href'), anchor: n.getAttribute('aria-label') || text(n), contextual: !!n.closest('.article-content'), kind: n.closest('.article-content') ? 'contextual' : n.closest('[aria-label="Breadcrumb"]') ? 'breadcrumb' : n.closest('[aria-labelledby="related-articles-heading"]') ? 'related' : n.closest('header') ? 'global' : n.closest('footer') ? 'footer' : n.closest('[aria-label="Article navigation"]') ? 'previous-next' : n.closest('nav') ? 'navigation' : n.closest('[class*="project"]') ? 'project' : 'other' }))
        const images = [...doc.querySelectorAll('img')].map(n => ({ src: n.getAttribute('src'), alt: n.getAttribute('alt'), width: n.getAttribute('width'), height: n.getAttribute('height'), loading: n.getAttribute('loading'), srcset: n.getAttribute('srcset') }))
        const social = Object.fromEntries(['og:title','og:description','og:url','og:type','og:image','twitter:title','twitter:description','twitter:card','twitter:image'].map(key => [key, content(doc, `meta[${key.startsWith('og:') ? 'property' : 'name'}="${key}"]`)]))
        const page = { route, url: origin + route, pageType: redirect ? 'redirect' : route === '/404' ? '404' : route.startsWith('/blog/') ? 'article' : route.startsWith('/projects/') ? 'case-study' : 'page', indexable, httpStatus: null, robots, canonicals, title: text(doc.querySelector('head title')), description: content(doc, 'meta[name="description"]'), headings, presentationalHeadings, social, schemas, links, images, inbound: [], outbound: [], contextualOutbound: [], prerendered: !!doc.querySelector('main') && !!text(doc.querySelector('main')), articleText: text(doc.querySelector('.article-content')), ids: [...doc.querySelectorAll('[id]')].map(n => n.id) }
        pages.push(page)
        if (!indexable) {
          if (!/\bnoindex\b/i.test(robots)) add(route, 'special-indexability', 'High', '404/redirect must declare noindex')
          continue
        }
        if (canonicals.length !== 1 || canonicals[0] !== page.url) add(route, 'canonical', 'Critical', JSON.stringify(canonicals))
        for (const [selector, value, code] of [['head title', page.title, 'title'], ['meta[name="description"]', page.description, 'description']]) {
          if (!value || doc.querySelectorAll(selector).length !== 1) add(route, code, 'High', `Expected one nonempty ${code}`)
        }
        if (headings.filter(h => h.level === 1).length !== 1) add(route, 'h1', 'Medium', 'Expected one primary heading')
        if (presentationalHeadings.length) add(route, 'duplicate-article-title', 'Medium', `Body H1 repeats a template-owned heading: ${presentationalHeadings.join('; ')}`)
        let previous = 0
        for (const heading of headings) {
          if (heading.level > previous + 1) add(route, 'heading-order', 'Medium', `H${previous} → H${heading.level}: ${heading.text}`, 'warning')
          previous = heading.level
        }
        if (!page.prerendered || page.pageType === 'article' && !page.articleText) add(route, 'empty-static-content', 'Critical', 'Meaningful main/article text missing from static HTML')
        for (const key of Object.keys(social)) {
          const selector = `meta[${key.startsWith('og:') ? 'property' : 'name'}="${key}"]`
          if (!social[key] || doc.querySelectorAll(selector).length !== 1) add(route, 'social', 'Medium', `Missing or duplicated ${key}`)
        }
        for (const [key, expected] of [['og:url',page.url],['og:title',page.title],['twitter:title',page.title],['og:description',page.description],['twitter:description',page.description],['og:type',page.pageType === 'article' ? 'article' : 'website']]) {
          if (social[key] !== expected) add(route, 'social-consistency', 'High', `${key}: ${social[key]}`)
        }
        const schemaIds = new Set()
        for (const schema of schemas) {
          if (!schema || typeof schema !== 'object' || !schema['@type']) { add(route, 'schema-type', 'High', 'Missing JSON-LD type'); continue }
          if (schema['@id']) { if (schemaIds.has(schema['@id'])) add(route, 'schema-duplicate', 'High', schema['@id']); schemaIds.add(schema['@id']) }
          if (schema['@type'] === 'BlogPosting') {
            if (schema.headline !== headings.find(h => h.level === 1)?.text || schema.description !== page.description || schema.mainEntityOfPage?.['@id'] !== page.url || !schema.author?.name || !/^\d{4}-\d{2}-\d{2}$/.test(schema.datePublished ?? '') || schema.dateModified && schema.dateModified < schema.datePublished) add(route, 'article-schema', 'High', 'Article identity, author or dates disagree with page')
          }
          if (schema['@type'] === 'BreadcrumbList') {
            const items = schema.itemListElement
            if (!Array.isArray(items) || items.some((item,i) => item.position !== i+1 || !item.name || !item.item?.startsWith(origin + '/')) || items.at(-1)?.item !== page.url) add(route, 'breadcrumb-schema', 'High', 'Breadcrumb positions/destinations disagree with page')
          }
        }
        if (page.pageType === 'article' && schemas.filter(s => s['@type'] === 'BlogPosting').length !== 1) add(route, 'article-schema', 'High', 'Expected one BlogPosting')
        for (const image of images) {
          if (image.alt === null) add(route, 'image-alt', 'Medium', image.src)
          if (!Number(image.width) || !Number(image.height)) add(route, 'image-dimensions', 'Medium', image.src, 'warning')
        }
        if (page.title.length < 15 || page.title.length > 85) add(route, 'title-review', 'Low', `${page.title.length} characters; review clarity, not a ranking threshold`, 'warning')
        if (page.description.length < 50 || page.description.length > 200) add(route, 'description-review', 'Low', `${page.description.length} characters; editorial review only`, 'warning')
      }
    }
  }
  await scan(base)
  const byRoute = new Map(pages.map(p => [p.route,p]))
  if (expectedRoutes) {
    for (const route of expectedRoutes) if (!byRoute.get(route)?.indexable) add(route, 'missing-public-route', 'Critical', 'Authoritative public route missing or noindex')
    for (const page of pages.filter(p => p.indexable)) if (!expectedRoutes.includes(page.route)) add(page.route, 'unexpected-public-route', 'Critical', 'Not in authoritative public inventory')
  }
  if (articles) {
    const search = JSON.parse(await readFile(join(base,'search-index.json'), 'utf8'))
    const rss = new XMLParser().parse(await readFile(join(base,'rss.xml'),'utf8'))
    const feedLinks = [rss.rss?.channel?.item ?? []].flat().map(item => item.link)
    for (const article of articles) {
      const route = `/blog/${article.slug}`, page = byRoute.get(route)
      if (article.status !== 'published') {
        if (page || feedLinks.includes(origin + route) || search.some(item => item.slug === article.slug || item.url === route)) add(route, 'private-output', 'Critical', 'Nonpublic article exposed in generated output')
        continue
      }
      const schema = page?.schemas.find(s => s['@type'] === 'BlogPosting')
      const metadata = article.metadata
      if (page && metadata && (page.description !== metadata.description || page.headings.find(h => h.level === 1)?.text !== metadata.title || schema?.datePublished !== metadata.date || schema?.dateModified !== metadata.updatedAt)) add(route, 'registry-metadata', 'High', 'Generated metadata differs from author-controlled source')
    }
  }
  for (const page of pages.filter(p => p.pageType === 'redirect')) {
    const target = pages.find(p => p.indexable && p.url === page.canonicals[0])
    if (page.canonicals.length !== 1 || !target || !page.links.some(link => new URL(link.href, page.url).href === target.url)) add(page.route, 'redirect-target', 'High', 'Alias must point and link to one existing canonical public page')
  }
  async function exists(path) {
    const file = resolve(base, '.' + path)
    if (!file.startsWith(base + sep)) return false
    try { return (await stat(file)).isFile() } catch { return false }
  }
  for (const page of pages.filter(p => p.indexable)) {
    for (const link of page.links) {
      try {
        const url = new URL(link.href, page.url)
        if (!['http:','https:','mailto:','tel:'].includes(url.protocol) || url.username || url.password) { add(page.route, 'unsafe-link', 'High', link.href); continue }
        if (url.origin !== origin) continue
        const target = byRoute.get(routePath(decodeURIComponent(url.pathname)))
        if (!target && !await exists(decodeURIComponent(url.pathname))) add(page.route, 'broken-link', 'High', link.href)
        if (target) {
          if (target.pageType === 'redirect') add(page.route, 'redirected-link', 'Medium', link.href, 'warning')
          if (target.route !== page.route) { page.outbound.push(target.route); target.inbound.push(page.route); if (link.contextual) page.contextualOutbound.push(target.route) }
          if (url.hash && !target.ids.includes(decodeURIComponent(url.hash.slice(1)))) add(page.route, 'broken-fragment', 'Medium', link.href)
        }
      } catch { add(page.route, 'malformed-link', 'High', link.href) }
    }
    const assets = [...page.images.map(i => i.src), page.social['og:image'],page.social['twitter:image']]
    for (const src of new Set(assets.filter(Boolean))) {
      try { const url = new URL(src, page.url); if (url.origin === origin && !await exists(decodeURIComponent(url.pathname))) add(page.route, 'broken-image', 'High', src) }
      catch { add(page.route, 'broken-image', 'High', src) }
    }
  }
  for (const field of ['title','description','canonicals']) {
    const used = new Map()
    for (const page of pages.filter(p => p.indexable)) {
      const value = String(page[field])
      if (used.has(value)) add(page.route, `duplicate-${field}`, 'High', `Also on ${used.get(value)}: ${value}`)
      used.set(value, page.route)
    }
  }
  const depths = new Map([['/', 0]]), queue = ['/']
  for (let index = 0; index < queue.length; index++) {
    const route = queue[index]
    for (const next of byRoute.get(route)?.outbound ?? []) if (!depths.has(next)) { depths.set(next, depths.get(route) + 1); queue.push(next) }
  }
  for (const page of pages) {
    page.crawlDepth = depths.get(page.route) ?? null
    for (const key of ['inbound','outbound','contextualOutbound']) page[key] = [...new Set(page[key])].sort()
    if (page.indexable && page.route !== '/' && page.crawlDepth === null) add(page.route, 'orphan', 'Medium', 'No inbound anchors in static public pages', 'warning')
    if (page.pageType === 'article' && !page.contextualOutbound.length) add(page.route, 'contextual-links', 'Low', 'No contextual links to other public pages; review only when useful', 'warning')
    delete page.ids
    page.articleCharacters = page.articleText.length
    page.articleText = page.articleText.slice(0, 160)
  }
  const xml = await readFile(join(base,'sitemap.xml'),'utf8')
  let sitemap = []
  if (XMLValidator.validate(xml) !== true) add('/', 'sitemap-xml', 'High', 'Invalid XML')
  else {
    const parsed = new XMLParser({ ignoreAttributes: false }).parse(xml)
    if (parsed.urlset?.['@_xmlns'] !== 'http://www.sitemaps.org/schemas/sitemap/0.9') add('/', 'sitemap-xml', 'High', 'Incorrect namespace')
    const entries = [parsed.urlset?.url ?? []].flat()
    sitemap = entries.map(item => item.loc)
    for (const article of articles?.filter(a => a.status === 'published') ?? []) {
      const entry = entries.find(item => item.loc === `${origin}/blog/${article.slug}`)
      if (entry && article.metadata && entry.lastmod !== (article.metadata.updatedAt ?? article.metadata.date)) add(`/blog/${article.slug}`, 'sitemap-lastmod', 'High', 'Sitemap modification date must match authoritative editorial metadata')
    }
    if (new Set(sitemap).size !== sitemap.length) add('/', 'sitemap-duplicates', 'High', 'Duplicate locations')
    for (const url of sitemap) if (!pages.some(p => p.indexable && p.url === url)) add('/', 'sitemap-extra', 'High', url)
    for (const page of pages) { page.sitemapIncluded = sitemap.includes(page.url); if (page.indexable && !page.sitemapIncluded) add(page.route, 'sitemap-missing', 'High', page.url) }
  }
  const robots = await readFile(join(base,'robots.txt'),'utf8')
  if (/Disallow:\s*\/\s*$/mi.test(robots) || !robots.includes(`Sitemap: ${origin}/sitemap.xml`)) add('/', 'robots', 'Critical', robots)
  issues.sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
  return { summary: { pages: pages.length, indexablePages: pages.filter(p => p.indexable).length, canonicalUrls: new Set(pages.filter(p => p.indexable).flatMap(p => p.canonicals)).size, errors: issues.filter(i => i.level === 'error').length, warnings: issues.filter(i => i.level === 'warning').length, counts: Object.fromEntries([...new Set(issues.map(i => i.code))].sort().map(code => [code, issues.filter(i => i.code === code).length])) }, issues, pages }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const articles = await collectArticles(process.cwd(), { history: new Map() })
  for (const article of articles.filter(a => a.status === 'published')) article.metadata = await readMetadata(await readFile(`src/content/blog/${article.slug}.mdx`, 'utf8'))
  const policies = JSON.parse(await readFile('src/content/policies.json', 'utf8'))
  const series = JSON.parse(await readFile('src/generated/series.json', 'utf8'))
  const expectedRoutes = [...series.map(item => `/series/${item.id}`), '/' , '/about', '/contact', '/blog', '/explore', '/projects', '/pulse', '/tools/lipidpath', ...policies.map(p => `/${p.slug}`), ...await caseStudyRoutes(), ...articles.filter(a => a.status === 'published').map(a => `/blog/${a.slug}`)]
  const result = await auditSeo({ expectedRoutes, articles })
  const output = process.argv[2] ?? 'artifacts/seo/audit.json'
  await mkdir(resolve(output, '..'), { recursive: true })
  await writeFile(output, JSON.stringify(result, null, 2) + '\n')
  console.log(`SEO audit: ${JSON.stringify(result.summary)}; ${output}`)
  for (const issue of result.issues) console[issue.level === 'error' ? 'error' : 'warn'](`${issue.level.toUpperCase()} ${issue.route} [${issue.code}] ${issue.evidence}`)
  if (result.summary.errors) process.exitCode = 1
}
