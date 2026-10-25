import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import { collectArticles, readMetadata, normalizeSlug } from './redirects.mjs'
import { searchDocument } from './generate-search.mjs'

const escape = value => String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/gu, '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;')
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0
export function plainExcerpt(value) {
  const tree = unified().use(remarkParse).parse(value)
  function text(node) {
    if (node.type === 'html') return ''
    if (node.value !== undefined) return node.value
    return (node.children ?? []).map(text).join(['root', 'list'].includes(node.type) ? ' ' : '')
  }
  return text(tree).replace(/\s+/gu, ' ').trim()
}

export function renderRss(articles, site) {
  if (site.url !== 'https://simpyll.com') throw new Error('RSS requires the production canonical origin')
  const seen = new Set(), slugs = new Set()
  const entries = articles.filter(({ metadata: m, status }) => status === 'published' && m.status !== 'draft' && (m.status === undefined || m.status === 'published') && m.draft !== true && m.published !== false && m.test !== true && validDate(m.date) && ['title', 'description', 'category', 'author'].every(key => typeof m[key] === 'string' && m[key].trim()) && Array.isArray(m.tags) && m.tags.every(tag => typeof tag === 'string' && tag.trim()))
    .sort((a, b) => compare(b.metadata.date, a.metadata.date) || compare(a.id, b.id) || compare(a.slug, b.slug))
  for (const article of entries) {
    normalizeSlug(article.slug)
    if (!/^[a-zA-Z0-9:-]{1,100}$/.test(article.id)) throw new Error('Missing or invalid stable article identity')
    if (seen.has(article.id) || slugs.has(article.slug)) throw new Error('Duplicate RSS article identity or canonical slug')
    seen.add(article.id); slugs.add(article.slug)
  }
  const dates = entries.flatMap(({ metadata: m }) => [m.date, ...(validDate(m.updatedAt) ? [m.updatedAt] : [])]).sort()
  const element = (name, value) => `    <${name}>${escape(value)}</${name}>`
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">', '  <channel>',
    element('title', site.name), element('link', site.url), element('description', site.description), element('language', site.language),
    '    <atom:link href="https://simpyll.com/rss.xml" rel="self" type="application/rss+xml" />',
    ...(dates.length ? [element('lastBuildDate', new Date(dates.at(-1)).toUTCString())] : []),
    ...entries.map(({ id, slug, metadata: m }) => [
      '    <item>', element('title', m.title), element('link', `${site.url}/blog/${slug}`),
      `    <guid isPermaLink="false">${escape(`urn:simpyll:article:${id}`)}</guid>`,
      element('pubDate', new Date(m.date).toUTCString()), element('description', plainExcerpt(m.description)),
      ...[...new Set([m.category, ...m.tags])].map(tag => element('category', tag)), '    </item>',
    ].join('\n')), '  </channel>', '</rss>', '',
  ].join('\n')
}

export async function generateRss(root = process.cwd()) {
  // The identity/redirect registry is authoritative for withdrawals and current slugs.
  // History is unnecessary here: aliases never become feed entries.
  const registry = await collectArticles(root, { history: new Map() })
  const articles = []
  for (const article of registry.filter(article => article.status === 'published')) {
    const source = await readFile(resolve(root, `src/content/blog/${normalizeSlug(article.slug)}.mdx`), 'utf8')
    if (!await searchDocument(source, article.slug)) continue
    const metadata = await readMetadata(source)
    if (metadata.articleId !== article.id) throw new Error(`Article identity mismatch: ${article.slug}`)
    articles.push({ ...article, metadata })
  }
  const config = await readFile(resolve(root, 'src/config/site.ts'), 'utf8')
  const site = Object.fromEntries(['name', 'url', 'description', 'language'].map(key => {
    const value = config.match(new RegExp(`${key}:\\s*['"]([^'"]+)['"]`))?.[1]
    if (!value) throw new Error(`Missing site ${key}`)
    return [key, value]
  }))
  const xml = renderRss(articles, site)
  await writeFile(resolve(root, 'public/rss.xml'), xml, 'utf8')
  return xml
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await generateRss()
  console.log('Generated public/rss.xml')
}
