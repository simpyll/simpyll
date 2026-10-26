import { manifest, claims } from './manifest.mjs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile, lstat, readdir, mkdir, writeFile, unlink, realpath } from 'node:fs/promises'
import { join, dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { readMetadata, resolveRegistry, manualHistory } from '../redirects.mjs'

const manifestPath = '.notion/published.json'
const digest = bytes => createHash('sha256').update(bytes).digest('hex')
const articlePath = a => `src/content/blog/${a.slug}.mdx`
function git(root, args) {
  return execFileSync('git', args, { cwd: root, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] })
}
function revision(root, ref) {
  if (typeof ref !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._/~^:-]{0,199}$/.test(ref) || ref.includes(':')) throw new Error('Invalid Git revision')
  try { return git(root, ['rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`]).toString().trim() }
  catch { throw new Error('Unavailable Git revision; fetch the requested history first') }
}
async function safe(root, path, directory = false) {
  // Every component is checked, including the destination leaf. Never follow links.
  let current = root
  for (const part of path.split('/')) {
    current = join(current, part)
    try {
      const stat = await lstat(current)
      if (stat.isSymbolicLink() || (!stat.isDirectory() && current !== join(root, path)) || (!(directory ? stat.isDirectory() : stat.isFile()) && current === join(root, path))) throw new Error(`Unsafe filesystem entry: ${path}`)
    } catch (e) { if (e.code !== 'ENOENT') throw e }
  }
}
async function optional(root, path) {
  await safe(root, path)
  try { return await readFile(join(root, path)) } catch (e) { if (e.code === 'ENOENT') return null; throw e }
}
async function snapshot(root, sha) {
  const read = p => {
    const entry = git(root, ['ls-tree', sha, '--', p]).toString()
    if (!entry.startsWith('100644 blob ') && !entry.startsWith('100755 blob ')) throw new Error(`Missing historical file or unsafe symbolic link: ${p}`)
    return git(root, ['show', `${sha}:${p}`])
  }
  const bytes = read(manifestPath), m = manifest(bytes), files = new Map()
  if (!Object.values(m.articles).some(a => a.status === 'published')) throw new Error('Empty recovery snapshot: no published articles')
  for (const [p, hash] of Object.entries(m.files)) {
    const content = read(p)
    if (digest(content) !== hash) throw new Error(`Historical file hash mismatch: ${p}`)
    files.set(p, content)
  }
  await validateFiles(m, files)
  return { m, files }
}
async function validateFiles(m, files) {
  for (const [id, a] of Object.entries(m.articles).filter(([, a]) => a.status === 'published')) {
    const bytes = files.get(articlePath(a))
    if (!bytes) throw new Error('Missing published article')
    // Parsing/compiling to an AST never evaluates historical JavaScript or MDX.
    const metadata = await readMetadata(bytes.toString())
    if (metadata.articleId !== `notion:${id}` || metadata.slug !== a.slug || metadata.date !== a.date) throw new Error('Article metadata disagrees with immutable identity/slug/date')
    if (metadata.draft === true || metadata.published === false || metadata.test === true || metadata.status !== undefined && (typeof metadata.status !== 'string' || metadata.status.toLowerCase() !== 'published')) throw new Error('Published article has nonpublic metadata')
    const refs = bytes.toString().match(/(?<![a-zA-Z0-9:/])\/images\/[^\s"'<>\\})]+/g) ?? []
    for (const ref of refs) if (!m.files[`public${ref}`] || !files.has(`public${ref}`)) throw new Error(`Missing image reference: ${ref}`)
    for (const asset of Object.values(a.assets ?? {})) if (!files.has(asset.path)) throw new Error('Missing historical asset')
  }
}

/** Plan fully before writes. Apply never pushes, deploys, or executes content. */
export async function recover({ root = process.cwd(), ref, articles = [], all = false, apply = false, ownershipRef } = {}) {
  root = await realpath(root)
  if (all === Boolean(articles.length)) throw new Error('Choose --all or one or more --article IDs')
  const sha = revision(root, ref), historical = await snapshot(root, sha)
  const currentBytes = await optional(root, manifestPath)
  let current
  try { current = manifest(currentBytes ?? '') }
  catch {
    if (!all) throw new Error('Corrupted/missing current manifest: use --all with a reviewed ownership revision')
    // Committed ownership is the fallback for local manifest corruption. An older
    // reviewed ownership revision is explicit when HEAD itself is corrupt.
    const ownerSha = revision(root, ownershipRef ?? 'HEAD')
    try { current = manifest(git(root, ['show', `${ownerSha}:${manifestPath}`])) }
    catch { throw new Error('Cannot establish current ownership; provide --ownership-revision with a known-good manifest') }
  }
  if (current.sourceId !== historical.m.sourceId) throw new Error('Notion source identity conflict')
  const ids = all ? Object.keys(historical.m.articles) : [...new Set(articles)]
  for (const id of ids) if (!historical.m.articles[id] || historical.m.articles[id].status !== 'published' && !all) throw new Error('Unknown/unpublished historical article ID')
  const selected = new Set(ids)
  const next = structuredClone(all ? historical.m : current)
  const files = new Map(), deletes = new Set()
  if (all) for (const [p, bytes] of historical.files) files.set(p, bytes)
  else {
    for (const id of ids) {
      const a = historical.m.articles[id]
      next.articles[id] = structuredClone(a)
      for (const [p, bytes] of historical.files) if (p === articlePath(a) || p.startsWith(`public/images/notion/${id}/`)) {
        files.set(p, bytes); next.files[p] = historical.m.files[p]
      }
    }
  }
  for (const [id, a] of Object.entries(current.articles)) {
    const p = articlePath(a)
    if (a.status === 'published' && (all || selected.has(id)) && !files.has(p)) { deletes.add(p); delete next.files[p] }
  }
  // Retain compatibility image URLs even when recovering an older full snapshot.
  for (const [p, hash] of Object.entries(current.files)) if (p.startsWith('public/images/notion/') && !files.has(p)) {
    const bytes = await optional(root, p)
    if (!bytes || digest(bytes) !== hash) throw new Error(`Current compatibility image missing/corrupt; select a revision containing it: ${p}`)
    next.files[p] = hash
    files.set(p, bytes)
  }
  // Existing paths require current ownership AND a matching immutable identity.
  for (const p of new Set([...files.keys(), ...deletes])) {
    const bytes = await optional(root, p)
    if (!bytes) continue
    if (!(p in current.files)) throw new Error(`Manual/unowned content conflict: ${p}`)
    if (p.endsWith('.mdx')) {
      let metadata
      try { metadata = await readMetadata(bytes.toString()) } catch { throw new Error(`Cannot prove article ownership: ${p}`) }
      const owner = Object.entries(current.articles).find(([, a]) => a.status === 'published' && articlePath(a) === p)?.[0]
      if (!owner || metadata.articleId !== `notion:${owner}`) throw new Error(`Manual article identity conflict: ${p}`)
    }
  }
  // Validate the resulting state, including untouched articles and manual routes.
  const resulting = new Map(files)
  for (const [p, hash] of Object.entries(next.files)) {
    const bytes = resulting.get(p) ?? await optional(root, p)
    if (!bytes || digest(bytes) !== hash) throw new Error(`Resulting snapshot missing/corrupt file: ${p}`)
    resulting.set(p, bytes)
  }
  await validateFiles(next, resulting)
  const registry = claims(next), history = await manualHistory(root)
  await safe(root, 'src/content/blog', true)
  for (const name of await readdir(join(root, 'src/content/blog'))) {
    if (!name.endsWith('.mdx')) continue
    const p = `src/content/blog/${name}`
    if (current.files[p] || next.files[p] || deletes.has(p)) continue
    const metadata = await readMetadata((await optional(root, p)).toString())
    registry.push({ id: metadata.articleId ?? `manual:${name.slice(0, -4)}`, slug: name.slice(0, -4), status: metadata.status ?? 'published', aliases: [...new Set([...(history.get(metadata.articleId) ?? [])].filter(s => s !== name.slice(0, -4)).concat(metadata.redirectFrom ?? []))] })
  }
  resolveRegistry(registry)
  files.set(manifestPath, Buffer.from(JSON.stringify(next, null, 2) + '\n'))
  const writes = [], backups = new Map()
  for (const [p, bytes] of files) {
    const before = await optional(root, p)
    if (!before?.equals(bytes)) { writes.push(p); backups.set(p, before) }
  }
  for (const p of [...deletes]) {
    const before = await optional(root, p)
    if (!before) deletes.delete(p)
    else backups.set(p, before)
  }
  const changedPaths = new Set([...writes, ...deletes])
  // Include staged, unstaged and untracked destinations. Never discard local work.
  const localChanges = new Set([
    ...git(root, ['diff', '--name-only', '-z', 'HEAD', '--']).toString().split('\0'),
    ...(changedPaths.size ? git(root, ['ls-files', '--others', '-z', '--', ...changedPaths]).toString().split('\0') : []),
  ].filter(Boolean))
  const conflicts = [...changedPaths].filter(p => localChanges.has(p)).sort()
  const articleChanges = [...new Set([...Object.keys(current.articles), ...Object.keys(next.articles)])].sort()
    .filter(id => JSON.stringify(current.articles[id]) !== JSON.stringify(next.articles[id]))
    .map(id => ({ id, before: current.articles[id] ?? null, after: next.articles[id] ?? null }))
  const untouched = git(root, ['ls-files', '-z']).toString().split('\0').filter(p => p && !changedPaths.has(p)).sort()
  if (apply && conflicts.length) throw new Error(`Uncommitted recovery conflicts: ${conflicts.join(', ')}. Preserve local work in a separate commit or use a clean checkout; rerun dry-run before apply.`)
  if (apply) {
    try {
      for (const p of writes) { await safe(root, p); await mkdir(dirname(join(root, p)), { recursive: true }); await writeFile(join(root, p), files.get(p)) }
      for (const p of deletes) { await safe(root, p); await unlink(join(root, p)) }
    } catch (error) {
      for (const [p, bytes] of backups) {
        if (bytes) await writeFile(join(root, p), bytes)
        else await unlink(join(root, p)).catch(e => { if (e.code !== 'ENOENT') throw e })
      }
      throw error
    }
  }
  return { revision: sha, mode: apply ? 'apply' : 'dry-run', articles: ids, recoverableFiles: [...files.keys()], writes, deletes: [...deletes], untouched, conflicts, articleChanges, manifestChanged: writes.includes(manifestPath), missingAssets: [], validationFailures: [], note: 'Review changes, validate content/build, and open a PR. No push or deployment performed.' }
}

export function parseArgs(args) {
  const options = { articles: [] }
  for (let i = 0; i < args.length; i++) {
    const flag = args[i]
    if (flag === '--all') options.all = true
    else if (flag === '--apply') options.apply = true
    else if (['--revision', '--article', '--ownership-revision', '--root'].includes(flag)) {
      const value = args[++i]
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`)
      if (flag === '--article') options.articles.push(value)
      else options[({ '--revision': 'ref', '--ownership-revision': 'ownershipRef', '--root': 'root' })[flag]] = value
    } else throw new Error(`Unknown option: ${flag}`)
  }
  return options
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try { console.log(JSON.stringify(await recover(parseArgs(process.argv.slice(2))), null, 2)) }
  catch (e) { console.error(`Recovery refused: ${e.message}`); process.exitCode = 1 }
}
