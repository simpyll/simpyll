
import { Container } from './Container'

export function Footer() {
  return (
    <footer className="border-t border-outline bg-canvas">
      <Container>
        <div className="flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <a
            href="/"
            className="font-display text-xl font-semibold tracking-[-0.05em] text-foreground"
          >
            simpyll<span className="text-accent">.</span>
          </a>

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
