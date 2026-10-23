import { useEffect, useRef, useState } from 'react'
import type { ArticleHeading } from '../lib/blog'

export function ArticleToc({ headings }: { headings: ArticleHeading[] }) {
  const [active, setActive] = useState<string | undefined>(headings[0]?.id)
  const disclosure = useRef<HTMLDetailsElement>(null)
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    const elements = headings.map(h => document.getElementById(h.id)).filter((h): h is HTMLElement => !!h)
    let selected: string | undefined = headings[0]?.id
    let frame = 0
    let positions: number[] = []
    let clearance = 112
    const measure = () => {
      clearance = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--navigation-clearance')) || 112
      positions = elements.map(heading => heading.getBoundingClientRect().top + scrollY)
      schedule()
    }
    // Last heading above the shared clearance wins; before the first, select it.
    // At document end select the final section, even if it cannot reach the top.
    const update = () => {
      frame = 0
      let current: string | undefined = elements[0]?.id
      for (let index = 0; index < positions.length; index++) {
        if (positions[index] <= scrollY + clearance + 2) current = elements[index].id
        else break
      }
      if (scrollY > 0 && Math.ceil(scrollY + innerHeight) >= document.documentElement.scrollHeight - 2) current = elements.at(-1)?.id
      if (selected !== current) { selected = current; setActive(current) }
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    // A passive rAF sampler also catches rapid jumps across short sections. React
    // only receives a state change when the selected section actually changes.
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', measure)
    const observer = new ResizeObserver(measure)
    const article = document.querySelector('.article-content')
    if (article) observer.observe(article)
    const clearanceObserver = new MutationObserver(measure)
    clearanceObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] })
    measure()
    document.fonts.addEventListener('loadingdone', measure)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      clearanceObserver.disconnect()
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', measure)
      document.fonts.removeEventListener('loadingdone', measure)
    }
  }, [headings])

  useEffect(() => {
    const link = root.current?.querySelector<HTMLElement>('.toc-desktop [aria-current]')
    const list = link?.closest<HTMLElement>('.toc-scroll')
    if (link && list) {
      const item = link.getBoundingClientRect(), box = list.getBoundingClientRect()
      if (item.top < box.top) list.scrollTop -= box.top - item.top
      else if (item.bottom > box.bottom) list.scrollTop += item.bottom - box.bottom
    }
  }, [active])

  const groups: { heading: ArticleHeading; children: ArticleHeading[] }[] = []
  for (const heading of headings) {
    const parent = groups.at(-1)
    if (heading.depth === 3 && parent?.heading.depth === 2) parent.children.push(heading)
    else groups.push({ heading, children: [] })
  }
  const link = (heading: ArticleHeading) => <a href={`#${encodeURIComponent(heading.id)}`} aria-current={active === heading.id ? 'location' : undefined}
    onClick={event => {
      if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      if (disclosure.current) disclosure.current.open = false
      // RouteNavigation owns scrolling and destination focus, including repeats.
    }}>{heading.title}</a>
  const list = () => <ol className="toc-list">{groups.map(group => <li key={group.heading.id}>
    {link(group.heading)}
    {group.children.length > 0 && <ol className="toc-list toc-nested">{group.children.map(heading => <li key={heading.id}>{link(heading)}</li>)}</ol>}
  </li>)}</ol>

  return <aside ref={root} className="article-toc">
    <noscript><style>{'@media (max-width: 79.999rem) { .toc-mobile-slot { height: auto; } .toc-panel { position: static; } }'}</style></noscript>
    <nav className="toc-desktop" aria-label="On this page">
      <p className="toc-label">On this page</p><div className="toc-scroll" tabIndex={0} role="region" aria-label="Article sections">{list()}</div>
    </nav>
    <details className="toc-mobile" ref={disclosure}>
      <summary>On this page</summary>
      <nav aria-label="On this page" className="toc-panel">{list()}</nav>
    </details>
  </aside>
}
