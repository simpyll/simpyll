import { Link } from 'react-router-dom'

import { Container } from './Container'

export function Footer() {
  return (
    <footer className="border-t border-outline bg-canvas">
      <Container>
        <div className="flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <a
            href="/"
            className="font-display text-xl font-semibold tracking-display text-foreground"
          >
            simpyll<span className="text-accent">.</span>
          </a>

          <Link to="/projects" className="min-h-11 inline-flex items-center text-sm text-muted hover:text-accent">Projects</Link>
          <p className="text-sm text-subtle">
            Clinical roots. A learning mindset.
          </p>

          <p className="text-xs text-subtle">
            © {import.meta.env.BUILD_YEAR} Simpyll
          </p>
        </div>
      </Container>
    </footer>
  )
}
