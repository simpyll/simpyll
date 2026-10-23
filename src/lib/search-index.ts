import type { DiscoveryRecord } from './discovery'

let cached: DiscoveryRecord[] | undefined
let pending: Promise<DiscoveryRecord[]> | undefined
export function loadIndex() {
  if (cached) return Promise.resolve(cached)
  return pending ??= fetch(`${import.meta.env.BASE_URL}search-index.json`, { cache: 'no-cache' }).then(async response => {
    if (!response.ok) throw new Error('Search unavailable')
    const data: unknown = await response.json()
    if (!Array.isArray(data) || !data.every(item => item && typeof item.slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug)
      && ['title', 'description', 'category', 'body'].every(key => typeof item[key] === 'string') && Array.isArray(item.tags) && item.tags.every((tag: unknown) => typeof tag === 'string'))) throw new Error('Invalid index')
    return cached = data.map(item => ({ ...item,
      id: typeof item.id === 'string' && item.id ? item.id : `blog:${item.slug}`,
      type: 'blog', url: `/blog/${item.slug}`,
      date: typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date) && Number.isFinite(Date.parse(item.date)) ? item.date : '',
    }))
  }).finally(() => { pending = undefined })
}

export function seedIndex(documents: DiscoveryRecord[]) { cached = documents }
export function hasIndex() { return !!cached }
