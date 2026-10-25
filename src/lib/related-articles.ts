import { taxonomyId } from './discovery.ts'
import type { NavigableArticle } from './article-adjacency.ts'

const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0

/** Input is the canonical published identity registry, never alias routes or raw MDX globs. */
type RelatedArticle = Omit<NavigableArticle, 'metadata'> & { metadata: Omit<NavigableArticle['metadata'], 'category'> & { category?: string; redirectFrom?: string[] } }

export function createRelatedArticles<T extends RelatedArticle>(articles: readonly T[]) {
  const aliases = new Set(articles.flatMap(article => article.metadata.redirectFrom ?? []).map(slug => slug.replace(/^\/blog\//, '').replace(/\/$/, '')))
  const eligible = articles.filter(({ slug, metadata: m }) =>
    typeof m.articleId === 'string' && /^[a-zA-Z0-9:-]{1,100}$/.test(m.articleId) &&
    !aliases.has(slug) &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) &&
    (m.status === undefined || m.status === 'published') && !m.draft && m.published !== false && !m.test &&
    /^\d{4}-\d{2}-\d{2}$/.test(m.date) && Number.isFinite(Date.parse(m.date)) &&
    new Date(m.date).toISOString().slice(0, 10) === m.date &&
    [m.title, m.description, m.author].every(value => typeof value === 'string' && value.trim()) &&
    (m.category === undefined || typeof m.category === 'string') &&
    Array.isArray(m.tags) && m.tags.every(tag => typeof tag === 'string' && tag.trim())
  ).sort((a, b) => compare(a.metadata.articleId!, b.metadata.articleId!) || compare(a.slug, b.slug))
  const ids = new Set<string>(), slugs = new Set<string>()
  const unique = eligible.filter(article => {
    if (ids.has(article.metadata.articleId!) || slugs.has(article.slug)) return false
    ids.add(article.metadata.articleId!)
    slugs.add(article.slug)
    return true
  })
  const prepared = unique.map(article => ({ article,
    tags: new Set(article.metadata.tags.map(taxonomyId).filter(Boolean)),
    category: taxonomyId(article.metadata.category ?? ''),
  }))
  const results = new Map<string, T[]>()
  for (const current of prepared) {
    const ranked = prepared.filter(candidate => candidate !== current).map(candidate => ({
      article: candidate.article,
      score: [...candidate.tags].filter(tag => current.tags.has(tag)).length * 3 +
        (current.category !== '' && current.category === candidate.category ? 1 : 0),
    })).sort((a, b) => b.score - a.score || compare(b.article.metadata.date, a.article.metadata.date) ||
      compare(a.article.metadata.articleId!, b.article.metadata.articleId!))
    // Zero-score candidates naturally fill remaining slots in publication order.
    results.set(current.article.metadata.articleId!, ranked.slice(0, 3).map(item => item.article))
  }
  return (id: string): readonly T[] => results.get(id) ?? []
}
