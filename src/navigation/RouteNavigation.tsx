import { useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom'

type Position = { x: number; y: number }
const storageKey = 'simpyll-scroll-v1'
const entryKey = (entry: { key: string; pathname: string; search: string; hash: string }) =>
  JSON.stringify([entry.key, entry.pathname, entry.search, entry.hash])

function readPositions(): Map<string, Position> {
  try {
    const entries: unknown = JSON.parse(sessionStorage.getItem(storageKey) || '[]')
    if (!Array.isArray(entries)) return new Map()
    return new Map(entries.filter((entry): entry is [string, Position] =>
      Array.isArray(entry) && typeof entry[0] === 'string' && entry[1] &&
      Number.isFinite(entry[1].x) && Number.isFinite(entry[1].y) && entry[1].y >= 0).slice(-100))
  } catch { return new Map() }
}

function fragmentTarget(hash: string) {
  try { return hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null }
  catch { return null }
}

function focus(target: HTMLElement) {
  if (!target.hasAttribute('tabindex')) target.tabIndex = -1
  target.focus({ preventScroll: true })
}

/** One scroll/focus owner for BrowserRouter; renders no server/client markup. */
export function RouteNavigation() {
  const location = useLocation()
  const action = useNavigationType()
  const navigate = useNavigate()
  const positions = useRef<Map<string, Position> | null>(null)
  const current = useRef(location)
  const previous = useRef<typeof location | null>(null)

  useLayoutEffect(() => {
    positions.current ??= readPositions()
    const native = history.scrollRestoration
    history.scrollRestoration = 'manual'
    const save = () => {
      const entries = positions.current!
      entries.set(entryKey(current.current), { x: scrollX, y: scrollY })
      if (entries.size > 100) entries.delete(entries.keys().next().value!)
    }
    const persist = () => {
      save()
      try { sessionStorage.setItem(storageKey, JSON.stringify([...positions.current!])) } catch { /* Storage is optional. */ }
    }
    // Capture before React replaces a tall page with a shorter one and clamps it.
    window.addEventListener('scroll', save, { passive: true })
    document.addEventListener('click', save, true)
    window.addEventListener('popstate', save)
    window.addEventListener('pagehide', persist)
    return () => {
      history.scrollRestoration = native
      window.removeEventListener('scroll', save)
      document.removeEventListener('click', save, true)
      window.removeEventListener('popstate', save)
      window.removeEventListener('pagehide', persist)
    }
  }, [])

  useLayoutEffect(() => {
    // Native same-document anchors otherwise inherit a router history key. Give
    // each fragment its own entry; leave skip links and modified clicks native.
    const anchor = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
      const link = (event.target as Element).closest<HTMLAnchorElement>('a[href]')
      if (!link || link.hasAttribute('download') || link.target && link.target !== '_self') return
      const url = new URL(link.href)
      if (url.origin !== window.location.origin || url.pathname !== location.pathname || url.search !== location.search || !url.hash || url.hash === '#main-content') return
      event.preventDefault()
      if (url.hash === location.hash) {
        const target = fragmentTarget(url.hash)
        if (target) { target.scrollIntoView({ behavior: 'instant' }); focus(target) }
      } else navigate(url.pathname + url.search + url.hash)
    }
    document.addEventListener('click', anchor)
    return () => document.removeEventListener('click', anchor)
  }, [location.pathname, location.search, location.hash, navigate])

  useLayoutEffect(() => {
    const from = previous.current?.key === location.key ? null : previous.current
    previous.current = location
    current.current = location
    const routeChanged = !!from && from.pathname !== location.pathname
    const saved = action === 'POP' && (from || !location.hash) ? positions.current?.get(entryKey(location)) : undefined
    const hashChanged = !!from && from.hash !== location.hash
    const needsHash = !!location.hash && (!from || routeChanged || hashChanged)
    // Queries and repeated links to the current route preserve focus and scroll.
    if (!routeChanged && !needsHash && !saved) return

    let headingPending = false
    if (routeChanged && action !== 'POP') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      if (!needsHash) {
        const heading = document.querySelector<HTMLElement>('main h1')
        if (heading) focus(heading) // The heading itself announces the destination; no duplicate live region.
        else headingPending = true
      }
    }

    if (!saved && !needsHash && !headingPending) return
    let frame = 0
    let attempts = 0
    let cancelled = false
    const stop = () => { cancelled = true; cancelAnimationFrame(frame) }
    const onKey = (event: KeyboardEvent) => {
      if (['Tab', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) stop()
    }
    const restore = () => {
      if (cancelled) return
      if (headingPending) {
        const heading = document.querySelector<HTMLElement>('main h1')
        if (heading) { focus(heading); headingPending = false }
        if (!headingPending && !saved && !needsHash) return
      }
      const target = fragmentTarget(location.hash)
      const ready = document.querySelector('.floating-header')?.getAttribute('data-nav-ready') === 'true' && document.fonts.status === 'loaded'
      const enoughHeight = !saved || document.documentElement.scrollHeight - innerHeight >= saved.y
      if (ready && (saved ? enoughHeight : target)) {
        if (saved) window.scrollTo({ left: saved.x, top: saved.y, behavior: 'instant' })
        else target!.scrollIntoView({ behavior: 'instant', block: 'start' })
        // History between pages restores reading position without stealing focus.
        if (target && (!from || !routeChanged || action !== 'POP')) focus(target)
        return
      }
      // Bounded wait for committed MDX, header measurement and fonts. Never correct
      // a settled position repeatedly; new navigation/user input cancels pending work.
      if (++attempts < 120) frame = requestAnimationFrame(restore)
      else if (saved) window.scrollTo({ left: saved.x, top: saved.y, behavior: 'instant' })
    }
    frame = requestAnimationFrame(restore)
    window.addEventListener('wheel', stop, { passive: true })
    window.addEventListener('touchstart', stop, { passive: true })
    window.addEventListener('keydown', onKey)
    return () => {
      stop()
      window.removeEventListener('wheel', stop)
      window.removeEventListener('touchstart', stop)
      window.removeEventListener('keydown', onKey)
    }
  }, [location, action])

  return null
}
