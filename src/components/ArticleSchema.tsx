
import { Helmet } from 'react-helmet-async'
import { getSiteUrl, siteConfig } from '../config/site'
import type { BlogPost } from '../lib/blog'

type ArticleSchemaProps = {
  post: BlogPost
}

export function ArticleSchema({ post }: ArticleSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.metadata.title,
    description: post.metadata.description,
    datePublished: post.metadata.date,
    author: {
      '@type': 'Person',
      name: post.metadata.author,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': getSiteUrl(`/blog/${post.slug}`),
    },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteConfig.url,
    },
    keywords: post.metadata.tags.join(', '),
  }

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema).replace(/</g, '\\u003c')}
      </script>
    </Helmet>
  )
}
