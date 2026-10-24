
import { profile } from '../content/profile'
import { Link } from 'react-router-dom'
import { Container } from './Container'
import { Reveal } from './Reveal'

export function About() {
  return (
    <section
      id="about"
      aria-labelledby="home-about-title"
      className="scroll-mt-24 border-t border-outline py-16 sm:py-20"
    >
      <Container>
        <div className="grid gap-12 md:grid-cols-[1fr_2fr] md:gap-20">
          <Reveal>
            <div>
              <p className="mb-4 text-xs font-medium uppercase tracking-eyebrow text-accent">
                03 / A clinical perspective
              </p>

              <h2 id="home-about-title" className="font-display text-3xl font-semibold tracking-heading sm:text-4xl">
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
                className="mt-10 inline-flex min-h-11 items-center gap-3 text-sm font-medium text-accent ui-link-feedback"
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
