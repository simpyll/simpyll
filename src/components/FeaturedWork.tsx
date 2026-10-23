import { Link } from 'react-router-dom'
import { Badge } from './Badge'
import { Card } from './Card'
import { Container } from './Container'
import { Reveal } from './Reveal'

import { getFeaturedProjects, projectStatuses, technologies } from '../projects'

export function FeaturedWork() {
  const projects = getFeaturedProjects()
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
            <Reveal key={project.id} staggerIndex={index}>
              <Card
                padding="roomy"
                className="group h-full hover:border-accent/50"
                hoverable
              >
                <div className="mb-16 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs tracking-widest text-subtle">
                    {String(index + 1).padStart(2, '0')} / {String(projects.length).padStart(2, '0')}
                  </span>

                  <span className="text-xs tracking-widest text-accent">
                    {projectStatuses[project.status].toUpperCase()}
                  </span>
                </div>

                <h3 className="text-2xl font-semibold tracking-tight">
                  {project.title}
                </h3>

                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {project.summary}
                </p>

                <div className="mt-8 flex flex-wrap gap-2">
                  {[...project.technologies.map(technology => technologies[technology]), ...(project.tags ?? [])].map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </div>

                {project.links.length > 0 && (
                  <div className="mt-8 flex flex-wrap gap-4 text-sm text-accent">
                    {project.links.map(link => link.external
                      ? <a key={link.url} href={link.url}>{link.label}</a>
                      : <Link key={link.url} to={link.url}>{link.label}</Link>)}
                  </div>
                )}

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
