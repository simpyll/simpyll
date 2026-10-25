import { Link } from 'react-router-dom'
import type { BlogPost } from '../lib/blog'

export function ArticlePagination({ previous, next }: { previous?: BlogPost; next?: BlogPost }) {
  if (!previous && !next) return null
  return (
    <nav aria-label="Article navigation" className="mt-12 grid gap-6 border-t border-outline pt-8 sm:grid-cols-2">
      {previous && <Link to={`/blog/${previous.slug}`} rel="prev" className="min-w-0 rounded-sm py-3 hover:text-accent">
        <span className="block text-sm text-muted">Previous article</span>
        <span className="mt-2 block break-words font-medium">{previous.metadata.title}</span>
      </Link>}
      {next && <Link to={`/blog/${next.slug}`} rel="next" className="min-w-0 rounded-sm py-3 hover:text-accent sm:col-start-2 sm:text-right">
        <span className="block text-sm text-muted">Next article</span>
        <span className="mt-2 block break-words font-medium">{next.metadata.title}</span>
      </Link>}
    </nav>
  )
}
