import { Link } from 'react-router-dom'
import { Container } from '../components/Container'
import { SEO } from '../components/SEO'
import policies from '../content/policies.json'

export const policyLinks = policies.map(({ slug, title }) => ({ slug, title }))
export function Policy({ slug }: { slug: string }) {
  const policy = policies.find(item => item.slug === slug)!
  return <>
    <SEO title={policy.title} description={policy.description} path={`/${slug}`} />
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-canvas text-foreground">
      <Container><article className="mx-auto max-w-3xl py-20 sm:py-28 break-words">
        <p className="text-sm text-accent">Legal &amp; Transparency</p>
        <h1 className="mt-5 font-display text-4xl font-semibold tracking-heading sm:text-5xl">{policy.title}</h1>
        <p className="mt-5 text-lg text-muted">{policy.description}</p>
        <aside aria-label="Document status" className="my-8 border-l-2 border-accent pl-5 text-sm leading-relaxed text-muted">
          <p className="font-semibold text-foreground">Draft — owner approval pending</p>
          <p>Draft reviewed <time dateTime="2026-10-24">October 24, 2026</time>. Effective date: not set.</p>
          <p>Prepared for review; not represented as attorney-approved. Private contact and other approval decisions remain unresolved.</p>
        </aside>
        <nav aria-label="On this page" className="mb-10"><ul className="flex flex-wrap gap-x-6 gap-y-1">
          {policy.sections.map((section, i) => <li key={section.title}><a className="inline-flex min-h-11 items-center text-accent underline underline-offset-4" href={`#section-${i + 1}`}>{section.title}</a></li>)}
        </ul></nav>
        {policy.sections.map((section, i) => <section key={section.title} aria-labelledby={`section-${i + 1}`} className="border-t border-outline py-8">
          <h2 id={`section-${i + 1}`} className="text-2xl font-semibold tracking-heading">{section.title}</h2>
          <p className="mt-4 text-base leading-relaxed text-muted">{section.text}</p>
        </section>)}
        <p className="text-sm leading-relaxed text-muted">Supporting information: <a className="text-accent underline" href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">GitHub privacy statement</a>, <a className="text-accent underline" href="https://github.com/simpyll/simpyll/blob/main/docs/ACCESSIBILITY.md">accessibility audit</a>, and <a className="text-accent underline" href="https://github.com/simpyll/simpyll/blob/main/docs/LEGAL.md">data inventory and review decisions</a>. Do not post private requests or vulnerabilities in public issues. A private security reporting channel has not yet been verified.</p>
        <nav aria-label="Related policies" className="mt-10 border-t border-outline pt-6"><ul className="flex flex-wrap gap-x-6 gap-y-1">{policyLinks.filter(item => item.slug !== slug).map(item => <li key={item.slug}><Link className="inline-flex min-h-11 items-center text-accent underline" to={`/${item.slug}`}>{item.title}</Link></li>)}</ul></nav>
      </article></Container>
    </main>
  </>
}
