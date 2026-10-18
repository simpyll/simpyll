
import { useState } from 'react'
import { Button } from './components/Button'
import { Container } from './components/Container'
import { Card } from './components/Card'


function App() {
  const [clicks, setClicks] = useState(0)

  return (
    <main className="flex min-h-screen items-center bg-canvas py-16 text-foreground">
      <Container>
        <div className="rounded-2xl border border-outline bg-surface p-8 text-center sm:p-12">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-2">
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span className="text-sm font-medium text-accent">
              Design system active
            </span>
          </div>

          <h1 className="font-display text-4xl font-semibold tracking-[-0.04em] sm:text-5xl lg:text-6xl">
            Simpyll<span className="text-accent">.</span>
          </h1>

          <p className="mt-5 text-lg text-muted">
            Simple by design. Powerful by nature.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button onClick={() => setClicks((count) => count + 1)}>
              Click me
            </Button>

            <Button variant="secondary" onClick={() => setClicks(0)}>
              Reset
            </Button>
          </div>

          <p className="mt-5 text-sm text-muted">
            Button clicks: <span className="text-accent">{clicks}</span>
          </p>

<div className="mt-10 grid gap-4 text-left sm:grid-cols-2">
  <Card hoverable>
    <p className="mb-3 text-xs font-medium uppercase tracking-widest text-accent">
      Featured Project
    </p>
    <h2 className="text-xl font-semibold tracking-tight">
      Something remarkable.
    </h2>
    <p className="mt-3 text-sm leading-relaxed text-muted">
      A flexible card with a subtle hover animation.
      Move your cursor over it to see the effect.
    </p>
  </Card>

  <Card>
    <p className="mb-3 text-xs font-medium uppercase tracking-widest text-accent">
      Latest Writing
    </p>
    <h2 className="text-xl font-semibold tracking-tight">
      Ideas worth sharing.
    </h2>
    <p className="mt-3 text-sm leading-relaxed text-muted">
      This card uses the same design system without
      the optional hover animation.
    </p>
  </Card>
</div>

          <div className="mt-8 border-t border-outline pt-6">
            <p className="text-sm text-subtle">
              React · TypeScript · Vite · Tailwind CSS
            </p>
          </div>
        </div>
      </Container>
    </main>
  )
}

export default App
