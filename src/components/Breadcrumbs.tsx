import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { getSiteUrl } from '../config/site'
import { breadcrumbSchema, type BreadcrumbItem } from '../lib/breadcrumbs'
import './breadcrumbs.css'

export function Breadcrumbs({ items }: { items: readonly BreadcrumbItem[] }) {
  const schema = breadcrumbSchema(items, getSiteUrl)
  if (!schema) return null
  return <>
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema).replace(/</g, '\\u003c')}</script>
    </Helmet>
    <nav aria-label="Breadcrumb" className="breadcrumbs">
      <ol>
        {items.map((item, index) => <li key={item.path}>
          {index > 0 && <span className="breadcrumb-separator" aria-hidden="true">›</span>}
          {index === items.length - 1
            ? <span className="breadcrumb-current" aria-current="page">{item.label}</span>
            : <Link to={item.path}>{item.label}</Link>}
        </li>)}
      </ol>
    </nav>
  </>
}
