// The public article registry is the only source of series membership.
export function validateSeries(value) {
  if (value === undefined) return
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('metadata.series must be an object with id, title and order')
  if (Object.keys(value).some(key => !['id', 'title', 'order'].includes(key))) throw new Error('metadata.series supports only id, title and order')
  if (typeof value.id !== 'string' || value.id.length > 100 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.id)) throw new Error('metadata.series.id must be a lowercase hyphenated identifier (1–100 characters)')
  if (typeof value.title !== 'string' || !value.title.trim() || value.title !== value.title.trim()) throw new Error('metadata.series.title must be a non-empty, trimmed title')
  if (!Number.isSafeInteger(value.order) || value.order < 1) throw new Error('metadata.series.order must be a positive integer')
}
export function buildSeries(articles) {
  const groups = new Map()
  for (const article of articles) {
    const m = article.metadata
    validateSeries(m.series)
    if (!m.series || (m.status && m.status !== 'published') || m.draft === true || m.published === false) continue
    const { id, title, order } = m.series
    const group = groups.get(id) ?? { id, title, installments: [] }
    if (group.title !== title) throw new Error(`Series ${id}: conflicting titles "${group.title}" and "${title}"`)
    if (group.installments.some(item => item.order === order)) throw new Error(`Series ${id}: duplicate installment order ${order} (${article.slug})`)
    if (typeof m.articleId !== 'string' || !m.articleId) throw new Error(`Series ${id}: ${article.slug} requires a stable articleId`)
    group.installments.push({ order, articleId: m.articleId })
    groups.set(id, group)
  }
  return [...groups.values()].sort((a, b) => a.id.localeCompare(b.id, 'en')).map(group => ({ ...group, installments: group.installments.sort((a, b) => a.order - b.order) }))
}
