import { useEffect, useLayoutEffect, useRef, useState, useCallback, type SetStateAction, type MouseEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { visibleCount } from '../navigation/capacity'
import { NavSearch } from './NavSearch'
import { ThemeToggle } from './ThemeToggle'

const navigation = [
  { label: 'Home', href: '/' },
  { label: 'Projects', href: '/projects' },
  { label: 'Journal', href: '/blog' },
  { label: 'About', href: '/about' },
]

export function Header() {
  const location = useLocation()
  const [expanded, setExpanded] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const changeSearch = useCallback((value: SetStateAction<boolean>) => { setExpanded(false); setSearchOpen(value) }, [])
  // Conservative identical SSR/hydration layout: More contains all destinations.
  const [count, setCount] = useState(0)
  const countRef = useRef(0)
  const measures = useRef<HTMLDivElement>(null)
  const pendingFocus = useRef<{ href?: string; trigger: boolean } | null>(null)
  const root = useRef<HTMLElement>(null)
  const slot = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const links = useRef<HTMLDivElement>(null)
  const indicator = useRef<HTMLSpanElement>(null)
  const active = (location.pathname.startsWith('/blog') || location.pathname === '/explore') ? '/blog'
    : location.pathname === '/projects' ? '/projects'
    : location.pathname === '/about' ? '/about'
    : location.pathname === '/' ? `/${location.hash === '#work' || location.hash === '#about' ? location.hash : ''}` : null

  useEffect(() => {
    const header = root.current!
    const ruler = measures.current!
    const nav = header.querySelector<HTMLElement>('.floating-nav')!
    const theme = header.querySelector<HTMLElement>('.theme-toggle')!
    let frame = 0
    let disposed = false
    const measure = () => {
      // Reserve exactly the floating header's height, including wrapped/large text.
      if (slot.current) slot.current.style.height = `${header.getBoundingClientRect().height}px`
      document.documentElement.style.setProperty('--navigation-clearance', `${header.getBoundingClientRect().bottom + 16}px`)
      const outer = getComputedStyle(header)
      const style = getComputedStyle(nav)
      const px = (value: string) => parseFloat(value) || 0
      const available = header.getBoundingClientRect().width - px(outer.paddingLeft) - px(outer.paddingRight)
      const widths = [...ruler.querySelectorAll<HTMLElement>('[data-measure-link]')].map(el => el.getBoundingClientRect().width)
      const more = ruler.querySelector<HTMLElement>('[data-measure-more]')!.getBoundingClientRect().width
      const inset = px(style.paddingLeft) + px(style.paddingRight) + px(style.borderLeftWidth) + px(style.borderRightWidth)
      const searchWidth = nav.querySelector<HTMLElement>('.nav-search-control')!.getBoundingClientRect().width
      const next = visibleCount(widths, available - searchWidth - px(style.columnGap), theme.getBoundingClientRect().width, more, px(style.columnGap), inset)
      header.dataset.navReady = 'true'
      if (next === countRef.current) return
      const focused = document.activeElement as HTMLElement | null
      if (focused && nav.contains(focused) && (focused.dataset.navHref || focused === trigger.current)) {
        pendingFocus.current = { href: focused.dataset.navHref, trigger: focused === trigger.current }
      }
      countRef.current = next
      setCount(next)
      if (next === navigation.length) setExpanded(false)
    }
    // Batch observer notifications, but never measure on scroll or in an animation loop.
    const schedule = () => {
      if (disposed) return
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null
    observer?.observe(header)
    observer?.observe(theme)
    for (const child of ruler.children) observer?.observe(child)
    window.addEventListener('resize', schedule)
    document.fonts?.addEventListener('loadingdone', schedule)
    void document.fonts?.ready.then(schedule)
    schedule()
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('resize', schedule)
      document.fonts?.removeEventListener('loadingdone', schedule)
    }
  }, [])

  useLayoutEffect(() => {
    const pending = pendingFocus.current
    pendingFocus.current = null
    if (!pending) return
    const nav = root.current!
    const destination = [...nav.querySelectorAll<HTMLAnchorElement>('[data-nav-href]')]
      .find(el => el.dataset.navHref === pending.href && !el.closest('[hidden], [data-open="false"]'))
    if (destination) destination.focus({ preventScroll: true })
    else if (trigger.current) trigger.current.focus({ preventScroll: true })
    else if (pending.trigger) {
      (nav.querySelector<HTMLElement>('.floating-links [aria-current]')
        ?? nav.querySelector<HTMLElement>('.floating-links a, .theme-toggle'))?.focus({ preventScroll: true })
    }
  }, [count])

  useLayoutEffect(() => {
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
    if (pill.style.opacity !== '1') delete pill.dataset.ready
    update()
    const frame = requestAnimationFrame(() => { pill.dataset.ready = 'true' })
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
    observer?.observe(list)
    for (const child of list.querySelectorAll('a')) observer?.observe(child)
    window.addEventListener('resize', update)
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); window.removeEventListener('resize', update) }
  }, [active, count])

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

  const navigate = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    setExpanded(false)

  }

  return (
    <>
    <div ref={slot} className="navigation-slot" aria-hidden="true" />
    <header className="floating-header" ref={root}>
      <noscript><style>{'.navigation-slot { display: none; } .floating-header { position: relative; } .floating-nav { border-radius: 1.5rem; flex-wrap: wrap; justify-content: center; } .nav-overflow, .nav-measures, .floating-nav .theme-toggle, .nav-search-control, .nav-search-field, .search-panel { display: none; } #navigation-overflow[data-open] { display: flex; position: static; flex-wrap: wrap; justify-content: center; min-width: 0; border: 0; box-shadow: none; padding: 0; background: transparent; }'}</style></noscript>
      <div ref={measures} className="nav-measures" aria-hidden="true" inert>
        {navigation.map(item => <span key={item.href} data-measure-link className="floating-link">{item.label}</span>)}
        <span data-measure-more className="floating-link">More<span aria-hidden="true"> ▾</span></span>
      </div>
      <nav aria-label="Main navigation" className="floating-nav" data-search-open={searchOpen}
        onBlur={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setExpanded(false) }}>
        <ThemeToggle />
        <div className="nav-destinations" inert={searchOpen} aria-hidden={searchOpen}>
        <div ref={links} className="floating-links" hidden={count === 0}>
          <span ref={indicator} className="nav-indicator" aria-hidden="true" />
          {navigation.slice(0, count).map(item => (
            <Link key={item.href} to={item.href} data-nav-href={item.href}
              className="ui-nav-link floating-link"
              aria-current={active === item.href ? (item.href.includes('#') ? 'location' : 'page') : undefined}
              onClick={event => navigate(event)}>{item.label}</Link>
          ))}
        </div>
        {count < navigation.length && <button ref={trigger} type="button" className="nav-overflow floating-link"
          aria-expanded={expanded} aria-controls="navigation-overflow"
          onClick={() => setExpanded(value => !value)}>More<span aria-hidden="true"> ▾</span></button>}
        </div>
        <NavSearch open={searchOpen} onOpenChange={changeSearch} />
        <div id="navigation-overflow" className="nav-panel" data-open={expanded && count < navigation.length}>
          {navigation.slice(count).map(item => <Link key={item.href} to={item.href} data-nav-href={item.href} className="floating-link"
            aria-current={active === item.href ? (item.href.includes('#') ? 'location' : 'page') : undefined}
            onClick={event => navigate(event)}>{item.label}</Link>)}
        </div>
      </nav>
    </header>
    </>
  )
}
