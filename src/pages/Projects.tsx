import { useState, useSyncExternalStore } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SEO } from '../components/SEO'
import { getCaseStudyPath, getPublicProjects, technologies, workflowStages, lifecycleStatuses, type Project } from '../projects'
import './projects.css'

const projects = getPublicProjects()
const stages = Object.entries(workflowStages)
const types = [...new Set(projects.map(p => p.projectType).filter(Boolean))].sort() as string[]
const usedTechnologies = Object.entries(technologies).filter(([id]) => projects.some(p => p.technologies.includes(id as keyof typeof technologies)))
const subscribe = () => () => {}

export function ProjectCard({ project: p }: { project: Project }) {
  const caseStudyPath = getCaseStudyPath(p)
  return <article className="lab-card" data-project={p.id}>
    <p className="lab-type">{p.projectType}</p>
    <h3>{p.title}</h3>
    <p className="lab-summary">{p.summary}</p>
    <div className="lab-tags"><span>{p.workflowStage && workflowStages[p.workflowStage]}</span><span>Lifecycle: {p.lifecycleStatus && lifecycleStatuses[p.lifecycleStatus]}</span></div>
    {p.technologies.length > 0 && <ul className="lab-tags" aria-label="Technologies">{p.technologies.map(t => <li key={t}>{technologies[t]}</li>)}</ul>}
    {p.nextMilestone && <p className="lab-summary">Next: {p.nextMilestone}</p>}
    {p.description && <details><summary>More about {p.title}</summary><p>{p.description}</p></details>}
    {caseStudyPath && <div className="lab-links"><Link className="lab-case-study" to={caseStudyPath} aria-label={`View Case Study for ${p.title}`}>View Case Study <span aria-hidden="true">→</span></Link></div>}
    {p.links.length > 0 && <div className="lab-links">{p.links.map(link => <a key={link.url} href={link.url}>{link.label} <span aria-hidden="true">↗</span></a>)}</div>}
  </article>
}

