import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

/** Visibility only; RouteNavigation remains the owner of history restoration. */
export function BackToTop() {
  const { key } = useLocation()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let frame = 0
    let active = true
    let styled = false
    let styles: Promise<void> | undefined
    const update = () => {
      frame = 0
      const footer = document.querySelector('footer')
      const footerVisible = !!footer && footer.getBoundingClientRect().top < innerHeight
      const needed = scrollY >= innerHeight && !footerVisible
      if (needed && !styled && !styles) {
        // Optional control styling is fetched only when needed, like link previews.
        styles = import('./back-to-top.css').then(() => {
          if (active) { styled = true; schedule() }
        }, () => { /* Reading and native navigation remain available. */ })
      }
      setVisible(needed && styled)
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    const observer = new ResizeObserver(schedule)
    observer.observe(document.body)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    window.addEventListener('pageshow', schedule)
    schedule()
    return () => {
      active = false
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('pageshow', schedule)
    }
  }, [key])

  function returnToTop() {
    // Prefer the heading (rather than its containing main) for a useful announcement.
    const heading = document.querySelector<HTMLElement>('main h1, #main-content h1') ?? document.getElementById('main-content')
    if (heading) {
      if (!heading.hasAttribute('tabindex')) heading.tabIndex = -1
      heading.focus({ preventScroll: true })
    }
    window.scrollTo({ top: 0, left: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }

  return <button type="button" className="back-to-top grid size-11 shrink-0 place-items-center rounded-full border border-control-outline bg-surface text-foreground hover:bg-surface-hover" hidden={!visible}
    aria-label="Back to top" onClick={returnToTop}>
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="m6 12 6-6 6 6M12 6v12" /></svg>
  </button>
}
