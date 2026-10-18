import { Card } from './Card'
import { Container } from './Container'

const projects = [
  {
    number: '01',
    category: 'OPEN SOURCE',
    title: 'Built to be shared.',
    description:
      'A thoughtful foundation for building personal websites that feel distinctly your own.',
    tags: ['React', 'TypeScript', 'Design'],
  },
  {
    number: '02',
    category: 'EXPERIMENTS',
    title: 'Curiosity in motion.',
    description:
      'Exploring the intersection of interaction, typography, and creative development.',
    tags: ['Interaction', 'Motion', 'Web'],
  },
]

export function FeaturedWork() {
  return (
    <section id="work" className="scroll-mt-24 py-24 sm:py-32">
      <Container>
        <div className="mb-12 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-accent">
              Selected projects
            </p>

            <h2 className="font-display text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Featured work<span className="text-accent">.</span>
            </h2>
          </div>

          <p className="max-w-xs text-sm leading-relaxed text-muted">
            A collection of things built with curiosity, care,
            and a little experimentation.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {projects.map((project) => (
            <Card key={project.number} hoverable>
              <div className="mb-16 flex items-center justify-between">
                <span className="text-xs tracking-widest text-subtle">
                  {project.number} / 02
                </span>
                <span className="text-xs tracking-widest text-accent">
                  {project.category}
                </span>
              </div>

              <h3 className="text-2xl font-semibold tracking-tight">
                {project.title}
              </h3>

              <p className="mt-3 text-sm leading-relaxed text-muted">
                {project.description}
              </p>

              <div className="mt-8 flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-outline px-3 py-1 text-xs text-subtle"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  )
}
