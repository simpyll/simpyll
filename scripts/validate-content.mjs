import { readFileSync } from 'node:fs'
const policyRoutes = JSON.parse(readFileSync(new URL('../src/content/policies.json', import.meta.url), 'utf8')).map(({ slug }) => `/${slug}`)
import { readdir, readFile, lstat, realpath } from 'node:fs/promises'
import { resolve, join, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { compile } from '@mdx-js/mdx'

// Read only literal data from the MDX parser's ESTree; never evaluate article code.
export function literal(node) {
  if (node?.type === 'Literal') return node.value
  if (node?.type === 'ArrayExpression') return node.elements.map(literal)
  if (node?.type === 'ObjectExpression') {
    const result = Object.create(null)
    for (const property of node.properties) {
      if (property.type !== 'Property' || property.computed || property.method || property.kind !== 'init') throw new Error('Use literal metadata properties, without spreads or getters')
      const key = property.key.name ?? property.key.value
      if (Object.hasOwn(result, key)) throw new Error(`Duplicate metadata property "${key}"`)
      result[key] = literal(property.value)
    }
    return result
  }
  throw new Error('Use literal metadata values (strings, arrays, and objects), not executable expressions')
}

function unsafeCharacters(value, rejectSpaces = false) {
  return [...value].some(character => character === '\\' || character.charCodeAt(0) <= (rejectSpaces ? 32 : 31) || character.charCodeAt(0) === 127)
}

function walk(node, visit) {
  visit(node)
  for (const child of node.children ?? []) walk(child, visit)
}

async function localFile(root, pathname) {
  const base = resolve(root, 'public')
  const file = resolve(base, '.' + pathname)
  if (!file.startsWith(base + sep)) return false
  try {
    const actual = await realpath(file)
    return actual.startsWith(await realpath(base) + sep) && (await lstat(actual)).isFile()
  } catch { return false }
}

export async function validateContent({ root = process.cwd() } = {}) {
  const errors = [], warnings = [], articles = [], slugs = new Map()
  const directory = join(root, 'src/content/blog')
  const config = await readFile(join(root, 'src/config/site.ts'), 'utf8')
  const origin = new URL(config.match(/url:\s*['"](https?:\/\/[^'"]+)['"]/)?.[1] ?? 'https://simpyll.com').origin
  async function scan(dir, prefix = '') {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const name = prefix + entry.name
      if (entry.isDirectory()) { await scan(join(dir, entry.name), name + '/'); continue }
      if (!/\.mdx$/i.test(name)) continue
      const file = `src/content/blog/${name}`
      if (entry.isSymbolicLink()) { errors.push(`${file}: Article must be a regular file, not a symbolic link`); continue }
      const slug = entry.name.replace(/\.mdx$/i, '')
      const key = slug.toLowerCase().normalize('NFC')
      if (slugs.has(key)) errors.push(`${file}: Duplicate slug "${key}" also used by ${slugs.get(key)}`)
      else slugs.set(key, file)
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\.mdx$/.test(name) || slug.length > 100) errors.push(`${file}: Invalid filename; use a flat, lowercase hyphenated slug (1–100 characters) with .mdx extension`)
      articles.push({ file, slug, source: await readFile(join(dir, entry.name), 'utf8') })
    }
  }
  await scan(directory)
  let redirects = {}
  try { redirects = JSON.parse(await readFile(join(root, 'src/generated/redirects.json'), 'utf8')) } catch (error) { if (error.code !== 'ENOENT') throw error }
  const routes = new Set([...policyRoutes, '/', '/blog', '/about', '/explore', ...articles.map(article => `/blog/${article.slug}`)])
  for (const article of articles) {
    const report = (message, node, target = errors) => {
      const position = node?.position?.start
      target.push(`${article.file}${position ? `:${position.line}:${position.column}` : ''}: ${message}`)
    }
    let tree
    try {
      await compile({ value: article.source, path: article.file }, { remarkPlugins: [() => node => { tree = node }] })
    } catch (error) { report(`MDX compilation failed: ${error.message}`); continue }
    let metadata
    try {
      for (const node of tree.children.filter(node => node.type === 'mdxjsEsm')) {
        for (const statement of node.data.estree.body) {
          if (statement.type !== 'ExportNamedDeclaration') continue
          for (const declaration of statement.declaration?.declarations ?? []) {
            if (declaration.id.name === 'metadata') metadata = literal(declaration.init)
          }
        }
      }
      if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) throw new Error('Missing metadata object: export const metadata = { ... }')
      for (const field of ['title', 'description', 'date', 'category', 'author']) {
        if (typeof metadata[field] !== 'string' || !metadata[field].trim()) report(`metadata.${field} must be a non-empty string`)
      }
      if (typeof metadata.date === 'string' && (!/^\d{4}-\d{2}-\d{2}$/.test(metadata.date) || !Number.isFinite(Date.parse(metadata.date)) || new Date(metadata.date).toISOString().slice(0, 10) !== metadata.date)) report('metadata.date must be a real calendar date in YYYY-MM-DD format')
      if (!Array.isArray(metadata.tags) || metadata.tags.some(tag => typeof tag !== 'string' || !tag.trim())) report('metadata.tags must be an array of non-empty strings (an empty array is allowed)')
      if (metadata.status !== undefined && metadata.status !== 'published' || metadata.draft === true || metadata.published === false) report('Private manual MDX must be moved outside src/content/blog; this directory is public-only')
      if (metadata.slug !== undefined && metadata.slug !== article.slug) report(`metadata.slug must match filename slug "${article.slug}"`)
    } catch (error) { report(error.message) }

    const references = [], definitions = new Map()
    walk(tree, node => { if (node.type === 'definition') definitions.set(node.identifier, node.url) })
    walk(tree, node => {
      if (['link', 'image'].includes(node.type)) references.push({ value: node.url, image: node.type === 'image', node })
      if (['linkReference', 'imageReference'].includes(node.type)) references.push({ value: definitions.get(node.identifier), image: node.type === 'imageReference', node })
      if (['mdxJsxFlowElement', 'mdxJsxTextElement'].includes(node.type)) {
        for (const attribute of node.attributes) {
          if (!['href', 'src', 'to', 'poster'].includes(attribute.name)) continue
          let value = attribute.value
          if (value?.type === 'mdxJsxAttributeValueExpression') {
            try { value = literal(value.data.estree.body[0]?.expression) } catch {
              report(`Cannot statically check dynamic ${attribute.name}; verify its destination manually`, node, warnings)
              continue
            }
          }
          references.push({ value, image: ['src', 'poster'].includes(attribute.name), node })
        }
      }
    })
    for (const { value, image, node } of references) {
      if (typeof value !== 'string' || !value.trim()) { report('Link/image destination must be a non-empty string', node); continue }
      try {
        if (unsafeCharacters(value, true)) throw new Error('Unsafe or malformed URL (whitespace, control character, or backslash)')
        const url = new URL(value, `${origin}/blog/${article.slug}/`)
        if (!['https:', 'http:', 'mailto:', 'tel:'].includes(url.protocol)) throw new Error(`Unsafe URL protocol "${url.protocol}"`)
        // Remote URLs are never fetched: availability is not a publishing requirement.
        if (url.origin !== origin) continue
        const rawPath = value.split(/[?#]/)[0].replace(/^https?:\/\/[^/]+/i, '')
        let decoded = decodeURIComponent(rawPath)
        if (/%[0-9a-f]{2}/i.test(decoded)) throw new Error('Unsafe multiply encoded path')
        if (unsafeCharacters(decoded) || /%2f|%5c/i.test(rawPath)) throw new Error('Unsafe encoded path separator or control character')
        // Normal relative navigation is valid; reject attempts to escape the URL root.
        const parts = decoded.startsWith('/') || /^https?:/i.test(value) ? [] : ['blog', article.slug]
        for (const part of decoded.split('/')) {
          if (part === '..') { if (!parts.length) throw new Error('Unsafe path traversal above site root'); parts.pop() }
          else if (part && part !== '.') parts.push(part)
        }
        decoded = decodeURIComponent(url.pathname)
        const route = decoded.replace(/\/$/, '') || '/'
        const alias = route.match(/^\/blog\/([^/]+)$/)?.[1]
        if (!image && Object.hasOwn(redirects, alias)) throw new Error(`Stale internal link; use /blog/${redirects[alias]} instead of ${route}`)
        if (!image && routes.has(route)) continue
        if (!await localFile(root, decoded)) throw new Error(`${image ? 'Missing local image/asset' : 'Broken internal link'} "${value}"; expected ${image ? 'a file under public/' : 'an existing site route or file under public/'}`)
      } catch (error) { report(`${error.message} (destination: ${JSON.stringify(value)})`, node) }
    }
  }
  return { errors, warnings, count: articles.length }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = await validateContent()
    for (const warning of result.warnings) console.warn(`WARNING ${warning}`)
    for (const error of result.errors) console.error(`ERROR ${error}`)
    console.log(`Validated ${result.count} MDX articles: ${result.errors.length} error(s), ${result.warnings.length} warning(s).`)
    if (result.errors.length) process.exitCode = 1
  } catch (error) { console.error(`Content validation failed: ${error.message}`); process.exitCode = 1 }
}
