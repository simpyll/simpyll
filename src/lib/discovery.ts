import { normalize, prepareSearch, type SearchDocument } from './search.ts'

export type DiscoveryState = { q: string; categories: string[]; tags: string[]; sort: 'newest' | 'oldest' | 'relevance' }
export type DiscoveryRecord = SearchDocument & { id: string; type: string; url: string; date: string }
export const defaultState: DiscoveryState = { q: '', categories: [], tags: [], sort: 'newest' }
// Keep punctuation meaningful: C++, C# and C must remain distinct taxonomy IDs.
export const taxonomyId = (value: string) => value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase()
const query = (value: string) => value.normalize('NFKC').trim().replace(/\s+/gu, ' ').slice(0, 160)
const filters = (values: string[]) => [...new Set(values.map(taxonomyId).filter(Boolean))].sort()
export function parseDiscovery(params: URLSearchParams): DiscoveryState {
  const q = query(params.get('q') ?? '')
  const sort = params.get('sort')
  return { q, categories: filters(params.getAll('category')), tags: filters(params.getAll('tag')),
    sort: sort === 'oldest' || sort === 'newest' || sort === 'relevance' && !!normalize(q) ? sort : normalize(q) ? 'relevance' : 'newest' }
}
export function serializeDiscovery(state: DiscoveryState) {
  const params = new URLSearchParams()
  const q = query(state.q)
  if (q) params.set('q', q)
  for (const category of filters(state.categories)) params.append('category', category)
  for (const tag of filters(state.tags)) params.append('tag', tag)
  if (state.sort !== (normalize(q) ? 'relevance' : 'newest') && !(state.sort === 'relevance' && !normalize(q))) params.set('sort', state.sort)
  return params.toString()
}
export function discoveryUrl(state: Partial<DiscoveryState> = {}) {
  const value = { ...defaultState, ...state }
  if (state.sort === undefined && normalize(value.q)) value.sort = 'relevance'
  const search = serializeDiscovery(value)
  return `/explore${search ? `?${search}` : ''}`
}
export function taxonomy(records: SearchDocument[], field: 'category' | 'tags') {
  const labels = new Map<string, string>()
  for (const record of records) for (const label of field === 'tags' ? record.tags : [record.category]) {
    const id = taxonomyId(label)
    if (id && !labels.has(id)) labels.set(id, label.trim())
  }
  return [...labels].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([id, label]) => ({ id, label }))
}
const dateValue = (date: string) => Number.isFinite(Date.parse(date)) ? Date.parse(date) : 0
export function prepareDiscovery(records: DiscoveryRecord[]) {
  const unique = [...new Map(records.map(record => [record.slug, record])).values()]
  const search = prepareSearch(unique, Infinity)
  return (state: DiscoveryState) => {
    const results = (normalize(state.q) ? search(state.q) : unique).filter(record =>
      (!state.categories.length || state.categories.includes(taxonomyId(record.category))) &&
      (!state.tags.length || record.tags.some(tag => state.tags.includes(taxonomyId(tag)))))
    if (state.sort === 'relevance' && normalize(state.q)) return results
    return results.sort((a, b) => (dateValue(a.date) - dateValue(b.date)) * (state.sort === 'oldest' ? 1 : -1) || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
  }
}
