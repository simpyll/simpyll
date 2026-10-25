import { Link } from 'react-router-dom'
import { Container } from '../components/Container'
import { SEO } from '../components/SEO'

export function NotFound() {
  return (
    <>
      <SEO title="Page not found" description="The requested page could not be found." noindex robots="noindex, follow" />
      <main id="main-content" tabIndex={-1} className="min-h-screen bg-canvas text-foreground">
        <Container>
          <div className="max-w-2xl py-24 sm:py-32">
            <p className="mb-6 text-xs font-medium uppercase tracking-eyebrow text-accent">404</p>
            <h1 className="text-4xl font-semibold">Page not found.</h1>
            <p className="mt-6 text-muted">The page you’re looking for may have moved, been renamed, or no longer exists.</p>
            <nav aria-label="Page recovery" className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link to="/" className="inline-flex min-h-11 items-center rounded-full border border-accent px-6 font-medium text-accent ui-link-feedback">Go home</Link>
              <Link to="/blog" className="inline-flex min-h-11 items-center text-accent ui-link-feedback">← Back to journal</Link>
              <Link to="/projects" className="inline-flex min-h-11 items-center text-accent ui-link-feedback">Browse projects</Link>
            </nav>
            <p className="mt-6 text-muted">
              Looking for an article?{' '}
              <Link to="/explore" className="inline-flex min-h-11 items-center text-accent ui-link-feedback">Search the journal</Link>
            </p>
          </div>
        </Container>
      </main>
    </>
  )
}
