import { manifest } from './manifest.mjs'
import { normalizeEditorial } from '../../src/lib/editorial.mjs'
import { ownedPath } from './ownership.mjs'
import { advanceHistory, normalizeSlug, resolveRegistry, readMetadata, manualHistory } from '../redirects.mjs'
import { readdir, lstat } from 'node:fs/promises'
import sharp from 'sharp'
import { imageName } from '../images/names.mjs'
import { createHash } from 'node:crypto'
import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export const API_VERSION = '2026-03-11'
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const hash = value => createHash('sha256').update(value).digest('hex')
const json = value => JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026')
export const id = value => {
  const result = String(value ?? '').replaceAll('-', '').toLowerCase()
  if (!/^[a-f0-9]{32}$/.test(result)) throw new Error('Invalid Notion ID')
  return result
}

export function notionClient(token, { fetcher = fetch, wait = sleep } = {}) {
  if (!token) throw new Error('NOTION_API_TOKEN is required')
  return async (path, body) => {
    for (let attempt = 0; attempt < 6; attempt++) {
      await wait(350) // Keep sequential calls below Notion's average 3 requests/second.
      let response
      try {
        response = await fetcher(`https://api.notion.com/v1/${path}`, {
          method: body ? 'POST' : 'GET',
          headers: { Authorization: `Bearer ${token}`, 'Notion-Version': API_VERSION, 'Content-Type': 'application/json' },
          ...(body ? { body: JSON.stringify(body) } : {}),
          signal: AbortSignal.timeout(30_000),
        })
      } catch {
        if (attempt === 5) throw new Error('Notion network request failed')
        await wait(1000 * 2 ** attempt)
        continue
      }
      if (response.ok) return response.json()
      if ((response.status === 429 || response.status >= 500) && attempt < 5) {
        const retry = Number(response.headers.get('retry-after'))
        await wait(Math.min(60_000, Math.max(1000 * 2 ** attempt, (retry || 0) * 1000)))
        continue
      }
      // Never log response bodies, request headers, signed URLs, or content.
      const error = new Error(`Notion request failed (HTTP ${response.status})`)
      error.status = response.status
      throw error
    }
  }
}

export async function paginate(api, path, body) {
  const results = [], seen = new Set()
  let cursor
  do {
    const query = new URLSearchParams({ page_size: '100', ...(cursor ? { start_cursor: cursor } : {}) })
    const response = body
      ? await api(path, { ...body, page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) })
      : await api(`${path}?${query}`)
    if (!Array.isArray(response.results)) throw new Error('Invalid paginated Notion response')
    if (results.length + response.results.length > 10000) throw new Error('Notion pagination block/result limit exceeded')
    results.push(...response.results)
    if (!response.has_more) break
    cursor = response.next_cursor
    if (!cursor || seen.has(cursor)) throw new Error('Invalid Notion pagination cursor')
    seen.add(cursor)
  } while (cursor)
  return results
}

export async function discoverSource(api, configuredId) {
  const root = id(configuredId), databases = new Set(), visited = new Set()
  // A full-page database ID is also accepted, but a normal page is not queried as one.
  try {
    const database = await api(`databases/${root}`)
    if (database.object === 'database') databases.add(root)
  } catch (error) {
    if (![400, 404].includes(error.status)) throw error
  }
  async function walk(parent, depth = 0) {
    if (depth > 12 || visited.size > 500) throw new Error('Notion discovery limit exceeded')
    if (visited.has(parent)) return
    visited.add(parent)
    for (const block of await paginate(api, `blocks/${parent}/children`)) {
      if (block.in_trash) continue
      if (block.type === 'child_database') databases.add(id(block.id))
      else if (block.has_children || block.type === 'child_page') await walk(id(block.id), depth + 1)
    }
  }
  if (!databases.size) await walk(root)
  const matches = new Map()
  for (const databaseId of databases) {
    const database = await api(`databases/${databaseId}`)
    if (database.in_trash) continue
    for (const entry of database.data_sources ?? []) {
      const source = await api(`data_sources/${id(entry.id)}`)
      const p = source.properties ?? {}
      if (!source.in_trash && p.Name?.type === 'title' && ['status', 'select'].includes(p.Status?.type)) {
        matches.set(id(source.id), source)
      }
    }
  }
  if (matches.size !== 1) throw new Error(`Expected one blog data source with Name and Status; found ${matches.size}. Share the original database with Simpyll Blog Publisher; linked views alone are unsupported.`)
  return [...matches.values()][0]
}

