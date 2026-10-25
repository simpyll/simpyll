import { Link } from 'react-router-dom'
import { profile } from '../content/profile'
import { Container } from '../components/Container'
import { FeaturedWork } from '../components/FeaturedWork'
import { LatestWriting } from '../components/LatestWriting'
import { About } from '../components/About'
import { Reveal } from '../components/Reveal'
import { SEO } from '../components/SEO'

export function Home() {
  return (
    <>
      <SEO
        title="Software Engineering & AI from a Critical Care Nurse"
        description="A critical care nurse learning software engineering and AI. A public journal of technical writing, experiments, and the journey from bedside to build."
        path="/"
      />

      <main id="main-content" tabIndex={-1} className="min-h-screen break-words bg-canvas text-foreground">
        <Container>
          <section aria-labelledby="home-title" className="border-b border-outline pb-14 pt-16 sm:pb-20 sm:pt-24">
            <p className="text-xs font-medium uppercase tracking-eyebrow text-accent">
              Simpyll / A personal work in progress
            </p>
            <Reveal>
              <h1 id="home-title" className="mt-8 max-w-4xl font-display text-5xl font-semibold leading-hero tracking-display sm:text-7xl lg:text-8xl">
                From bedside{' '}<br />to <span className="ui-hero-word inline-block italic text-accent">build.</span>
              </h1>
            </Reveal>
            <div className="mt-10 grid gap-8 md:grid-cols-[1fr_2fr] md:gap-16">
              <p className="text-sm leading-relaxed text-subtle">
                <span className="block font-medium text-foreground">{profile.name}</span>
                Critical care nurse. Curious builder.
              </p>
              <div className="max-w-xl">
                <p className="text-lg leading-relaxed text-muted sm:text-xl">
                  I’m learning to build software and exploring AI, with a clinical perspective
                  on the problems worth solving. Simpyll is where I share the projects,
                  experiments, and lessons along the way.
                </p>
                <div className="mt-6 flex flex-wrap gap-x-7 gap-y-2">
                  <Link to="/projects" className="inline-flex min-h-11 items-center gap-3 text-sm font-medium text-accent ui-link-feedback">Explore projects <span aria-hidden="true">↗</span></Link>
                  <Link to="/blog" className="inline-flex min-h-11 items-center gap-3 text-sm font-medium text-accent ui-link-feedback">Browse the blog <span aria-hidden="true">↗</span></Link>
                </div>
              </div>
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
