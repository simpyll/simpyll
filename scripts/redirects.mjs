import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { compile } from '@mdx-js/mdx'
import { literal } from './validate-content.mjs'

// Deliberately the same restricted ASCII convention as article filenames.
export function normalizeSlug(value) {
  if (typeof value !== 'string') throw new Error('Redirect slug must be a string')
  if (/%2f|%5c/i.test(value)) throw new Error(`Unsafe redirect slug: ${value}`)
  let slug
  try { slug = decodeURIComponent(value) } catch { throw new Error('Malformed redirect encoding') }
  slug = slug.replace(/^\/blog\//, '').replace(/\/$/, '')
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100) throw new Error(`Invalid redirect slug: ${value}; use a lowercase article slug or /blog/slug`)
  if (['404', 'index', 'assets', 'sitemap', 'rss', 'feed'].includes(slug)) throw new Error(`Reserved redirect slug: ${slug}`)
  return slug
}

export async function readMetadata(source) {
  let metadata
  await compile(source, { remarkPlugins: [() => tree => {
    for (const node of tree.children.filter(n => n.type === 'mdxjsEsm')) {
      for (const statement of node.data.estree.body) {
        for (const declaration of statement.declaration?.declarations ?? []) {
          if (statement.type === 'ExportNamedDeclaration' && declaration.id.name === 'metadata') metadata = literal(declaration.init)
        }
      }
    }
  }] })
  if (!metadata) throw new Error('Missing article metadata')
  return metadata
}

export function resolveRegistry(articles) {
  const claims = new Map(), redirects = {}, identities = new Set()
  for (const article of articles) {
    if (typeof article.id !== 'string' || !/^[a-zA-Z0-9:-]{1,100}$/.test(article.id)) throw new Error('Invalid stable article ID')
    if (identities.has(article.id)) throw new Error(`Duplicate article ID: ${article.id}`)
    identities.add(article.id)
    if (!['published', 'draft', 'unpublished'].includes(article.status)) throw new Error(`Invalid publishing status for ${article.id}`)
    // Validate nonpublic metadata too, but never emit it.
    normalizeSlug(article.slug)
    if (!Array.isArray(article.aliases)) throw new Error(`Aliases must be an array: ${article.id}`)
    for (const value of article.aliases) normalizeSlug(value)
  }
  const claim = (slug, article, kind) => {
    const previous = claims.get(slug)
    if (previous) throw new Error(`Redirect collision: /blog/${slug}; ${kind} claimed by ${article.id} conflicts with ${previous.kind} of ${previous.id}`)
    claims.set(slug, { id: article.id, kind })
  }
  const published = articles.filter(a => a.status === 'published')
  for (const article of published) claim(normalizeSlug(article.slug), article, 'canonical slug')
  for (const article of published) {
    const target = normalizeSlug(article.slug)
    for (const value of article.aliases) {
      const alias = normalizeSlug(value)
      if (alias === target) throw new Error(`Self-redirect for ${article.id}: ${alias}`)
      claim(alias, article, 'historical alias')
      redirects[alias] = target
    }
  }
  // Targets are canonical claims, never another redirect: chains/cycles/missing targets
  // are unrepresentable in the identity-owned model.
  return Object.fromEntries(Object.entries(redirects).sort(([a], [b]) => a.localeCompare(b)))
}

export function advanceHistory(previous, slug) {
  const current = normalizeSlug(slug)
  return [...new Set([...(previous?.history ?? []), ...(previous?.slug ? [previous.slug] : [])].map(normalizeSlug))].filter(s => s !== current).sort()
}

async function optionalJson(path, fallback) {
  try { return JSON.parse(await readFile(path, 'utf8')) } catch (e) { if (e.code === 'ENOENT') return fallback; throw e }
}

