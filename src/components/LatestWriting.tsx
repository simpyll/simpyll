
import { Container } from './Container'

const articles = [
  {
    date: 'OCT 2026',
    category: 'DESIGN',
    title: 'Designing for the curious.',
    description:
      'Why the best digital experiences leave room for exploration.',
    readingTime: '5 min read',
  },
  {
    date: 'SEP 2026',
    category: 'DEVELOPMENT',
    title: 'The beauty of building simply.',
    description:
      'Thoughts on creating useful things without unnecessary complexity.',
    readingTime: '7 min read',
  },
  {
    date: 'AUG 2026',
    category: 'IDEAS',
    title: 'A little more human.',
    description:
      'Making space for personality and thoughtful interactions on the web.',
    readingTime: '4 min read',
  },
]

export function LatestWriting() {
  return (
    <section
      id="writing"
      className="scroll-mt-24 border-t border-outline py-24 sm:py-32"
    >
      <Container>
        <div className="mb-12">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-accent">
            Notes & perspectives
          </p>

          <h2 className="font-display text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            Latest writing<span className="text-accent">.</span>
          </h2>
        </div>

        <div className="divide-y divide-outline border-y border-outline">
          {articles.map((article) => (
            <article
              key={article.title}
              className="group grid gap-4 py-8 transition-colors sm:grid-cols-[140px_1fr_auto] sm:items-center sm:gap-8"
            >
              <div className="text-xs tracking-widest text-subtle">
                {article.date}
              </div>

              <div>
                <p className="mb-2 text-xs font-medium tracking-widest text-accent">
                  {article.category}
                </p>

                <h3 className="text-xl font-semibold tracking-tight transition-colors group-hover:text-accent sm:text-2xl">
                  {article.title}
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {article.description}
                </p>
              </div>

              <span className="text-xs text-subtle">
                {article.readingTime}
              </span>
            </article>
          ))}
        </div>
      </Container>
    </section>
  )
}
