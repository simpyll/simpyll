import { Container } from '../components/Container'
import { FeaturedWork } from '../components/FeaturedWork'
import { LatestWriting } from '../components/LatestWriting'
import { About } from '../components/About'


export function Home() {

return (
  <>
    <main className="min-h-screen bg-canvas text-foreground">

      <Container>
        <section className="flex min-h-[85vh] flex-col justify-center py-24">
          <div className="mb-8 flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
              A different kind of portfolio
            </span>
          </div>

          <h1 className="max-w-4xl font-display text-5xl font-semibold leading-[1.05] tracking-[-0.05em] sm:text-7xl lg:text-8xl">
            The web,
            <br />
            a little more
            <br />
            <span className="italic text-accent">human.</span>
          </h1>

          <p className="mt-8 max-w-xl text-lg leading-relaxed text-muted sm:text-xl">
            A minimal canvas for ideas, projects, and stories.
            Thoughtfully designed. Effortlessly personal.
          </p>

          <div className="mt-12 flex items-center gap-3 text-sm text-subtle">
            <span className="h-px w-10 bg-outline" />
            Scroll to explore
            <span aria-hidden="true">↓</span>
          </div>

        </section>
      </Container>

<FeaturedWork />
<LatestWriting />
<About />
</main>

  </>
  )
}

