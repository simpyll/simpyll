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
  let url
  try { url = new URL(value) } catch { throw new Error('Invalid content URL') }
  if (!(image ? ['https:'] : ['https:', 'http:', 'mailto:']).includes(url.protocol) || url.username || url.password) throw new Error('Unsafe content URL')
  return url.href
}
export function richText(parts = []) {
  return parts.map(part => {
    if (part.type && part.type !== 'text') throw new Error('Unsupported rich text type; use plain text instead of mentions/equations')
    let text = `{${json(part.plain_text ?? part.text?.content ?? '')}}`
    const a = part.annotations ?? {}
    for (const [key, tag] of [['code', 'code'], ['bold', 'strong'], ['italic', 'em'], ['strikethrough', 'del'], ['underline', 'u']]) {
      if (a[key]) text = `<${tag}>${text}</${tag}>`
    }
    const link = part.href ?? part.text?.link?.url
    if (link) text = `<a href={${json(safeUrl(link))}}>${text}</a>`
    return text
  }).join('')
}

export async function readBlocks(api, parent, depth = 0) {
  if (depth > 30) throw new Error('Article nesting limit exceeded')
  const blocks = await paginate(api, `blocks/${id(parent)}/children`)
  for (const block of blocks) {
    if (block.in_trash) continue
    // Never traverse subpages, databases, or synced blocks: they can contain private content.
    if (block.has_children) {
      if (!['paragraph', 'heading_1', 'heading_2', 'heading_3', 'bulleted_list_item', 'numbered_list_item', 'quote', 'callout', 'toggle', 'table'].includes(block.type)) throw new Error('Unsupported nested block')
      block.children = await readBlocks(api, block.id, depth + 1)
    }
  }
  return blocks.filter(block => !block.in_trash)
}

