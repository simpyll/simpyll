
import { motion, useReducedMotion } from 'motion/react'
import { Container } from '../components/Container'
import { FeaturedWork } from '../components/FeaturedWork'
import { LatestWriting } from '../components/LatestWriting'
import { About } from '../components/About'
import { Reveal } from '../components/Reveal'
import { SEO } from '../components/SEO'

export function Home() {
  const reduceMotion = useReducedMotion()

  return (
    <>
      <SEO
        title="From Bedside to Build"
        description="A critical care nurse learning software engineering and AI. A public journal of technical writing, experiments, and the journey from bedside to build."
        path="/"
      />

      <main id="main-content" tabIndex={-1} className="min-h-screen bg-canvas text-foreground">
        <Container>
          <section className="flex min-h-[85vh] flex-col justify-center py-24">
            <div className="mb-8 flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-accent" />
              <span className="text-xs font-medium uppercase tracking-eyebrow text-accent">
                A nurse learning to build
              </span>
            </div>

            <Reveal>
              <h1 className="max-w-4xl font-display text-5xl font-semibold leading-hero tracking-display sm:text-7xl lg:text-8xl">
                From
                <br />
                bedside to
                <br />
                <motion.span
                  className="inline-block origin-bottom-left italic text-accent"
                  whileHover={
                    reduceMotion
                      ? undefined
                      : { y: -6, rotate: -3, scale: 1.04 }
                  }
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 18,
                  }}
                >
                  build.
                </motion.span>
              </h1>
            </Reveal>

            <p className="mt-8 max-w-xl text-lg leading-relaxed text-muted sm:text-xl">
              I’m a critical care nurse learning software engineering,
              programming, and AI. This is my public learning journal:
              what I’m studying, trying, and building along the way.
            </p>

            <div className="mt-12 flex items-center gap-3 text-sm text-subtle">
              <span className="h-px w-10 bg-outline" />

              Scroll to explore

              <motion.span
                aria-hidden="true"
                className="inline-block"
                animate={
                  reduceMotion
                    ? undefined
                    : { y: [0, 5, 0] }
                }
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                ↓
              </motion.span>
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
