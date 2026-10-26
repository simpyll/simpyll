import { ownedPath as owned } from './ownership.mjs'
import { normalizeSlug, resolveRegistry } from '../redirects.mjs'

const articlePath = a => `src/content/blog/${a.slug}.mdx`
const object = v => v && typeof v === 'object' && !Array.isArray(v)

export function manifest(bytes) {
  let m
  try { m = JSON.parse(bytes) } catch { throw new Error('Invalid publisher manifest JSON') }
  if (!object(m) || m.version !== 1 || !/^[a-f0-9]{32}$/.test(m.sourceId) || !object(m.articles) || !object(m.files)) throw new Error('Invalid publisher manifest structure')
  for (const [p, hash] of Object.entries(m.files)) if (!owned(p) || !/^[a-f0-9]{64}$/.test(hash)) throw new Error('Unsafe manifest path or digest')
  for (const [id, a] of Object.entries(m.articles)) {
    if (!/^[a-f0-9]{32}$/.test(id) || !object(a) || !['published', 'unpublished'].includes(a.status)) throw new Error('Invalid immutable identity/status')
    if (normalizeSlug(a.slug) !== a.slug || !/^\d{4}-\d{2}-\d{2}$/.test(a.date)) throw new Error('Invalid article slug/date')
    for (const field of ['history', 'redirectFrom']) {
      if (a[field] !== undefined && !Array.isArray(a[field])) throw new Error('Invalid alias history')
      for (const s of a[field] ?? []) if (normalizeSlug(s) !== s) throw new Error('Invalid alias')
    }
    if (a.assets !== undefined && !object(a.assets)) throw new Error('Invalid image mapping')
    for (const asset of Object.values(a.assets ?? {})) if (!object(asset) || !asset.path?.startsWith(`public/images/notion/${id}/`) || !m.files[asset.path]) throw new Error('Missing historical asset mapping')
    if (a.status === 'published' && !m.files[articlePath(a)]) throw new Error('Missing published article mapping')
  }
  for (const p of Object.keys(m.files).filter(p => p.endsWith('.mdx'))) if (!Object.values(m.articles).some(a => a.status === 'published' && articlePath(a) === p)) throw new Error('Orphan article mapping')
  resolveRegistry(claims(m))
  return m
}
export const claims = m => Object.entries(m.articles).map(([id, a]) => ({ id: `notion:${id}`, slug: a.slug, status: a.status, aliases: [...(a.history ?? []), ...(a.redirectFrom ?? [])] }))
