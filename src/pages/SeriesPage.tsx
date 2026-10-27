import { Link, useParams } from 'react-router-dom'
import { Container } from '../components/Container'
import { SEO } from '../components/SEO'
import { getSeries } from '../lib/blog'
import { NotFound } from './NotFound'

export function SeriesPage() {
  const { id } = useParams<{ id: string }>()
  const group = id && getSeries(id)
  if (!group) return <NotFound />
  return <><SEO title={group.title} description={`Published installments in ${group.title}.`} path={`/series/${group.id}`} />
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-canvas text-foreground"><Container><div className="max-w-3xl py-24 sm:py-32">
      <p className="mb-6 text-xs font-medium uppercase tracking-eyebrow text-accent">Article series</p>
      <h1 className="font-display text-4xl font-semibold tracking-heading sm:text-6xl">{group.title}</h1>
      <p className="mt-6 text-muted">{group.installments.length} published {group.installments.length === 1 ? 'installment' : 'installments'}</p>
      <ol className="mt-10 space-y-8">{group.installments.map(item => <li key={item.articleId} className="border-t border-outline pt-6">
        <p className="text-sm text-muted">Installment {item.order} · {item.post.readingTimeMinutes} min read</p>
        <h2 className="mt-2 text-xl font-semibold"><Link className="text-accent underline" to={`/blog/${item.post.slug}`}>{item.post.metadata.title}</Link></h2>
        <p className="mt-2 text-muted">{item.post.metadata.description}</p>
      </li>)}</ol>
    </div></Container></main></>
}
