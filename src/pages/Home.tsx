
import { motion, useReducedMotion } from 'motion/react'
import { Container } from '../components/Container'
import { FeaturedWork } from '../components/FeaturedWork'
import { LatestWriting } from '../components/LatestWriting'
import { About } from '../components/About'
import { Reveal } from '../components/Reveal'

export function Home() {
  const reduceMotion = useReducedMotion()

  return (
    <main className="min-h-screen bg-canvas text-foreground">
      <Container>
        <section className="flex min-h-[85vh] flex-col justify-center py-24">
          <div className="mb-8 flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
              A different kind of portfolio
            </span>
          </div>

          <Reveal>
            <h1 className="max-w-4xl font-display text-5xl font-semibold leading-[1.05] tracking-[-0.05em] sm:text-7xl lg:text-8xl">
              The web,
              <br />
              a little more
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
                human.
              </motion.span>
            </h1>
          </Reveal>

          <p className="mt-8 max-w-xl text-lg leading-relaxed text-muted sm:text-xl">
            A minimal canvas for ideas, projects, and stories.
            Thoughtfully designed. Effortlessly personal.
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
  )
}
