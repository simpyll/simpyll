
import { Helmet } from 'react-helmet-async'
import { getSiteUrl, siteConfig } from '../config/site'

type SEOProps = {
  title: string
  description: string
  path?: string
  imageType?: string
  imageAlt?: string
  imageWidth?: number
  imageHeight?: number
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
  imageType,
  imageAlt,
  imageWidth,
  imageHeight,
  type = 'website',
  noindex = false,
  robots,
}: SEOProps) {
  const pageTitle = `${title} | ${siteConfig.name}`
  const canonicalUrl = getSiteUrl(path)
  const imageUrl = getSiteUrl(image || '/og-image.png')

  return (
    <Helmet>
      <html lang={siteConfig.language} />
      <link rel="alternate" type="application/rss+xml" title="Simpyll RSS Feed" href={getSiteUrl('/rss.xml')} />

      <title>{pageTitle}</title>

      <meta name="description" content={description} />

      {(noindex || robots) && <meta name="robots" content={noindex ? "noindex, follow" : robots} />}
      {!noindex && <link rel="canonical" href={canonicalUrl} />}

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

      {imageAlt && <meta property="og:image:alt" content={imageAlt} />}
      {imageWidth && <meta property="og:image:width" content={String(imageWidth)} />}
      {imageHeight && <meta property="og:image:height" content={String(imageHeight)} />}
      {imageType && <meta property="og:image:type" content={imageType} />}
      {imageAlt && <meta name="twitter:image:alt" content={imageAlt} />}

      <meta
        name="twitter:card"
        content="summary_large_image"
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
