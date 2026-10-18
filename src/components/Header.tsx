import { Container } from './Container'

export function Header() {
  return (
    
<header className="sticky top-0 z-50 border-b border-outline/60 bg-canvas/85 backdrop-blur-xl">

      <Container>
        <nav
          aria-label="Main navigation"
          className="flex h-20 items-center justify-between"
        >
          <a
            href="/"
            className="font-display text-2xl font-semibold tracking-[-0.05em] text-foreground"
          >
            simpyll<span className="text-accent">.</span>
          </a>

          <div className="flex items-center gap-6 sm:gap-8">
            <a
              href="#work"
              className="text-sm text-muted transition-colors hover:text-foreground"
            >
              Work
            </a>

            <a
              href="#writing"
              className="text-sm text-muted transition-colors hover:text-foreground"
            >
              Writing
            </a>

            <a
              href="#about"
              className="text-sm text-muted transition-colors hover:text-foreground"
            >
              About
            </a>
          </div>
        </nav>
      </Container>
    </header>
  )
}