export const plain = rich => (rich ?? []).map(part => part.plain_text ?? part.text?.content ?? '').join('')
export function safeUrl(value, image = false) {
  if (typeof value !== 'string' || /[\u0000-\u0020\u007f\\]/.test(value)) throw new Error('Unsafe content URL')
  let url
  try { url = new URL(value) } catch { throw new Error('Invalid content URL') }
  if (!(image ? ['https:'] : ['https:', 'http:', 'mailto:']).includes(url.protocol) || url.username || url.password) throw new Error('Unsafe content URL')
  return url.href
}
export function richText(parts = []) {
  return parts.map(part => {
    if (part.type === 'equation') {
      if (typeof part.equation?.expression !== 'string' || !part.equation.expression.trim()) throw new Error('Invalid equation expression')
      return `<code aria-label="Equation (TeX)">{${json(part.equation.expression)}}</code>`
    }
    if (part.type && part.type !== 'text') throw new Error('Unsupported rich text type; use plain text instead of mentions/equations')
    const value = part.plain_text ?? part.text?.content ?? ''
    if (!value) return ''
    let text = value.split('\n').map(line => `{${json(line)}}`).join('<br />')
    const a = part.annotations ?? {}
    for (const [key, tag] of [['code', 'code'], ['bold', 'strong'], ['italic', 'em'], ['strikethrough', 'del'], ['underline', 'u']]) {
      if (a[key]) text = `<${tag}>${text}</${tag}>`
    }
    const link = part.href ?? part.text?.link?.url
    if (link) text = `<a href={${json(safeUrl(link))}}>${text}</a>`
    return text
  }).join('')
}

// Diagnostics contain structural locations only, never prose, filenames or signed URLs.
function blockError(block, message) {
  const type = /^[a-z_]+$/.test(block.type) ? block.type : 'unknown'
  const location = /^[a-f0-9-]{32,36}$/i.test(block.id ?? '') ? block.id : 'unidentified'
  return new Error(`Notion block ${type} (${location}): ${message}`)
}

export async function readBlocks(api, parent, depth = 0, state = { count: 0, ancestors: new Set() }) {
  if (depth > 30) throw new Error('Article nesting limit exceeded')
  const key = id(parent)
  if (state.ancestors.has(key)) throw new Error('Article block cycle detected')
  state.ancestors.add(key)
  try {
    const blocks = await paginate(api, `blocks/${key}/children`)
    state.count += blocks.length
    if (state.count > 10000) throw new Error('Article total block limit exceeded')
    for (const block of blocks) {
      if (block.in_trash) continue
      if (['synced_block', 'child_page', 'child_database'].includes(block.type)) {
        throw blockError(block, 'privacy boundary; move explicitly public content into this article; traversal is disabled')
      }
      if (block.has_children) {
        if (!['paragraph', 'heading_1', 'heading_2', 'heading_3', 'bulleted_list_item', 'numbered_list_item', 'to_do', 'quote', 'callout', 'toggle', 'table'].includes(block.type)) throw blockError(block, 'Unsupported nested block; replace with supported content')
        block.children = await readBlocks(api, block.id, depth + 1, state)
      }
    }
    return blocks.filter(block => !block.in_trash)
  } finally { state.ancestors.delete(key) }
}

// Notion has no independent image-alt field in this API. Authors explicitly opt in.
export function imageAccessibility(block) {
  try { return imageDescription(block.image.caption) } catch { throw blockError(block, 'image caption must start with "Alt: descriptive text" or "Decorative", followed by optional visible caption') }
}