// Git is the durable journal for manual MDX; explicit IDs survive both file and slug
// renames. No mutable build cache or author-maintained alias list is required.
export async function manualHistory(root) {
  let commits
  try {
    if (execFileSync('git', ['rev-parse', '--is-shallow-repository'], { cwd: root, encoding: 'utf8' }).trim() === 'true') throw new Error('Slug history requires full Git history; use fetch-depth: 0')
    commits = execFileSync('git', ['log', '--format=%H', '--', 'src/content/blog'], { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }).trim().split('\n').filter(Boolean)
  } catch (error) {
    if (error.message.includes('full Git')) throw error
    throw new Error('Slug history requires a Git checkout with full history')
  }
  const history = new Map(), cache = new Map()
  // Only literal IDs and filename slugs are read here; never execute historical MDX.
  for (const commit of commits) {
    const paths = execFileSync('git', ['ls-tree', '-r', '--name-only', commit, '--', 'src/content/blog'], { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(p => p.endsWith('.mdx'))
    for (const path of paths) {
      const blob = execFileSync('git', ['rev-parse', `${commit}:${path}`], { cwd: root, encoding: 'utf8' }).trim()
      let metadata = cache.get(blob)
      if (!metadata) {
        const source = execFileSync('git', ['show', `${commit}:${path}`], { cwd: root, encoding: 'utf8' })
        try { metadata = await readMetadata(source) } catch { metadata = {} }
        cache.set(blob, metadata)
      }
      const slug = path.split('/').at(-1).slice(0, -4)
      const id = metadata.articleId ?? `manual:${slug}`
      if (metadata.status && metadata.status !== 'published' || metadata.draft === true || metadata.published === false) continue
      if (!history.has(id)) history.set(id, new Set())
      history.get(id).add(normalizeSlug(slug))
    }
  }
  return history
}

export async function collectArticles(root, { notion, history } = {}) {
  notion ??= await optionalJson(join(root, '.notion/published.json'), { articles: {} })
  history ??= await manualHistory(root)
  const articles = [], owned = new Set(Object.keys(notion.files ?? {}).filter(p => p.endsWith('.mdx')))
  for (const file of (await readdir(join(root, 'src/content/blog'))).filter(p => p.endsWith('.mdx')).sort()) {
    const path = `src/content/blog/${file}`
    if (owned.has(path)) continue
    const metadata = await readMetadata(await readFile(join(root, path), 'utf8'))
    const slug = file.slice(0, -4)
    const articleId = metadata.articleId
    if (!articleId) throw new Error(`${path}: Missing stable articleId; assign it once and retain it when renaming`)
    const status = metadata.status ?? 'published'
    if (metadata.redirectFrom !== undefined && !Array.isArray(metadata.redirectFrom)) throw new Error(`${path}: redirectFrom must be an array`)
    const automatic = [...(history.get(articleId) ?? [])].filter(s => s !== slug)
    articles.push({ id: articleId, slug, status, aliases: [...new Set(automatic)], manual: metadata.redirectFrom ?? [] })
  }
  for (const [pageId, article] of Object.entries(notion.articles)) {
    if ((article.status ?? 'published') === 'published') {
      const slug = normalizeSlug(article.slug)
      try { await readFile(join(root, `src/content/blog/${slug}.mdx`)) } catch { throw new Error(`Missing published redirect target: notion:${pageId} at /blog/${slug}`) }
    }
    articles.push({ id: `notion:${pageId}`, slug: article.slug, status: article.status ?? 'published', aliases: article.history ?? [], manual: article.redirectFrom ?? [] })
  }
  for (const article of articles) article.aliases = [...article.aliases, ...article.manual]
  return articles
}

export async function generateRedirects(root) {
  const redirects = resolveRegistry(await collectArticles(root))
  await mkdir(join(root, 'src/generated'), { recursive: true })
  await writeFile(join(root, 'src/generated/redirects.json'), JSON.stringify(redirects, null, 2) + '\n')
  return redirects
}

const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll("'", '&#39;')
export function redirectHtml(destination, language = 'en-US', origin = 'https://simpyll.com') {
  const url = new URL(destination)
  if (url.origin !== new URL(origin).origin || url.search || url.hash || url.pathname !== `/blog/${normalizeSlug(url.pathname)}`) throw new Error('Unsafe redirect destination')
  const safe = escape(url.href)
  return `<!doctype html>\n<html lang="${escape(language)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Article moved · Simpyll</title><meta http-equiv="refresh" content="0;url=${safe}"><link rel="canonical" href="${safe}"><meta name="robots" content="noindex,follow"></head><body><main><h1>Article moved</h1><p><a href="${safe}">Continue to the article’s current address</a>.</p></main></body></html>\n`
}
