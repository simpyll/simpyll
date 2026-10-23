
import { profile } from '../content/profile'
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
              <p className="mb-4 text-xs font-medium uppercase tracking-eyebrow text-accent">
                Healthcare × technology
              </p>

              <h2 className="font-display text-4xl font-semibold tracking-heading sm:text-5xl">
                About<span className="text-accent">.</span>
              </h2>
            </div>
          </Reveal>

          <Reveal staggerIndex={1}>
            <div>
              <p className="max-w-2xl font-display text-2xl font-medium leading-relaxed tracking-tight text-foreground sm:text-3xl">
                {profile.homeHeadline}
              </p>

              <p className="mt-8 max-w-xl text-base leading-relaxed text-muted">
                {profile.homeSummary}
              </p>

              <Link
                to="/about"
                className="mt-10 inline-flex items-center gap-3 text-sm font-medium text-accent ui-link-feedback"
              >
                More about me
                <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  )
}
