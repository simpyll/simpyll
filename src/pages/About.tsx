import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { Container } from '../components/Container'
import { Reveal } from '../components/Reveal'
import { Card } from '../components/Card'
import { SEO } from '../components/SEO'
import { getSiteUrl } from '../config/site'
import { profile } from '../content/profile'

const eyebrow = 'text-xs font-medium uppercase tracking-eyebrow text-accent'
const heading =
  'font-display text-3xl font-semibold tracking-heading sm:text-4xl'
const prose = 'text-base leading-relaxed text-muted sm:text-lg'
const linkStyle =
  'inline-flex min-h-11 items-center text-sm font-medium text-accent ui-link-feedback'

export function AboutPage() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': getSiteUrl('/about'),
    mainEntity: {
      '@type': 'Person',
      name: profile.name,
      description: profile.summary,
      url: getSiteUrl('/about'),
      sameAs: [profile.links.linkedin],
      alumniOf: profile.education.map((item) => ({
        '@type': 'EducationalOrganization',
        name: item.school,
      })),
    },
  }
  return (
    <>
      <SEO
        title={profile.seo.title}
        description={profile.seo.description}
        path="/about"
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(schema).replace(/</g, '\\u003c')}
        </script>
      </Helmet>
      <main
        id="main-content"
        tabIndex={-1}
        className="min-h-screen bg-canvas text-foreground"
      >
        <Container>
          <section
            className="border-b border-outline py-20 sm:py-28"
            aria-labelledby="about-title"
          >
            <p className={eyebrow}>About / The person behind Simpyll</p>
            <Reveal>
              <h1
                id="about-title"
                className="mt-8 max-w-4xl font-display text-5xl font-semibold leading-hero tracking-display sm:text-7xl"
              >
                {profile.headline.split('. ').map((part, index) => (
                  <span
                    key={part}
                    className={index === 1 ? 'block text-accent' : 'block'}
                  >
                    {part}
                    {index < 2 ? '.' : ''}
                  </span>
                ))}
              </h1>
            </Reveal>
            <div className="mt-10 grid gap-8 md:grid-cols-[1fr_2fr] md:gap-16">
              <p className="text-sm leading-relaxed text-subtle">
                <span className="block font-medium text-foreground">
                  {profile.name}, {profile.credentials}
                </span>
                {profile.location}
              </p>
              <div className="max-w-2xl space-y-5">
                {profile.introduction.map((text) => (
                  <p key={text} className={prose}>
                    {text}
                  </p>
                ))}
              </div>
            </div>
          </section>
          <div className="divide-y divide-outline">
            {profile.sections.map((section, index) => (
              <section
                key={section.id}
                id={section.id}
                aria-labelledby={`${section.id}-title`}
                className="grid gap-8 py-16 md:grid-cols-[1fr_2fr] md:gap-16 sm:py-20"
              >
                <Reveal>
                  <div>
                    <p className={`${eyebrow} mb-4`}>0{index + 1}</p>
                    <h2 id={`${section.id}-title`} className={heading}>
                      {section.title}
                    </h2>
                  </div>
                </Reveal>
                <div className="max-w-2xl">
                  <p className={prose}>{section.description}</p>
                  {section.id === 'simpyll' && (
                    <Link
                      className={`${linkStyle} mt-6`}
                      to={profile.links.work}
                    >
                      Explore projects & experiments{' '}
                      <span aria-hidden="true" className="ml-2">
                        ↗
                      </span>
                    </Link>
                  )}
                </div>
              </section>
            ))}
          </div>
          <section
            aria-labelledby="exploring-title"
            className="border-y border-outline py-16 sm:py-20"
          >
            <p className={`${eyebrow} mb-4`}>Learning through practice</p>
            <h2 id="exploring-title" className={heading}>
              Currently exploring.
            </h2>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {profile.interests.map((topic, index) => (
                <Reveal key={topic.title} staggerIndex={index}>
                  <Card className="h-full">
                    <h3 className="text-xl font-semibold tracking-tight">
                      {topic.title}
                    </h3>
                    <p className="mt-4 text-base leading-relaxed text-muted">
                      {topic.description}
                    </p>
                  </Card>
                </Reveal>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2">
              <Link className={linkStyle} to={profile.links.writing}>
                Read the learning journal ↗
              </Link>
              <a className={linkStyle} href={profile.links.source}>
                Explore Simpyll on GitHub ↗
              </a>
            </div>
          </section>
          <section
            aria-labelledby="experience-title"
            className="grid gap-10 py-16 md:grid-cols-[1fr_2fr] md:gap-16 sm:py-20"
          >
            <div>
              <p className={`${eyebrow} mb-4`}>Professional background</p>
              <h2 id="experience-title" className={heading}>
                A clinical foundation.
              </h2>
              <p className="mt-5 text-sm leading-relaxed text-muted">
                Selected nursing roles. Some assignments overlap.
              </p>
            </div>
            <ol className="border-l border-outline pl-6 sm:pl-8">
              {profile.experience.map((job) => (
                <li key={job.role} className="relative pb-10 last:pb-0">
                  <span
                    aria-hidden="true"
                    className="absolute -left-[1.78125rem] top-2 h-2 w-2 rounded-full bg-accent sm:-left-[2.28125rem]"
                  />
                  <p className="text-sm text-accent">{job.dates}</p>
                  <h3 className="mt-3 text-xl font-semibold tracking-tight">
                    {job.role}
                  </h3>
                  <p className="mt-2 text-sm font-medium">{job.employer}</p>
                  <p className="mt-3 text-base leading-relaxed text-muted">
                    {job.summary}
                  </p>
                </li>
              ))}
            </ol>
          </section>
          <section
            aria-labelledby="education-title"
            className="grid gap-10 border-t border-outline py-16 md:grid-cols-[1fr_2fr] md:gap-16 sm:py-20"
          >
            <h2 id="education-title" className={heading}>
              Education & training.
            </h2>
            <div>
              <ul className="space-y-6">
                {profile.education.map((item) => (
                  <li key={item.degree}>
                    <h3 className="text-xl font-semibold">{item.degree}</h3>
                    <p className="mt-2 text-muted">
                      {item.school} · {item.year}
                    </p>
                  </li>
                ))}
              </ul>
              <p className={`${prose} mt-8`}>{profile.graduateEducation}</p>
              <h3 className="mt-10 text-xl font-semibold">
                {profile.credentials}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                {profile.training}
              </p>
              <dl className="mt-8 space-y-5">
                {profile.expertise.map((item) => (
                  <div key={item.title}>
                    <dt className="font-medium">{item.title}</dt>
                    <dd className="mt-1 text-sm leading-relaxed text-muted">
                      {item.description}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
          <section
            aria-labelledby="connect-title"
            className="border-t border-outline py-20 sm:py-28"
          >
            <p className={`${eyebrow} mb-5`}>Keep in touch</p>
            <h2 id="connect-title" className={`${heading} max-w-2xl`}>
              Have an idea, question, or something worth building?
            </h2>
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-2">
              <a className={linkStyle} href={profile.links.linkedin}>
                Connect on LinkedIn ↗
              </a>
              <Link className={linkStyle} to={profile.links.writing}>
                Read the blog ↗
              </Link>
              <Link className={linkStyle} to={profile.links.work}>
                Explore projects ↗
              </Link>
            </div>
          </section>
        </Container>
      </main>
    </>
  )
}