export async function convertBlocks(blocks, image) {
  const output = []
  let list = null
  for (const block of blocks) {
    const type = block.type, data = block[type] ?? {}
    const current = type === 'bulleted_list_item' ? 'ul' : type === 'numbered_list_item' ? 'ol' : null
    if (current !== list) {
      if (list) output.push(`</${list}>`)
      if (current) output.push(`<${current}>`)
      list = current
    }
    if (type === 'table') {
      const rows = block.children ?? []
      const width = data.table_width
      if (!Number.isInteger(width) || width < 1 || rows.some(row => row.type !== 'table_row' || row.table_row?.cells?.length !== width)) throw new Error('Invalid Notion table')
      const renderRow = (row, rowIndex) => `<tr>${row.table_row.cells.map((cell, colIndex) => {
        const header = data.has_column_header && rowIndex === 0 || data.has_row_header && colIndex === 0
        const tag = header ? 'th' : 'td'
        const scope = header ? ` scope="${data.has_column_header && rowIndex === 0 ? 'col' : 'row'}"` : ''
        return `<${tag}${scope}>${richText(cell)}</${tag}>`
      }).join('')}</tr>`
      output.push(`<table>${data.has_column_header && rows.length ? `<thead>${renderRow(rows[0], 0)}</thead>` : ''}<tbody>${rows.slice(data.has_column_header ? 1 : 0).map((row, i) => renderRow(row, i + (data.has_column_header ? 1 : 0))).join('')}</tbody></table>`)
      continue
    }
    const text = richText(data.rich_text)
    const children = block.children?.length ? await convertBlocks(block.children, image) : ''
    if (current) output.push(`<li>${text}${children}</li>`)
    else if (type === 'paragraph') output.push(`<p>${text}</p>${children}`)
    else if (/^heading_[123]$/.test(type)) {
      const level = Number(type.at(-1)) + 1 // Page template owns H1.
      output.push(`<h${level}>${text}</h${level}>${children}`)
    } else if (type === 'callout') output.push(`<Callout variant="note"><p>${text}</p>${children}</Callout>`)
    else if (type === 'quote') output.push(`<blockquote><p>${text}</p>${children}</blockquote>`)
    else if (type === 'toggle') output.push(`<details><summary>${text}</summary>${children}</details>`)
    else if (type === 'code') {
      const language = /^[a-z0-9_+-]+$/i.test(data.language ?? '') ? data.language.toLowerCase() : 'plaintext'
      output.push(`<pre><code className="language-${language}">{${json(plain(data.rich_text))}}</code></pre>`)
    }
    else if (type === 'divider') output.push('<hr />')
    else if (type === 'image') {
      const url = await image(block)
      output.push(`<figure><img src={${json(url)}} alt={${json(plain(data.caption))}} loading="lazy" />${data.caption?.length ? `<figcaption>${richText(data.caption)}</figcaption>` : ''}</figure>`)
    } else throw new Error(`Unsupported Notion block type: ${/^[a-z_]+$/.test(type) ? type : 'unknown'}`)
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
  return { bytes: Buffer.concat(chunks), extension }
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export function metadataFor(page, previous, blocks) {
  const p = page.properties ?? {}, title = plain(p.Name?.title).trim()
  if (!title) throw new Error('Published article requires Name')
  const explicit = plain(p.Slug?.rich_text).trim()
  const slug = explicit || previous?.slug || title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `post-${id(page.id)}`
  if (!slugPattern.test(slug) || slug.length > 100) throw new Error('Slug must be 1–100 lowercase letters/digits separated by hyphens')
  const date = (p['Published Date']?.date?.start || previous?.date || page.created_time || '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error('Invalid Published Date')
  const description = plain(p.Description?.rich_text).trim() || plain(blocks.find(b => b.type === 'paragraph')?.paragraph.rich_text).replace(/\s+/g, ' ').trim().slice(0, 160) || title
  return { title, description, slug, date, category: p.Category?.select?.name || p.Category?.multi_select?.[0]?.name || plain(p.Category?.rich_text) || 'Journal', author: 'David Becker', tags: (p.Tags?.multi_select ?? []).map(t => t.name).sort() }
}
const manifestPath = '.notion/published.json'
async function readOptional(path) {
  try { return await readFile(path) } catch (error) { if (error.code === 'ENOENT') return null; throw error }
}
function ownedPath(path) {
  return /^src\/content\/blog\/[a-z0-9]+(?:-[a-z0-9]+)*\.mdx$/.test(path) || /^public\/images\/notion\/[a-f0-9]{32}\/[a-f0-9]{64}\.(png|jpg|gif|webp|avif)$/.test(path)
}

// Build a complete plan before touching disk. Any API/conversion/collision error aborts it.
export async function synchronize({ root, api, pageId, imageDownloader = downloadImage, validate = async () => {} , dryRun = false }) {
  const oldBytes = await readOptional(join(root, manifestPath))
  const old = oldBytes ? JSON.parse(oldBytes.toString()) : { version: 1, articles: {}, files: {} }
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
  const next = { version: 1, sourceId, articles: {}, files: {} }, files = new Map(), slugs = new Set()
  for (const page of pages.sort((a, b) => id(a.id).localeCompare(id(b.id)))) {
    if (page.in_trash || page.archived || (page.properties?.Status?.status?.name ?? page.properties?.Status?.select?.name) !== 'Published') continue
    const pageKey = id(page.id)
    if (next.articles[pageKey]) throw new Error('Duplicate Notion page in query')
    const blocks = await readBlocks(api, pageKey)
    const metadata = metadataFor(page, old.articles[pageKey], blocks)
    if (slugs.has(metadata.slug)) throw new Error('Duplicate published slug; assign distinct Slug values')
    slugs.add(metadata.slug)
    const content = await convertBlocks(blocks, async block => {
      const image = block.image
      if (!['external', 'file'].includes(image.type)) throw new Error('Unsupported image type')
      const url = safeUrl(image[image.type].url, true)
      if (image.type === 'external' && !notionImageHost(new URL(url).hostname)) return url
      const { bytes, extension } = await imageDownloader(url)
      const path = `public/images/notion/${pageKey}/${hash(bytes)}.${extension}`
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
    next.articles[pageKey] = { slug: metadata.slug, date: metadata.date }
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
    for (const [path, bytes] of writes) { await mkdir(dirname(join(root, path)), { recursive: true }); await writeFile(join(root, path), bytes) }
    for (const path of deletes) { try { await unlink(join(root, path)) } catch (error) { if (error.code !== 'ENOENT') throw error } }
  }
  return { changed: Boolean(writes.length || deletes.length), articles: Object.keys(next.articles).length, writes: writes.length, deletes: deletes.length }
}
