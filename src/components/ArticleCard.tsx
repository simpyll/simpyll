import { Link } from 'react-router-dom'
import { TaxonomyLink } from './TaxonomyLink'
import type { DiscoveryRecord } from '../lib/discovery'
export function ArticleCard({ article, headingLevel = 2 }: { article: DiscoveryRecord; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 3 ? 'h3' : 'h2'
  return <article className="discovery-card">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <TaxonomyLink kind="category" label={article.category} />
      <div className="flex flex-wrap items-center gap-3">
        {article.date && <time className="text-xs text-subtle" dateTime={article.date}>{new Date(`${article.date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}</time>}
        {article.readingTimeMinutes !== undefined && <span className="text-xs text-subtle">{article.readingTimeMinutes} min read</span>}
      </div>
    </div>
    <Heading className="mt-4 text-2xl font-semibold tracking-tight"><Link className="hover:text-accent" to={article.url}>{article.title}</Link></Heading>
    <p className="mt-3 text-sm leading-relaxed text-muted">{article.description}</p>
    <div className="mt-5 flex flex-wrap gap-2">{[...new Set(article.tags)].map(tag => <TaxonomyLink key={tag} kind="tag" label={tag} />)}</div>
  </article>
}
