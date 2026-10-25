import { lazy, Suspense } from 'react'
import { useParams } from 'react-router-dom'
import { getProjectBySlug, getCaseStudyPath } from './index'
import { NotFound } from '../pages/NotFound'
import { loadProjectDetail, loadedProjectDetail } from './detail-loader'

const DeferredDetail = lazy(loadProjectDetail)
export function ProjectDetailRoute() {
  // SSR stays synchronous. Direct visits preload before hydration so the first
  // client tree matches the complete static HTML, including the Suspense boundary.
  const { slug } = useParams()
  const project = slug ? getProjectBySlug(slug) : undefined
  if (!project || !getCaseStudyPath(project)) return <NotFound />
  const detail = loadedProjectDetail() ?? <DeferredDetail />
  return <Suspense fallback={<main id="main-content" tabIndex={-1} className="min-h-screen bg-canvas text-foreground"><p role="status" className="p-8">Loading project…</p></main>}>{detail}</Suspense>
}
