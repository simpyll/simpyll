import { Link, useParams } from 'react-router-dom'
import { SEO } from '../components/SEO'
import { Figure } from '../components/mdx/components'
import { getCaseStudyPath, getProjectBySlug, lifecycleStatuses, technologies, workflowStages, type Project } from '../projects'
import { caseStudies, type CaseStudy } from '../projects/case-studies'
import { NotFound } from './NotFound'
import './project-detail.css'

export function ProjectDetailLayout({ project: p, study }: { project: Project; study: CaseStudy }) {
  return <>
    <SEO title={`${p.title} — Project case study`} description={p.seoDescription ?? p.summary} path={getCaseStudyPath(p)} image={p.cover?.src ?? (p.id === 'simpyll' ? '/images/simpyll-architecture.png' : undefined)} />
    <main id="main-content" tabIndex={-1} className="case-study bg-canvas text-foreground">
      <Link className="case-back" to="/projects">← Explore the Project Lab</Link>
      <header className="case-hero">
        <p className="case-eyebrow">Engineering case study · {p.category ?? p.projectType}</p>
        <h1>{p.title}<span className="text-accent">.</span></h1>
        {p.subtitle && <p className="case-subtitle">{p.subtitle}</p>}
        <p className="case-summary">{p.summary}</p>
        <dl className="case-metadata"><div><dt>Workflow stage</dt><dd>{workflowStages[p.workflowStage]}</dd></div><div><dt>Lifecycle</dt><dd>{lifecycleStatuses[p.lifecycleStatus]}</dd></div><div><dt>Publication</dt><dd>Project case study</dd></div></dl>
        <ul className="case-tech" aria-label="Technologies">{p.technologies.map(t => <li key={t}>{technologies[t]}</li>)}</ul>
        <div className="case-links">{p.links.map(l => <a key={l.url} href={l.url}>{l.label} <span aria-hidden="true">↗</span></a>)}</div>
      </header>
      <nav aria-label="Case study sections" className="case-index">{study.sections.map(s => <a key={s.id} href={`#${s.id}`}>{s.title}</a>)}{study.timeline?.length ? <a href="#timeline">Development timeline</a> : null}</nav>
      <article className="case-body" aria-label={`${p.title} case study`}>
        {study.sections.map((s, i) => <section key={s.id} aria-labelledby={s.id} className="case-section"><p className="case-number" aria-hidden="true">{String(i + 1).padStart(2, '0')}</p><div><h2 id={s.id} tabIndex={-1}>{s.title}</h2>{s.paragraphs.map(text => <p key={text}>{text}</p>)}
          {s.flow && <figure className="case-flow"><figcaption>{s.flow.title}</figcaption><ol>{s.flow.steps.map(step => <li key={step.title}><strong>{step.title}</strong><span>{step.text}</span></li>)}</ol><p>{s.flow.description}</p></figure>}
          {!!s.links?.length && <div className="case-links case-sources">{s.links.map(link => <a key={link.url} href={link.url}>{link.label}</a>)}</div>}
        </div></section>)}
        {!!p.screenshots?.length && <section className="case-gallery" aria-label="Project screenshots">{[...p.screenshots].sort((a,b) => a.order-b.order || a.src.localeCompare(b.src)).map(image => <Figure key={image.src} {...image} />)}</section>}
        {!!study.timeline?.length && <section className="case-timeline" aria-labelledby="timeline"><h2 id="timeline" tabIndex={-1}>A compact development timeline</h2><ol>{study.timeline.map(m => <li key={m.url}><time dateTime={m.date}>{m.date}</time><h3>{m.title}</h3><p>{m.text}</p><a href={m.url}>View milestone source</a></li>)}</ol></section>}
      </article>
      <footer className="case-footer"><p>Keep exploring.</p><div className="case-links"><Link to="/projects">Project Lab</Link><Link to="/blog">Read the blog</Link>{p.links.map(l => <a key={l.url} href={l.url}>{l.label}</a>)}</div></footer>
    </main>
  </>
}
export function ProjectDetail() {
  const { slug = '' } = useParams()
  const project = getProjectBySlug(slug)
  const study = project && getCaseStudyPath(project) && project.caseStudy && caseStudies[project.caseStudy.contentKey]
  return project && study ? <ProjectDetailLayout project={project} study={study} /> : <NotFound />
}
