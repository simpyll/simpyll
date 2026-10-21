import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ThemeToggle } from './ThemeToggle'

const navigation = [
  { label: 'Home', href: '/' },
  { label: 'Projects', href: '/#work' },
  { label: 'Journal', href: '/blog' },
  { label: 'About', href: '/#about' },
]

export function Header() {
  const location = useLocation()
  const [expanded, setExpanded] = useState(false)
  const root = useRef<HTMLElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const links = useRef<HTMLDivElement>(null)
  const indicator = useRef<HTMLSpanElement>(null)
  const active = location.pathname.startsWith('/blog') ? '/blog'
    : location.pathname === '/' ? `/${location.hash === '#work' || location.hash === '#about' ? location.hash : ''}` : null

  useEffect(() => {
    const list = links.current
    const pill = indicator.current
    if (!list || !pill) return
    const update = () => {
      const target = list.querySelector<HTMLElement>('[aria-current]')
      pill.style.opacity = target && target.offsetWidth ? '1' : '0'
      if (!target) return
      pill.style.width = `${target.offsetWidth}px`
      pill.style.height = `${target.offsetHeight}px`
      pill.style.transform = `translate(${target.offsetLeft}px, ${target.offsetTop}px)`
    }
    update()
    const frame = requestAnimationFrame(() => { pill.dataset.ready = 'true' })
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
    observer?.observe(list)
    for (const child of list.querySelectorAll('a')) observer?.observe(child)
    window.addEventListener('resize', update)
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); window.removeEventListener('resize', update) }
  }, [active])

  useEffect(() => {
    if (!expanded) return
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setExpanded(false)
    }
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setExpanded(false); trigger.current?.focus() }
    }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', keyboard)
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', keyboard) }
  }, [expanded])

  const navigate = (href: string) => {
    setExpanded(false)
    // Router retains link semantics; focus/scroll only after the new DOM commits.
    requestAnimationFrame(() => {
      const id = href.split('#')[1]
      const target = document.getElementById(id || 'main-content')
      if (target) {
        target.setAttribute('tabindex', '-1')
        target.focus({ preventScroll: true })
        if (id) target.scrollIntoView()
        else window.scrollTo({ top: 0, behavior: 'instant' })
      }
    })
  }

  return (
    <header className="floating-header" ref={root}>
      <noscript><style>{'.floating-links { flex-wrap: wrap; justify-content: center; } .floating-links .nav-secondary { display: inline-flex; } .floating-nav { border-radius: 1.5rem; flex-wrap: wrap; justify-content: center; } .nav-overflow { display: none; }'}</style></noscript>
      <nav aria-label="Main navigation" className="floating-nav">
        <div ref={links} className="floating-links">
          <span ref={indicator} className="nav-indicator" aria-hidden="true" />
          {navigation.map(item => (
            <Link key={item.label} to={item.href}
              className={`ui-nav-link floating-link ${item.label === 'Projects' || item.label === 'About' ? 'nav-secondary' : ''}`}
              aria-current={active === item.href ? (item.href.includes('#') ? 'location' : 'page') : undefined}
              onClick={() => navigate(item.href)}>{item.label}</Link>
          ))}
        </div>
        <button ref={trigger} type="button" className="nav-overflow floating-link"
          aria-expanded={expanded} aria-controls="navigation-overflow"
          onClick={() => setExpanded(value => !value)}>More<span aria-hidden="true"> ▾</span></button>
        <ThemeToggle />
        <div id="navigation-overflow" className="nav-panel" hidden={!expanded}
          onBlur={event => { if (!root.current?.contains(event.relatedTarget)) setExpanded(false) }}>
          {navigation.map(item => <Link key={item.label} to={item.href} className="floating-link"
            aria-current={active === item.href ? (item.href.includes('#') ? 'location' : 'page') : undefined}
            onClick={() => navigate(item.href)}>{item.label}</Link>)}
        </div>
      </nav>
    </header>
  )
}
