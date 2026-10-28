import { Link } from 'react-router-dom'
import { getSeries, type BlogPost } from '../lib/blog'

export function SeriesNavigation({ post }: { post: BlogPost }) {
  const group = post.metadata.series && getSeries(post.metadata.series.id)
  if (!group) return null
  const position = group.installments.findIndex(item => item.post.metadata.articleId === post.metadata.articleId)
  const previous = group.installments[position - 1], next = group.installments[position + 1]
  return <nav aria-label="Series navigation" className="mt-12 border-t border-outline pt-8">
    <h2 className="text-xl font-semibold"><Link className="text-accent underline" to={`/series/${group.id}`}>{group.title}</Link></h2>
    <p className="mt-2 text-muted">Installment {post.metadata.series!.order} · {position + 1} of {group.installments.length} published</p>
    <div className="mt-4 flex flex-wrap gap-6">
      {previous && <Link className="text-accent underline" to={`/blog/${previous.post.slug}`}>Previous in series: {previous.post.metadata.title}</Link>}
      {next && <Link className="text-accent underline" to={`/blog/${next.post.slug}`}>Next in series: {next.post.metadata.title}</Link>}
    </div>
    <details className="mt-4"><summary className="cursor-pointer">Published installments</summary><ol className="mt-3 list-decimal space-y-2 pl-6">
      {group.installments.map(item => <li key={item.articleId}><Link className="text-accent underline" aria-current={item.post.slug === post.slug ? 'page' : undefined} to={`/blog/${item.post.slug}`}>{item.post.metadata.title}</Link> <span className="text-muted">(installment {item.order})</span></li>)}
    </ol></details>
  </nav>
}
