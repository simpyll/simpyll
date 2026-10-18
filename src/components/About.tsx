
import { Container } from './Container'

export function About() {
  return (
    <section
      id="about"
      className="scroll-mt-24 border-t border-outline py-24 sm:py-32"
    >
      <Container>
        <div className="grid gap-12 md:grid-cols-[1fr_2fr] md:gap-20">
          <div>
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-accent">
              A little introduction
            </p>

            <h2 className="font-display text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              About<span className="text-accent">.</span>
            </h2>
          </div>

          <div>
            <p className="max-w-2xl font-display text-2xl font-medium leading-relaxed tracking-tight text-foreground sm:text-3xl">
              I believe the best things on the web are built with
              curiosity, intention, and a little personality.
            </p>

            <p className="mt-8 max-w-xl text-base leading-relaxed text-muted">
              This is a space to share what I'm building, what I'm
              learning, and the ideas worth exploring along the way.
              A personal corner of the internet, thoughtfully made.
            </p>

            <a
              href="mailto:hello@example.com"
              className="mt-10 inline-flex items-center gap-3 text-sm font-medium text-accent transition-all hover:gap-5"
            >
              Get in touch
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </Container>
    </section>
  )
}