export function imageDescription(caption = []) {
  richText(caption) // Validate even metadata-only runs before removing the alt declaration.
  const text = plain(caption), first = text.split('\n')[0]
  const decorative = first === 'Decorative'
  const alt = first.startsWith('Alt: ') ? first.slice(5).trim() : ''
  if (!decorative && !alt) throw new Error('Image requires caption first line "Alt: description" or "Decorative"')
  let offset = first.length + (text.includes('\n') ? 1 : 0)
  const visible = caption.flatMap(part => {
    const value = part.plain_text ?? part.text?.content ?? ''
    const skip = Math.min(offset, value.length); offset -= skip
    if (skip === value.length) return []
    return [{ ...part, plain_text: value.slice(skip), text: { ...part.text, content: value.slice(skip) } }]
  })
  return { alt, caption: visible }
}

function publicResource(value, file = false) {
  const url = new URL(safeUrl(value, true))
  if (notionImageHost(url.hostname) || /(^|\.)(notion\.(so|site)|notion-static\.com|notionusercontent\.com)$/.test(url.hostname) || [...url.searchParams.keys()].some(key => /^(x-amz-|x-goog-|signature$|sig$|token$)/i.test(key)) || (file && (url.search || url.hash))) throw new Error('Resource requires a public HTTPS URL; attachments must have no query or fragment')
  return url
}
function publicAttachment(data) {
  if (data.type !== 'external') throw new Error('Attachments require a permanent public external HTTPS URL; private Notion uploads are unsupported')
  if (typeof data.external?.url !== 'string' || /(?:\/|%2f)(?:\.|%2e){2}(?:\/|%2f|$)/i.test(data.external.url)) throw new Error('Invalid attachment path')
  const url = publicResource(data.external.url, true)
  let filename
  try {
    const path = decodeURIComponent(url.pathname)
    if (/[\u0000-\u001f\u007f\\]/.test(path) || /%[0-9a-f]{2}/i.test(path) || /%2f|%5c/i.test(url.pathname)) throw new Error('Invalid attachment path')
    filename = path.split('/').at(-1)
  } catch { throw new Error('Invalid attachment path') }
  if (!/^[\p{L}\p{N} _.-]+\.(pdf|txt|csv)$/iu.test(filename) || filename.includes('..')) throw new Error('Unsupported attachment path/type; use a public PDF, TXT or CSV link')
  return { url: url.href, filename: typeof data.name === 'string' && data.name.trim() ? data.name : filename, extension: filename.split('.').at(-1).toUpperCase() }
}

