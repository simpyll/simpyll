
import { Helmet } from 'react-helmet-async'
import { getSiteUrl, siteConfig } from '../config/site'

type SEOProps = {
  title: string
  description: string
  path?: string
  image?: string
  type?: 'website' | 'article'
  robots?: string
  noindex?: boolean
}

export function SEO({
  title,
  description,
  path = '/',
  image,
  type = 'website',
  noindex = false,
  robots,
}: SEOProps) {
  const pageTitle = `${title} | ${siteConfig.name}`
  const canonicalUrl = getSiteUrl(path)
  const imageUrl = image ? getSiteUrl(image) : undefined

  return (
    <Helmet>
      <html lang={siteConfig.language} />

      <title>{pageTitle}</title>

      <meta name="description" content={description} />

      {robots && <meta name="robots" content={robots} />}
      {noindex ? <meta name="robots" content="noindex" /> : <link rel="canonical" href={canonicalUrl} />}

      <meta property="og:type" content={type} />
      <meta
        property="og:site_name"
        content={siteConfig.name}
      />
      <meta property="og:title" content={pageTitle} />
      <meta
        property="og:description"
        content={description}
      />
      <meta property="og:url" content={canonicalUrl} />
      <meta
        property="og:locale"
        content={siteConfig.locale}
      />

      {imageUrl && (
        <meta property="og:image" content={imageUrl} />
      )}

      <meta
        name="twitter:card"
        content={imageUrl ? 'summary_large_image' : 'summary'}
      />
      <meta name="twitter:title" content={pageTitle} />
      <meta
        name="twitter:description"
        content={description}
      />

      {imageUrl && (
        <meta name="twitter:image" content={imageUrl} />
      )}
    </Helmet>
  )
}
