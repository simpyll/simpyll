import { Link } from 'react-router-dom'
import { Container } from '../components/Container'
import { SEO } from '../components/SEO'

export function NotFound() {
  return (
    <>
      <SEO title="Page not found" description="The requested page could not be found." noindex />
      <main id="main-content" tabIndex={-1} className="min-h-screen bg-canvas text-foreground">
        <Container>
          <div className="py-32">
            <h1 className="text-4xl font-semibold">Page not found.</h1>
            <Link to="/blog" className="mt-8 inline-block text-accent hover:underline">
              ← Back to journal
            </Link>
          </div>
        </Container>
      </main>
    </>
  )
}
