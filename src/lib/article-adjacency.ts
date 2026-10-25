/** Public content is validated by the build; defensive checks also support fixtures. */
export type NavigableArticle = {
  slug: string
  metadata: {
    articleId?: string
    title: string
    description: string
    date: string
    category: string
    author: string
    tags: string[]
    status?: string
    draft?: boolean
    published?: boolean
    test?: boolean
  }
}

const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0

export function createArticleAdjacency<T extends NavigableArticle>(articles: readonly T[]) {
  const seenIds = new Set<string>()
  const seenSlugs = new Set<string>()
  const ordered = articles.filter(({ slug, metadata: m }) =>
    typeof m.articleId === 'string' && /^[a-zA-Z0-9:-]{1,100}$/.test(m.articleId) &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) &&
    (m.status === undefined || m.status === 'published') && !m.draft && m.published !== false && !m.test &&
    /^\d{4}-\d{2}-\d{2}$/.test(m.date) && Number.isFinite(Date.parse(m.date)) &&
    new Date(m.date).toISOString().slice(0, 10) === m.date &&
    [m.title, m.description, m.category, m.author].every(value => typeof value === 'string' && value.trim()) &&
    Array.isArray(m.tags) && m.tags.every(tag => typeof tag === 'string' && tag.trim())
  ).sort((a, b) => compare(a.metadata.date, b.metadata.date) ||
    compare(a.metadata.articleId!, b.metadata.articleId!) || compare(a.slug, b.slug))
    .filter(article => {
      const id = article.metadata.articleId!
      if (seenIds.has(id) || seenSlugs.has(article.slug)) return false
      seenIds.add(id)
      seenSlugs.add(article.slug)
      return true
    })
  const neighbors = new Map<string, { previous?: T; next?: T }>()
  ordered.forEach((article, index) => neighbors.set(article.metadata.articleId!, {
    previous: ordered[index - 1], next: ordered[index + 1],
  }))
  return (currentArticleId: string) => neighbors.get(currentArticleId) ?? {}
}
