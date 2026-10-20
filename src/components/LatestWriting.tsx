
import { Link } from 'react-router-dom'
import { Container } from './Container'
import { Reveal } from './Reveal'
import { posts } from '../lib/blog'

export function LatestWriting() {
  const latestPosts = posts.slice(0, 3)

  return (
    <section
      id="writing"
      className="scroll-mt-24 border-t border-outline py-24 sm:py-32"
    >
      <Container>
        <div className="mb-12 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-accent">
              Notes from the learning process
            </p>

            <h2 className="font-display text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Learning journal<span className="text-accent">.</span>
            </h2>
          </div>

          <Link
            to="/blog"
            className="group inline-flex items-center gap-3 text-sm font-medium text-accent transition-all hover:gap-5"
          >
            Read the journal
            <span aria-hidden="true">↗</span>
          </Link>
        </div>

        {latestPosts.length === 0 ? (
          <p className="text-muted">
            No articles published yet.
          </p>
        ) : (
          <div className="divide-y divide-outline border-y border-outline">
            {latestPosts.map((post, index) => (
              <Reveal key={post.slug} delay={index * 0.1}>
                <Link
                  to={`/blog/${post.slug}`}
                  className="group grid gap-4 py-8 transition-colors sm:grid-cols-[140px_1fr_auto] sm:items-center sm:gap-8"
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
                    <p className="mb-2 text-xs font-medium uppercase tracking-widest text-accent">
                      {post.metadata.category}
                    </p>

                    <h3 className="text-xl font-semibold tracking-tight transition-colors group-hover:text-accent sm:text-2xl">
                      {post.metadata.title}
                    </h3>

                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      {post.metadata.description}
                    </p>
                  </div>

                  <span
                    aria-hidden="true"
                    className="text-xl text-subtle transition-all group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-accent"
                  >
                    ↗
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </Container>
    </section>
  )
}