export async function convertBlocks(blocks, image, headingStack = [], state = { depth: 0, budget: { count: 0 }, ancestors: new Set() }) {
  if (state.depth > 30) throw blockError(blocks[0] ?? {}, 'Article nesting limit exceeded')
  const output = []
  let list = null
  for (const block of blocks) {
    if (++state.budget.count > 10_000) throw blockError(block, 'Article block count limit exceeded')
    if (state.ancestors.has(block)) throw blockError(block, 'Article block cycle detected')
    if (['synced_block', 'child_page', 'child_database'].includes(block.type)) throw blockError(block, 'Unsupported privacy boundary; traversal is disabled')
    try {
      const type = block.type, data = block[type] ?? {}
      const current = type === 'bulleted_list_item' ? 'ul' : type === 'numbered_list_item' ? 'ol' : null
      if (current !== list) {
        if (list) output.push(`</${list}>`)
        if (current) output.push(`<${current}>`)
        list = current
      }
      if (type === 'table') {
        const rows = block.children ?? []
        state.budget.count += rows.length
        if (state.budget.count > 10_000) throw blockError(block, 'Article block count limit exceeded')
        const width = data.table_width
        if (!Number.isInteger(width) || width < 1 || !rows.length || rows.some(row => row.type !== 'table_row' || row.has_children || row.children?.length || !Array.isArray(row.table_row?.cells) || row.table_row.cells.length !== width || row.table_row.cells.some(cell => !Array.isArray(cell)))) throw blockError(block, 'Invalid Notion table; require nonempty rectangular rows matching table_width')
        const renderRow = (row, rowIndex) => `<tr>${row.table_row.cells.map((cell, colIndex) => {
          const header = data.has_column_header && rowIndex === 0 || data.has_row_header && colIndex === 0
          const tag = header ? 'th' : 'td'
          const scope = header ? ` scope="${data.has_column_header && rowIndex === 0 ? 'col' : 'row'}"` : ''
          return `<${tag}${scope}>${richText(cell)}</${tag}>`
        }).join('')}</tr>`
        output.push(`<table>${data.has_column_header && rows.length ? `<thead>${renderRow(rows[0], 0)}</thead>` : ''}<tbody>${rows.slice(data.has_column_header ? 1 : 0).map((row, i) => renderRow(row, i + (data.has_column_header ? 1 : 0))).join('')}</tbody></table>`)
        continue
      }
      // The page owns h1. Preserve authored nesting without skipped heading levels,
      // even when an author starts with Notion Heading 2/3 or skips a rank.
      let headingLevel
      if (/^heading_[123]$/.test(type)) {
        const rank = Number(type.at(-1))
        while (headingStack.length && headingStack.at(-1).rank >= rank) headingStack.pop()
        headingLevel = (headingStack.at(-1)?.level ?? 1) + 1
        headingStack.push({ rank, level: headingLevel })
      }
      const text = richText(data.rich_text)
      if (block.children?.length && !['paragraph', 'heading_1', 'heading_2', 'heading_3', 'bulleted_list_item', 'numbered_list_item', 'to_do', 'quote', 'callout', 'toggle'].includes(type)) throw blockError(block, 'Unsupported nested block')
      state.ancestors.add(block)
      let children
      try { children = block.children?.length ? await convertBlocks(block.children, image, headingStack, { ...state, depth: state.depth + 1 }) : '' } finally { state.ancestors.delete(block) }
      if (current) output.push(`<li>${text}${children}</li>`)
      else if (type === 'paragraph') output.push(`<p>${text}</p>${children}`)
      else if (/^heading_[123]$/.test(type)) {
        const level = headingLevel
        output.push(`<h${level}>${text}</h${level}>${children}`)
      } else if (type === 'callout') output.push(`<Callout variant="note"><p>${text}</p>${children}</Callout>`)
      else if (type === 'quote') output.push(`<blockquote><p>${text}</p>${children}</blockquote>`)
      else if (type === 'toggle') {
        if (!plain(data.rich_text).trim()) throw blockError(block, 'Toggle requires a meaningful summary')
        output.push(`<details><summary>${text}</summary>${children}</details>`)
      }
      else if (type === 'code') {
        const language = /^[a-z0-9_+-]+$/i.test(data.language ?? '') ? data.language.toLowerCase() : 'plaintext'
        const code = `<pre><code className="language-${language}">{${json(plain(data.rich_text))}}</code></pre>`
        output.push(data.caption?.length ? `<figure>\n\n${code}\n\n<figcaption>${richText(data.caption)}</figcaption>\n\n</figure>` : code)
      }
      else if (type === 'divider') output.push('<hr />')
      else if (type === 'bookmark') {
        try {
          const url = publicResource(data.url).href
          const captionHasLinks = data.caption?.some(part => part.href || part.text?.link?.url)
          output.push(`<p><a href={${json(url)}}>${!captionHasLinks && plain(data.caption).trim() ? richText(data.caption) : `{${json(url)}}`}</a>${captionHasLinks ? ` — ${richText(data.caption)}` : ''}</p>`)
        } catch { throw blockError(block, 'bookmark requires a safe HTTPS URL and text caption') }
      } else if (type === 'file') {
        let attachment
        try { attachment = publicAttachment(data) } catch (error) { throw blockError(block, error.message) }
        output.push(`<p><a href={${json(attachment.url)}}>{${json(attachment.filename + ' (' + attachment.extension + ')')}}</a>${data.caption?.length ? ` — ${richText(data.caption)}` : ''}</p>`)
      } else if (type === 'to_do') output.push(`<p>{${json(data.checked ? '☑ Completed: ' : '☐ Not completed: ')}}${text}</p>${children}`)
      else if (type === 'equation') output.push(`<p>${richText([{ type: 'equation', equation: data }])}</p>`)
      else if (type === 'image') {
        const accessible = imageAccessibility(block)
        const url = await image(block)
        output.push(`<figure><img src={${json(url)}} alt={${json(accessible.alt)}} />${plain(accessible.caption) ? `<figcaption>${richText(accessible.caption)}</figcaption>` : ''}</figure>`)
      } else throw blockError(block, 'Unsupported Notion block type; replace with supported blocks before publication')
    } catch (error) {
      if (error.message.startsWith('Notion block ')) throw error
      // Do not relay compiler, downloader or malformed-payload details.
      throw blockError(block, error.name === 'TypeError' ? 'invalid block payload; check rich text or table shape' : 'conversion failed; check rich text, URL, table shape or media availability')
    }
  }
  if (list) output.push(`</${list}>`)
  return output.join('\n')
}

