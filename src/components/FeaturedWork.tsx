import { Link } from 'react-router-dom'
import { Badge } from './Badge'
import { Card } from './Card'
import { Container } from './Container'
import { Reveal } from './Reveal'

import { getFeaturedProjects, getCaseStudyPath, workflowStages, lifecycleStatuses, technologies } from '../projects'

export function FeaturedWork() {
  const projects = getFeaturedProjects()
  return (
    <section aria-labelledby="work-title" id="work" className="scroll-mt-24 py-16 sm:py-20">
      <Container>
        <div className="mb-8 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="mb-4 text-xs font-medium uppercase tracking-eyebrow text-accent">
              01 / Selected work
            </p>

            <h2 id="work-title" className="font-display text-3xl font-semibold tracking-heading sm:text-4xl">
              Projects & experiments<span className="text-accent">.</span>
            </h2>
          </div>

          <p className="max-w-xs text-sm leading-relaxed text-muted">
            Working software and open-ended exploration.
            The process is part of the work.
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
                <div className="mb-8 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs tracking-widest text-subtle">
                    {String(index + 1).padStart(2, '0')} / {String(projects.length).padStart(2, '0')}
                  </span>

                  <span className="text-xs tracking-widest text-accent">
                    {workflowStages[project.workflowStage].toUpperCase()} · {lifecycleStatuses[project.lifecycleStatus]}
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

                {(getCaseStudyPath(project) || project.links.length > 0) && (
                  <div className="mt-8 flex flex-wrap gap-x-5 gap-y-1 text-sm text-accent">
                    {getCaseStudyPath(project) && <Link className="inline-flex min-h-11 items-center ui-link-feedback" to={getCaseStudyPath(project)!} aria-label={`View Case Study for ${project.title}`}>View case study →</Link>}
                    {project.links.map(link => link.external
                      ? <a className="inline-flex min-h-11 items-center ui-link-feedback" key={link.url} href={link.url}>{link.label}</a>
                      : <Link className="inline-flex min-h-11 items-center ui-link-feedback" key={link.url} to={link.url}>{link.label}</Link>)}
                  </div>
                )}

              </Card>
            </Reveal>
          ))}
        </div>
      <Link to="/projects" className="mt-10 inline-flex min-h-11 items-center text-sm text-accent">View all projects →</Link>
      </Container>
    </section>
  )
}
