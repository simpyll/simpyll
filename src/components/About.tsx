
import { Link } from 'react-router-dom'
import { Container } from './Container'
import { Reveal } from './Reveal'

export function About() {
  return (
    <section
      id="about"
      className="scroll-mt-24 border-t border-outline py-24 sm:py-32"
    >
      <Container>
        <div className="grid gap-12 md:grid-cols-[1fr_2fr] md:gap-20">
          <Reveal>
            <div>
              <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-accent">
                Healthcare × technology
              </p>

              <h2 className="font-display text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                About<span className="text-accent">.</span>
              </h2>
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div>
              <p className="max-w-2xl font-display text-2xl font-medium leading-relaxed tracking-tight text-foreground sm:text-3xl">
                I know the bedside. I’m learning the tools to build
                beyond it.
              </p>

              <p className="mt-8 max-w-xl text-base leading-relaxed text-muted">
                I’m an experienced critical care registered nurse, currently
                pursuing advanced practice nursing education while learning
                software engineering and artificial intelligence. My long-term
                goal is to bring clinical experience and technical skills
                together to help bridge the gap between healthcare and
                technology.
              </p>

              <Link
                to="/blog"
                className="mt-10 inline-flex items-center gap-3 text-sm font-medium text-accent transition-all hover:gap-5"
              >
                Follow the learning journey
                <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  )
}
