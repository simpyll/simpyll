import { Link } from 'react-router-dom'
import { discoveryUrl } from '../lib/discovery'
export function TaxonomyLink({ label, kind }: { label: string; kind: 'category' | 'tag' }) {
  return <Link className={kind === 'tag' ? 'ui-badge taxonomy-link' : 'text-xs font-medium uppercase tracking-widest text-accent taxonomy-link'}
    to={discoveryUrl(kind === 'tag' ? { tags: [label] } : { categories: [label] })}>{label}</Link>
}
