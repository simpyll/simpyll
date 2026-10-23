import { Badge } from './Badge'
import { Card } from './Card'
import { Container } from './Container'
import { Reveal } from './Reveal'

const projects = [
  {
    number: '01',
    category: 'IN PROGRESS',
    title: 'This site, in progress.',
    description:
      'Simpyll is my personal website and learning journal: a working project where I can practice building for the web and share what I learn.',
    tags: ['React', 'TypeScript', 'MDX'],
  },
  {
    number: '02',
    category: 'EXPLORATION',
    title: 'Start with the bedside.',
    description:
      'The questions I bring from critical care will guide future software and AI experiments. I’ll document those ideas here as they take shape.',
    tags: ['Healthcare', 'Software', 'AI'],
  },
]

export function FeaturedWork() {
  return (
    <section id="work" className="scroll-mt-24 py-24 sm:py-32">
      <Container>
        <div className="mb-12 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="mb-4 text-xs font-medium uppercase tracking-eyebrow text-accent">
              Learning through practice
            </p>

            <h2 className="font-display text-4xl font-semibold tracking-heading sm:text-5xl">
              Projects & experiments<span className="text-accent">.</span>
            </h2>
          </div>

          <p className="max-w-xs text-sm leading-relaxed text-muted">
            This site is a working project. I’ll share more
            experiments here as I learn.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {projects.map((project, index) => (
            <Reveal key={project.number} staggerIndex={index}>
              <Card
                padding="roomy"
                className="group h-full hover:border-accent/50"
                hoverable
              >
                <div className="mb-16 flex flex-wrap items-center justify-between gap-2">
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
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </div>

                <div className="mt-8 flex justify-end">
                  <span
                    aria-hidden="true"
                    className="text-xl text-subtle ui-motion-arrow"
                  >
                    ↗
                  </span>
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  )
}