export function Projects() {
  const [params, setParams] = useSearchParams()
  // Query URLs receive identical server/client first renders, then restore URL state.
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false)
  const state = hydrated ? params : new URLSearchParams()
  const view = state.get('view') === 'grid' ? 'grid' : 'board'
  const q = (state.get('q') ?? '').slice(0, 160)
  const stage = stages.some(([id]) => id === state.get('stage')) ? state.get('stage')! : ''
  const type = types.includes(state.get('type') ?? '') ? state.get('type')! : ''
  const technology = usedTechnologies.some(([id]) => id === state.get('technology')) ? state.get('technology')! : ''
  const lifecycle = Object.hasOwn(lifecycleStatuses, state.get('lifecycle') ?? '') ? state.get('lifecycle')! : ''
  const [mobileStage, setMobileStage] = useState('in-progress')
  const [showIdeas, setShowIdeas] = useState(false)
  const selectedStage = stage || mobileStage
  const change = (key: string, value: string, replace = false) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value); else next.delete(key)
    setParams(next, { replace, preventScrollReset: true })
  }
  const results = projects.filter(p => (!stage || p.workflowStage === stage) && (!type || p.projectType === type) && (!technology || p.technologies.some(t => t === technology)) && (!lifecycle || p.lifecycleStatus === lifecycle) && (!q.trim() || [p.title, p.summary, p.description, p.projectType, ...(p.tags ?? []), ...p.technologies.map(t => technologies[t])].join(' ').toLocaleLowerCase().includes(q.trim().toLocaleLowerCase())))
  const active = !!(q || stage || type || technology || lifecycle)
  return <>
    <SEO title="Projects" description="Explore Simpyll’s living project lab: active engineering, upcoming tools, and educational software ideas." path="/projects" robots={state.size ? 'noindex,follow' : undefined} />
    <main id="main-content" tabIndex={-1} className="project-lab bg-canvas text-foreground">
      <header className="lab-intro"><p className="lab-eyebrow">The project lab · Learning in public</p><h1>Projects<span className="text-accent">.</span></h1><p>An evolving collection of things I've built, things I'm building, and ideas I haven't stopped thinking about.</p></header>
      <section className="lab-controls" aria-label="Project discovery">
        <div className="lab-controls-top"><label className="lab-search">Search projects<input type="search" placeholder="Find an idea, tool, or technology…" maxLength={160} value={q} onChange={e => change('q', e.target.value, true)} /></label>
          <div className="lab-view" role="group" aria-label="Project view">{['board', 'grid'].map(v => <button key={v} aria-pressed={view === v} onClick={() => change('view', v === 'board' ? '' : v)}>{v === 'board' ? 'Board' : 'Grid'}</button>)}</div></div>
        <div className="lab-filters">
          <label htmlFor="project-stage">Workflow stage<select id="project-stage" aria-label="Workflow stage" value={stage} onChange={e => change('stage', e.target.value)}><option value="">All stages</option>{stages.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
          <label htmlFor="project-type">Project type<select id="project-type" aria-label="Project type" value={type} onChange={e => change('type', e.target.value)}><option value="">All types</option>{types.map(t => <option key={t}>{t}</option>)}</select></label>
          <label htmlFor="project-technology">Technology<select id="project-technology" aria-label="Technology" value={technology} onChange={e => change('technology', e.target.value)}><option value="">All</option>{usedTechnologies.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
          <label htmlFor="project-lifecycle">Lifecycle<select id="project-lifecycle" aria-label="Lifecycle" value={lifecycle} onChange={e => change('lifecycle', e.target.value)}><option value="">All lifecycles</option>{Object.entries(lifecycleStatuses).map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></label>
          <button className="lab-reset" disabled={!active} onClick={() => setParams(view === 'grid' ? { view: 'grid' } : {}, { preventScrollReset: true })}>Reset filters</button>
        </div>
      </section>
      <div className="lab-result-line"><p role="status" aria-live="polite" aria-atomic="true">{results.length} project{results.length === 1 ? '' : 's'}{active ? ' match your filters' : ' · A public, read-only roadmap'}</p>{view === 'board' && <span className="lab-scroll-hint">Scroll the board to explore all five stages →</span>}</div>
      {view === 'board' ? <>
        <label className="lab-mobile-selector" htmlFor="mobile-stage">Viewing stage<select id="mobile-stage" aria-label="Viewing stage" value={selectedStage} onChange={e => { setMobileStage(e.target.value); if (stage) change('stage', e.target.value) }}>{stages.map(([id,label]) => <option key={id} value={id}>{label} ({results.filter(p => p.workflowStage === id).length})</option>)}</select></label>
        <div className="lab-board" role="region" aria-label="Project workflow board" tabIndex={0}>
          {stages.map(([id,label]) => {
            const items = results.filter(p => p.workflowStage === id)
            const visible = id === 'ideas' && !showIdeas ? items.slice(0,4) : items
            return <section key={id} className="lab-column" data-stage={id} data-mobile-active={selectedStage === id} aria-labelledby={`stage-${id}`}><div className="lab-column-heading"><h2 id={`stage-${id}`}><span className="lab-dot" aria-hidden="true" />{label}</h2><span aria-label={`${items.length} projects`}>{items.length}</span></div>
              {visible.map(p => <ProjectCard key={p.id} project={p} />)}
              {!items.length && <p className="lab-empty">{active ? 'No matches in this stage.' : 'Nothing here yet. Room for what comes next.'}</p>}
              {id === 'ideas' && items.length > 4 && <button className="lab-more" aria-expanded={showIdeas} onClick={() => setShowIdeas(v => !v)}>{showIdeas ? 'Show fewer ideas' : `Show ${items.length - 4} more ideas`}</button>}
              {id === 'ideas' && <noscript><div>{items.slice(4).map(p => <ProjectCard key={p.id} project={p} />)}</div></noscript>}
            </section>
          })}
        </div>
      </> : <section aria-label="Project grid" className="lab-grid">{results.map(p => <ProjectCard key={p.id} project={p} />)}</section>}
      {!results.length && <p className="lab-no-results">No projects match. Try another search or reset the filters.</p>}
      <p className="lab-note">Stages reflect my current priorities, not release availability. Healthcare ideas are educational software concepts, not released clinical tools.</p>
      <noscript><style>{'.lab-controls,.lab-mobile-selector,.lab-more{display:none!important}.lab-board{display:block!important}.lab-column{display:block!important;margin-bottom:2rem}'}</style></noscript>
    </main>
  </>
}
