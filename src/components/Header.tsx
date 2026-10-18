
import { Container } from './Container'

const navigation = [
  { label: 'Work', href: '#work' },
  { label: 'Writing', href: '#writing' },
  { label: 'About', href: '#about' },
]

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
            {navigation.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="group relative py-2 text-sm text-muted transition-colors duration-300 hover:text-foreground"
              >
                {item.label}

                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-0 h-[2px] w-full origin-left scale-x-0 rounded-full bg-accent transition-transform duration-300 ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100"
                />
              </a>
            ))}
          </div>
        </nav>
      </Container>
    </header>
  )
}
