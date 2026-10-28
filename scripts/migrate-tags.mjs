import { compile } from '@mdx-js/mdx'
import { readFile, writeFile, readdir, lstat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
import { readMetadata } from './redirects.mjs'
import { literal } from './validate-content.mjs'
import { manifest } from './notion/manifest.mjs'
import { normalizeTags } from '../src/lib/tags.mjs'
const digest = bytes => createHash('sha256').update(bytes).digest('hex')

// Replace only the literal tags value; preserve every other source byte.
export async function normalizeTagSource(source) {
  let tree
  await compile(source, { remarkPlugins: [() => node => { tree = node }] })
  const declarations = tree.children.filter(n => n.type === 'mdxjsEsm').flatMap(n => n.data.estree.body.flatMap(s => s.declaration?.declarations ?? []))
  const metadata = declarations.find(d => d.id.name === 'metadata')?.init
  if (!metadata) throw new Error('Missing literal metadata')
  literal(metadata) // Reject executable/ambiguous metadata without evaluating it.
  const property = metadata.properties.find(p => (p.key.name ?? p.key.value) === 'tags')
  if (!property) return { source, before: [], after: [] }
  const before = literal(property.value)
  if (!Array.isArray(before) || before.some(v => typeof v !== 'string')) throw new Error('Invalid tags')
  const after = normalizeTags(before)
  if (JSON.stringify(before) === JSON.stringify(after)) return { source, before, after }
  const { start, end } = property.value
  if (!Number.isInteger(start) || !Number.isInteger(end)) throw new Error('Missing tag source offsets')
  return { source: source.slice(0, start) + JSON.stringify(after) + source.slice(end), before, after }
}

export async function migrateTags({ root = process.cwd(), apply = false } = {}) {
  const manifestPath = '.notion/published.json'
  let oldBytes
  try { oldBytes = await readFile(join(root, manifestPath), 'utf8') } catch (e) { if (e.code !== 'ENOENT') throw e }
  const registry = oldBytes ? manifest(oldBytes) : null
  const originals = new Map()
  for (const [path, hash] of Object.entries(registry?.files ?? {})) {
    if (!(await lstat(join(root, path))).isFile()) throw new Error(`Non-regular owned file: ${path}`)
    const bytes = await readFile(join(root, path))
    if (digest(bytes) !== hash) throw new Error(`Ownership mismatch: ${path}`)
    originals.set(path, bytes)
  }
  const changes = [], writes = new Map()
  const directory = 'src/content/blog'
  for (const entry of await readdir(join(root, directory), { withFileTypes: true })) {
    if (!entry.name.endsWith('.mdx')) continue
    if (!entry.isFile()) throw new Error('Articles must be regular files')
    const path = `${directory}/${entry.name}`
    const bytes = await readFile(join(root, path))
    const source = bytes.toString('utf8')
    const next = await normalizeTagSource(source)
    // A Notion identity without manifest ownership must never be adopted.
    if (String((await readMetadata(source)).articleId ?? '').startsWith('notion:') && !registry?.files[path]) throw new Error(`Unowned Notion article: ${path}`)
    if (source === next.source) continue
    changes.push({ path, before: next.before, after: next.after, owned: !!registry?.files[path] })
    originals.set(path, bytes)
    writes.set(path, Buffer.from(next.source))
    if (registry?.files[path]) registry.files[path] = digest(next.source)
  }
  if (registry && changes.some(c => c.owned)) {
    originals.set(manifestPath, Buffer.from(oldBytes))
    writes.set(manifestPath, Buffer.from(JSON.stringify(registry, null, 2) + '\n'))
  }
  if (apply) {
    // Recheck all ownership and planned writes before the first mutation.
    for (const [path, bytes] of originals) if (!(await readFile(join(root, path))).equals(bytes)) throw new Error(`File changed during planning: ${path}`)
    try {
      for (const [path, bytes] of writes) await writeFile(join(root, path), bytes)
    } catch (error) {
      for (const path of writes.keys()) await writeFile(join(root, path), originals.get(path))
      throw error
    }
  }
  return { apply, changes, manifestUpdated: writes.has(manifestPath) }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2)
  if (args.some(arg => arg !== '--apply')) throw new Error('Usage: npm run migrate:tags -- [--apply]')
  console.log(JSON.stringify(await migrateTags({ apply: args.includes('--apply') }), null, 2))
}
