import { Link } from 'react-router-dom'
import { getPublicProjects, getCaseStudyPath } from '../projects'
import { projectsForArticle } from '../lib/project-articles'
import { ProjectStatus } from './ProjectStatus'
export function RelatedProjects({ articlePath }: { articlePath: string }) {
  const projects = projectsForArticle(getPublicProjects(), articlePath).filter(p => getCaseStudyPath(p))
  if (!projects.length) return null
  return <section aria-labelledby="supporting-projects" className="mt-12 border-t border-outline pt-8 print:hidden">
    <h2 id="supporting-projects" className="text-2xl font-semibold">Projects behind the writing</h2>
    <ul className="mt-4 space-y-4">{projects.map(project => <li key={project.id}>
      <Link className="text-accent underline underline-offset-4" to={getCaseStudyPath(project)!}>{project.title} — project case study</Link>
      <p className="mt-2 text-sm text-muted">{project.summary}</p><ProjectStatus project={project} />
    </li>)}</ul>
  </section>
}