function notionImageHost(hostname) {
  return ['s3.us-west-2.amazonaws.com', 'prod-files-secure.s3.us-west-2.amazonaws.com', 'secure.notion-static.com', 'attachment.notion-static.com'].includes(hostname) || hostname.endsWith('.notionusercontent.com')
}

export async function downloadImage(value, fetcher = fetch, wait = sleep) {
  const url = new URL(safeUrl(value, true))
  if (!notionImageHost(url.hostname)) throw new Error('Unrecognized Notion image host')
  let response
  for (let attempt = 0; attempt < 4; attempt++) {
    try { response = await fetcher(url.href, { redirect: 'error', signal: AbortSignal.timeout(30_000) }) } catch {
      if (attempt === 3) throw new Error('Image download failed')
      await wait(1000 * 2 ** attempt)
      continue
    }
    if (response.ok) break
    if ((response.status === 429 || response.status >= 500) && attempt < 3) {
      await wait(Math.min(60_000, Math.max(1000 * 2 ** attempt, Number(response.headers.get('retry-after')) * 1000 || 0)))
    } else throw new Error('Image download failed')
  }
  const mime = response.headers.get('content-type')?.split(';')[0]
  const extension = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/avif': 'avif' }[mime]
  if (!extension) throw new Error('Unsupported image format; use PNG, JPEG, GIF, WebP, or AVIF')
  const chunks = []; let size = 0
  for await (const chunk of response.body) {
    size += chunk.length
    if (size > 20 * 1024 * 1024) throw new Error('Image exceeds 20 MiB')
    chunks.push(chunk)
  }
  if (!size) throw new Error('Empty image download')
  const bytes = Buffer.concat(chunks)
  try {
    const metadata = await sharp(bytes, { limitInputPixels: 40_000_000, animated: true }).metadata()
    const actual = { png: 'png', jpeg: 'jpg', gif: 'gif', webp: 'webp', heif: 'avif', avif: 'avif' }[metadata.format]
    if (actual !== extension) throw new Error('type mismatch')
  } catch { throw new Error('Invalid image content or dimensions') }
  return { bytes, extension }
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export function metadataFor(page, previous, blocks) {
  const p = page.properties ?? {}, title = plain(p.Name?.title).trim()
  if (!title) throw new Error('Published article requires Name')
  const explicit = plain(p.Slug?.rich_text).trim()
  const slug = explicit || previous?.slug || title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `post-${id(page.id)}`
  if (!slugPattern.test(slug) || slug.length > 100) throw new Error('Slug must be 1–100 lowercase letters/digits separated by hyphens')
  const date = (previous?.date || p['Published Date']?.date?.start || page.created_time || '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error('Invalid Published Date')
  const description = plain(p.Description?.rich_text).trim() || plain(blocks.find(b => b.type === 'paragraph')?.paragraph.rich_text).replace(/\s+/g, ' ').trim().slice(0, 160) || title
  const editorial = {}
  const updated = p['Updated Date']
  if (updated && updated.type !== 'date') throw new Error('Updated Date must be a Notion date property')
  if (updated?.date?.end) throw new Error('Updated Date must be a single date without a range')
  if (updated?.date) editorial.updatedAt = updated.date.start
  for (const [property, field] of [['Revision Notes', 'revisions'], ['Corrections', 'corrections']]) {
    if (p[property] && p[property].type !== 'rich_text') throw new Error(`${property} must be a Notion text property containing a JSON array`)
    const text = plain(p[property]?.rich_text).trim()
    if (text) {
      try { editorial[field] = JSON.parse(text) } catch { throw new Error(`${property} must contain a JSON array of { date, description, id? } objects`) }
    }
  }
  return normalizeEditorial({ title, description, slug, date, ...editorial, category: p.Category?.select?.name || p.Category?.multi_select?.[0]?.name || plain(p.Category?.rich_text) || 'Journal', author: 'David Becker', tags: (p.Tags?.multi_select ?? []).map(t => t.name).sort() })
}
const manifestPath = '.notion/published.json'
async function readOptional(path) {
  try { return await readFile(path) } catch (error) { if (error.code === 'ENOENT') return null; throw error }
}


// Build a complete plan before touching disk. Any API/conversion/collision error aborts it.
export async function synchronize({ root, api, pageId, imageDownloader = downloadImage, validate = async () => {} , dryRun = false }) {
  const oldBytes = await readOptional(join(root, manifestPath))
  const old = oldBytes ? manifest(oldBytes) : { version: 1, articles: {}, files: {} }
  if (old.version !== 1 || !old.files || !old.articles) throw new Error('Invalid publisher manifest')
  for (const [path, digest] of Object.entries(old.files)) {
    if (!ownedPath(path)) throw new Error('Unsafe manifest path')
    const bytes = await readOptional(join(root, path))
    if (bytes && hash(bytes) !== digest) throw new Error('Generated file was manually changed; restore it before syncing')
  }
  const source = await discoverSource(api, pageId)
  const sourceId = id(source.id)
  if (old.sourceId && old.sourceId !== sourceId) throw new Error('Blog data source changed; review manifest before migrating')
  const pages = await paginate(api, `data_sources/${sourceId}/query`, { filter: { property: 'Status', [source.properties.Status.type]: { equals: 'Published' } } })
  const next = { version: 1, sourceId, articles: Object.fromEntries(Object.entries(old.articles).map(([key, article]) => [key, { slug: article.slug, date: article.date, history: article.history ?? [], status: 'unpublished' }])), files: {} }, files = new Map(), slugs = new Set(), seenPages = new Set()
  for (const page of pages.sort((a, b) => id(a.id).localeCompare(id(b.id)))) {
    if (page.in_trash || page.archived || (page.properties?.Status?.status?.name ?? page.properties?.Status?.select?.name) !== 'Published') continue
    const pageKey = id(page.id)
    if (seenPages.has(pageKey)) throw new Error('Duplicate Notion page in query')
    seenPages.add(pageKey)
    const blocks = await readBlocks(api, pageKey)
    const metadata = metadataFor(page, old.articles[pageKey], blocks)
    if (slugs.has(metadata.slug)) throw new Error('Duplicate published slug; assign distinct Slug values')
    slugs.add(metadata.slug)
    metadata.articleId = `notion:${pageKey}`
    const history = advanceHistory(old.articles[pageKey], metadata.slug)
    const aliasesText = plain(page.properties?.['Redirect From']?.rich_text).trim()
    const redirectFrom = aliasesText ? aliasesText.split(',').map(value => normalizeSlug(value.trim())) : []
    const assets = {}
    let imageSequence = 0
    const content = await convertBlocks(blocks, async block => {
      imageSequence++
      const image = block.image
      if (!['external', 'file'].includes(image.type)) throw new Error('Unsupported image type')
      const url = safeUrl(image[image.type].url, true)
      if (image.type === 'external' && !notionImageHost(new URL(url).hostname)) return url
      const assetKey = block.id ? id(block.id) : String(imageSequence)
      const previous = old.articles[pageKey]?.assets?.[assetKey]
      const identity = new URL(url).origin + new URL(url).pathname
      if (previous && block.last_edited_time && previous.revision === block.last_edited_time && previous.identity === identity && old.files[previous.path]) {
        const stored = await readOptional(join(root, previous.path))
        if (stored) { files.set(previous.path, stored); assets[assetKey] = previous; return '/' + previous.path.slice(7) }
      }
      const { bytes, extension } = await imageDownloader(url)
      const name = imageName({ caption: plain(imageAccessibility(block).caption), article: metadata.slug, sequence: imageSequence })
      const path = `public/images/notion/${pageKey}/${name}-${hash(bytes).slice(0, 12)}.${extension}`
      assets[assetKey] = { path, identity, revision: block.last_edited_time ?? null }
      files.set(path, bytes)
      return `/${path.slice('public/'.length)}`
    })
    // Recheck status and revision after reading content; never publish an observed draft.
    const latest = await api(`pages/${pageKey}`)
    if (latest.in_trash || latest.archived || (latest.properties?.Status?.status?.name ?? latest.properties?.Status?.select?.name) !== 'Published' || latest.last_edited_time !== page.last_edited_time) throw new Error('Article changed during synchronization; retry next run')
    const fields = Object.entries(metadata).map(([key, value]) => `  ${key}: ${json(value)},`).join('\n')
    const mdx = `export const metadata = {\n${fields}\n}\n\n${content}\n`
    await validate(mdx)
    files.set(`src/content/blog/${metadata.slug}.mdx`, Buffer.from(mdx))
    next.articles[pageKey] = { slug: metadata.slug, date: metadata.date, history, redirectFrom, status: 'published', assets }
  }
  const hasGit = await lstat(join(root, '.git')).then(() => true).catch(error => { if (error.code === 'ENOENT') return false; throw error })
  const gitHistory = hasGit ? await manualHistory(root) : new Map()
  const claims = Object.entries(next.articles).map(([key, article]) => ({ id: `notion:${key}`, slug: article.slug, status: article.status, aliases: [...(article.history ?? []), ...(article.redirectFrom ?? [])] }))
  for (const file of await readdir(join(root, 'src/content/blog'))) {
    const path = `src/content/blog/${file}`
    if (!file.endsWith('.mdx') || path in old.files) continue
    const source = await readFile(join(root, path), 'utf8')
    const metadata = source.includes('export const metadata') ? await readMetadata(source) : {}
    claims.push({ id: metadata.articleId ?? `manual:${file.slice(0, -4)}`, slug: file.slice(0, -4), status: metadata.status ?? 'published', aliases: [...(gitHistory.get(metadata.articleId) ?? [])].filter(slug => slug !== file.slice(0, -4)).concat(metadata.redirectFrom ?? []) })
  }
  resolveRegistry(claims)
  // Published media URLs are permanent compatibility assets, even after unpublish.
  for (const path of Object.keys(old.files).filter(p => p.startsWith('public/images/'))) {
    if (!files.has(path)) { const bytes = await readOptional(join(root, path)); if (bytes) files.set(path, bytes) }
  }
  // Refuse collisions even when the generated content happens to match a manual file.
  for (const [path, bytes] of files) {
    if (!ownedPath(path)) throw new Error('Unsafe generated path')
    if (!(path in old.files) && await readOptional(join(root, path))) throw new Error('Generated path collides with an unrelated file')
    next.files[path] = hash(bytes)
  }
  if (!oldBytes && !files.size) return { changed: false, articles: 0 }
  files.set(manifestPath, Buffer.from(JSON.stringify(next, null, 2) + '\n'))
  const writes = [], deletes = Object.keys(old.files).filter(path => !files.has(path))
  for (const [path, bytes] of files) {
    const existing = await readOptional(join(root, path))
    if (!existing?.equals(bytes)) writes.push([path, bytes])
  }
  if (!dryRun) {
    const backups = new Map()
    for (const path of [...writes.map(([path]) => path), ...deletes]) backups.set(path, await readOptional(join(root, path)))
    try {
      for (const [path, bytes] of writes) { await mkdir(dirname(join(root, path)), { recursive: true }); await writeFile(join(root, path), bytes) }
      for (const path of deletes) { try { await unlink(join(root, path)) } catch (error) { if (error.code !== 'ENOENT') throw error } }
    } catch (error) {
      for (const [path, bytes] of backups) {
        if (bytes) await writeFile(join(root, path), bytes)
        else await unlink(join(root, path)).catch(e => { if (e.code !== 'ENOENT') throw e })
      }
      throw error
    }
  }
  return { changed: Boolean(writes.length || deletes.length), articles: Object.values(next.articles).filter(article => article.status === 'published').length, writes: writes.length, deletes: deletes.length }
}
