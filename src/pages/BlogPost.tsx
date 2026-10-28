import { ArticleShare } from '../components/ArticleShare'
import { socialCard, socialCardWidth, socialCardHeight } from '../lib/social-card.mjs'
import { Suspense } from 'react'
import { articleElement } from '../lib/article-loader'
import { RelatedProjects } from '../components/RelatedProjects'
import { ArticleEditorialHistory } from '../components/ArticleEditorialHistory'
import { formatArticleDate } from '../lib/editorial.mjs'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { contentBreadcrumbs } from '../lib/breadcrumbs'
import { getSiteUrl, siteConfig } from '../config/site'
import { RelatedArticles } from '../components/RelatedArticles'
import { MDXProvider } from '@mdx-js/react'
import { mdxComponents } from '../components/mdx/mapping'
import { ArticleToc } from '../components/ArticleToc'
import { TaxonomyLink } from '../components/TaxonomyLink'
import { Navigate, useLocation, useParams } from 'react-router-dom'
import { Container } from '../components/Container'
import { Reveal } from '../components/Reveal'
import { SEO } from '../components/SEO'
import { ArticleSchema } from '../components/ArticleSchema'
import { NotFound } from './NotFound'
import redirects from '../generated/redirects.json' with { type: 'json' }
import { ArticlePagination } from '../components/ArticlePagination'
import { SeriesNavigation } from '../components/SeriesNavigation'
import { getAdjacentArticles, getPostBySlug, getRelatedArticles } from '../lib/blog'

export function BlogPost() {
  const { slug } = useParams<{ slug: string }>()
  const location = useLocation()
  const target = slug && Object.hasOwn(redirects, slug) ? (redirects as Record<string, string>)[slug] : undefined
  if (target) return <Navigate replace to={`/blog/${target}${location.search}${location.hash}`} />
  const post = slug ? getPostBySlug(slug) : undefined

  if (!post) return <NotFound />

  const { metadata } = post

  return (
    <>
      <SEO
        title={metadata.title}
        description={metadata.description}
        path={`/blog/${post.slug}`}
        type="article"
        image={socialCard(post.slug)}
        imageAlt={metadata.title}
        imageType="image/png"
        imageWidth={socialCardWidth}
        imageHeight={socialCardHeight}
      />

      <ArticleSchema post={post} />

      <main id="main-content" tabIndex={-1} className="min-h-screen bg-canvas text-foreground">
        <Container className="article-container">
          <div className={post.headings.length > 1 ? "article-layout has-toc" : "article-layout"}>
          <article className="print-article mx-auto max-w-3xl py-24 sm:py-32">
            <Reveal>
              <Breadcrumbs items={contentBreadcrumbs('blog', metadata.title, `/blog/${post.slug}`)} />

              <p className="mb-6 text-xs font-medium uppercase tracking-eyebrow text-accent">
                <TaxonomyLink kind="category" label={metadata.category} />
              </p>

              <h1 className="font-display text-4xl font-semibold leading-tight tracking-heading sm:text-6xl">
                {metadata.title}
              </h1>

              <p className="mt-6 text-lg leading-relaxed text-muted">
                {metadata.description}
              </p>

              <div className="article-metadata mt-10 flex flex-wrap items-center gap-4 border-b border-outline pb-10 text-sm text-subtle">
                <span>{metadata.author}</span>
                <span aria-hidden="true">·</span>

                <span>Published <time dateTime={metadata.date}>{formatArticleDate(metadata.date)}</time></span>
                {metadata.updatedAt && metadata.updatedAt !== metadata.date && <>
                  <span aria-hidden="true">·</span>
                  <span>Updated <time dateTime={metadata.updatedAt}>{formatArticleDate(metadata.updatedAt)}</time></span>
                </>}
                <span aria-hidden="true">·</span>
                <span>{post.readingTimeMinutes} min read</span>
              </div>
              <ArticleShare key={post.slug} title={metadata.title} url={getSiteUrl(`/blog/${post.slug}`)} />
              <p className="print-attribution">{siteConfig.name} · <a href={getSiteUrl(`/blog/${post.slug}`)}>{getSiteUrl(`/blog/${post.slug}`)}</a></p>
            </Reveal>

            {post.headings.length > 1 && <div className="toc-mobile-slot"><ArticleToc key={post.slug} headings={post.headings} /></div>}
            <div className="prose article-content mt-12 max-w-none">
              <Suspense fallback={<p role="status">Loading article…</p>}><MDXProvider components={mdxComponents}>{articleElement(post.slug)}</MDXProvider></Suspense>
            </div>

            <ArticleEditorialHistory metadata={metadata} />

            <div className="article-tags mt-16 flex flex-wrap gap-2 border-t border-outline pt-8">
              {metadata.tags.map((tag) => (
                <TaxonomyLink key={tag} kind="tag" label={tag} />
              ))}
            </div>
            <RelatedProjects articlePath={`/blog/${post.slug}`} />
            <RelatedArticles articles={getRelatedArticles(metadata.articleId!)} />
            {metadata.series ? <SeriesNavigation post={post} /> : <ArticlePagination {...getAdjacentArticles(metadata.articleId!)} />}
          </article>
          </div>
        </Container>
      </main>
    </>
  )
}
