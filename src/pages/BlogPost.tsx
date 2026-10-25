import { MDXProvider } from '@mdx-js/react'
import { mdxComponents } from '../components/mdx/mapping'
import { ArticleToc } from '../components/ArticleToc'
import { TaxonomyLink } from '../components/TaxonomyLink'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { Container } from '../components/Container'
import { Reveal } from '../components/Reveal'
import { SEO } from '../components/SEO'
import { ArticleSchema } from '../components/ArticleSchema'
import { NotFound } from './NotFound'
import redirects from '../generated/redirects.json' with { type: 'json' }
import { getPostBySlug } from '../lib/blog'

export function BlogPost() {
  const { slug } = useParams<{ slug: string }>()
  const location = useLocation()
  const target = slug && Object.hasOwn(redirects, slug) ? (redirects as Record<string, string>)[slug] : undefined
  if (target) return <Navigate replace to={`/blog/${target}${location.search}${location.hash}`} />
  const post = slug ? getPostBySlug(slug) : undefined

  if (!post) return <NotFound />

  const { metadata, Content } = post

  return (
    <>
      <SEO
        title={metadata.title}
        description={metadata.description}
        path={`/blog/${post.slug}`}
        type="article"
      />

      <ArticleSchema post={post} />

      <main id="main-content" tabIndex={-1} className="min-h-screen bg-canvas text-foreground">
        <Container className="article-container">
          <div className={post.headings.length > 1 ? "article-layout has-toc" : "article-layout"}>
          <article className="mx-auto max-w-3xl py-24 sm:py-32">
            <Reveal>
              <Link
                to="/blog"
                className="mb-12 inline-block text-sm text-muted transition-colors hover:text-accent"
              >
                ← Back to journal
              </Link>

              <p className="mb-6 text-xs font-medium uppercase tracking-eyebrow text-accent">
                <TaxonomyLink kind="category" label={metadata.category} />
              </p>

              <h1 className="font-display text-4xl font-semibold leading-tight tracking-heading sm:text-6xl">
                {metadata.title}
              </h1>

              <p className="mt-6 text-lg leading-relaxed text-muted">
                {metadata.description}
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-4 border-b border-outline pb-10 text-sm text-subtle">
                <span>{metadata.author}</span>
                <span aria-hidden="true">·</span>

                <time dateTime={metadata.date}>
                  {new Date(
                    `${metadata.date}T12:00:00`
                  ).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </time>
                <span aria-hidden="true">·</span>
                <span>{post.readingTimeMinutes} min read</span>
              </div>
            </Reveal>

            {post.headings.length > 1 && <div className="toc-mobile-slot"><ArticleToc key={post.slug} headings={post.headings} /></div>}
            <div className="prose article-content mt-12 max-w-none">
              <MDXProvider components={mdxComponents}><Content /></MDXProvider>
            </div>

            <div className="mt-16 flex flex-wrap gap-2 border-t border-outline pt-8">
              {metadata.tags.map((tag) => (
                <TaxonomyLink key={tag} kind="tag" label={tag} />
              ))}
            </div>
          </article>
          </div>
        </Container>
      </main>
    </>
  )
}
