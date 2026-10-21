import { Badge } from '../components/Badge'
import { Link } from 'react-router-dom'
import { Container } from '../components/Container'
import { Reveal } from '../components/Reveal'
import { SEO } from '../components/SEO'
import { posts } from '../lib/blog'

export function Blog() {
  return (
    <>
      <SEO
        title="Learning Journal"
        description="A critical care nurse’s public learning journal: notes on programming, software engineering, AI, and the questions connecting healthcare and technology."
        path="/blog"
      />

      <main id="main-content" tabIndex={-1} className="min-h-screen bg-canvas text-foreground">
        <Container>
          <section className="pb-16 pt-24 sm:pt-32">
            <Reveal>
              <p className="mb-6 text-xs font-medium uppercase tracking-eyebrow text-accent">
                Learning in public
              </p>

              <h1 className="font-display text-5xl font-semibold tracking-display sm:text-7xl">
                Learning journal<span className="text-accent">.</span>
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
                Technical notes, experiments, and reflections as I learn to
                build software and explore AI with a clinical perspective.
              </p>
            </Reveal>
          </section>

          <section className="pb-24 sm:pb-32">
            {posts.length === 0 ? (
              <p className="text-muted">
                No articles yet. Check back soon.
              </p>
            ) : (
              <div className="divide-y divide-outline border-y border-outline">
                {posts.map((post, index) => (
                  <Reveal key={post.slug} staggerIndex={index}>
                    <Link
                      to={`/blog/${post.slug}`}
                      className="group grid gap-4 py-10 transition-colors sm:grid-cols-[140px_1fr_auto] sm:items-start sm:gap-8"
                    >
                      <time
                        dateTime={post.metadata.date}
                        className="text-xs tracking-widest text-subtle"
                      >
                        {new Date(
                          `${post.metadata.date}T12:00:00`
                        ).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </time>

                      <div>
                        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-accent">
                          {post.metadata.category}
                        </p>

                        <h2 className="text-2xl font-semibold tracking-tight transition-colors group-hover:text-accent sm:text-3xl">
                          {post.metadata.title}
                        </h2>

                        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
                          {post.metadata.description}
                        </p>

                        <div className="mt-5 flex flex-wrap gap-2">
                          {post.metadata.tags.map((tag) => (
                            <Badge key={tag}>{tag}</Badge>
                          ))}
                        </div>
                      </div>

                      <span
                        aria-hidden="true"
                        className="text-xl text-subtle ui-motion-arrow"
                      >
                        ↗
                      </span>
                    </Link>
                  </Reveal>
                ))}
              </div>
            )}
          </section>
        </Container>
      </main>
    </>
  )
}
