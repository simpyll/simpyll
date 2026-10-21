
import { NavigationLink } from './NavigationLink'
import { ThemeSelect } from './ThemeSelect'
import { Container } from './Container'

const navigation = [
  { label: 'Projects', href: '/#work' },
  { label: 'Journal', href: '/#writing' },
  { label: 'About', href: '/#about' },
]

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-outline/60 bg-canvas/85 backdrop-blur-xl">
      <Container>
        <nav
          aria-label="Main navigation"
          className="flex min-h-20 flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3"
        >
          <a
            href="/"
            className="font-display text-2xl font-semibold tracking-display text-foreground"
          >
            simpyll<span className="text-accent">.</span>
          </a>

          <div className="flex items-center gap-4 min-[360px]:gap-6 sm:gap-8">
            {navigation.map((item) => (
              <NavigationLink key={item.label} href={item.href}>
                {item.label}
              </NavigationLink>
            ))}
          </div>
          <div className="flex w-full justify-end sm:w-auto">
            <ThemeSelect />
          </div>
        </nav>
      </Container>
    </header>
  )
}
