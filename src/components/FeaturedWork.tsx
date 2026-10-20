
import { motion, useReducedMotion } from 'motion/react'
import { Container } from './Container'
import { Reveal } from './Reveal'

const projects = [
  {
    number: '01',
    category: 'IN PROGRESS',
    title: 'This site, in progress.',
    description:
      'Simpyll is my personal website and learning journal: a working project where I can practice building for the web and share what I learn.',
    tags: ['React', 'TypeScript', 'MDX'],
  },
  {
    number: '02',
    category: 'EXPLORATION',
    title: 'Start with the bedside.',
    description:
      'The questions I bring from critical care will guide future software and AI experiments. I’ll document those ideas here as they take shape.',
    tags: ['Healthcare', 'Software', 'AI'],
  },
]

export function FeaturedWork() {
  const reduceMotion = useReducedMotion()

  return (
    <section id="work" className="scroll-mt-24 py-24 sm:py-32">
      <Container>
        <div className="mb-12 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-accent">
              Learning through practice
            </p>

            <h2 className="font-display text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Projects & experiments<span className="text-accent">.</span>
            </h2>
          </div>

          <p className="max-w-xs text-sm leading-relaxed text-muted">
            This site is a working project. I’ll share more
            experiments here as I learn.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {projects.map((project, index) => (
            <Reveal key={project.number} delay={index * 0.12}>
              <motion.div
                className="group h-full rounded-2xl border border-outline bg-surface p-8 transition-colors hover:border-accent/50 sm:p-10"
                whileHover={
                  reduceMotion ? undefined : { y: -6 }
                }
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 22,
                }}
              >
                <div className="mb-16 flex items-center justify-between">
                  <span className="text-xs tracking-widest text-subtle">
                    {project.number} / 02
                  </span>

                  <span className="text-xs tracking-widest text-accent">
                    {project.category}
                  </span>
                </div>

                <h3 className="text-2xl font-semibold tracking-tight">
                  {project.title}
                </h3>

                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {project.description}
                </p>

                <div className="mt-8 flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-outline px-3 py-1 text-xs text-subtle"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-8 flex justify-end">
                  <span
                    aria-hidden="true"
                    className="text-xl text-subtle transition-all duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-accent"
                  >
                    ↗
                  </span>
                </div>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  )
}
