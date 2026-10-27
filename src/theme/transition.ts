import type { ThemePreference } from './store'

let cancelActive: (() => void) | undefined

/** One owner for deliberate theme transitions; automatic changes remain immediate. */
export function revealTheme(button: HTMLElement, apply: (value: ThemePreference) => void, requested?: 'light' | 'dark') {
  // Finish a pending update before deriving the next state from the live DOM.
  if (cancelActive) return
  const root = document.documentElement
  const next = requested ?? (root.dataset.theme === 'dark' ? 'light' : 'dark')
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  // WebKit snapshots can drop backdrop-filter on the sticky navigation.
  const webkit = /AppleWebKit/.test(navigator.userAgent) && !/Chrome|Chromium|Edg/.test(navigator.userAgent)
  if (!document.startViewTransition || !root.animate || reduced.matches || webkit) {
    apply(next)
    return
  }
  const rect = button.getBoundingClientRect()
  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2
  const radius = Math.ceil(Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))) + 1
  const styles = getComputedStyle(root)
  const timing = styles.getPropertyValue('--ui-duration-expressive').trim()
  const duration = parseFloat(timing) * (timing.endsWith('ms') ? 1 : 1000)
  const easing = styles.getPropertyValue('--ui-ease-emphasized').trim()
  let animation: Animation | undefined
  let cancelled = false
  let applied = false
  const update = () => { if (!applied) { applied = true; apply(next) } }
  root.dataset.themeTransition = ''
  try {
    const transition = document.startViewTransition(update)
    const cancel = () => { cancelled = true; update(); animation?.cancel(); transition.skipTransition() }
    cancelActive = cancel
    const onTheme = () => { if (applied && root.dataset.theme !== next) cancel() }
    const observer = new MutationObserver(() => { if (!button.isConnected) cancel() })
    observer.observe(document.body, { childList: true, subtree: true })
    window.addEventListener('resize', cancel)
    window.addEventListener('popstate', cancel)
    window.addEventListener('pagehide', cancel)
    window.addEventListener('simpyll-theme-change', onTheme)
    reduced.addEventListener('change', cancel)
    void transition.ready.then(() => {
      if (cancelled || !button.isConnected || reduced.matches) { cancel(); return }
      animation = root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration, easing, pseudoElement: '::view-transition-new(root)' })
      void animation.finished.catch(() => {})
    }).catch(cancel)
    void transition.finished.catch(() => {}).finally(() => {
      observer.disconnect()
      window.removeEventListener('resize', cancel)
      window.removeEventListener('popstate', cancel)
      window.removeEventListener('pagehide', cancel)
      window.removeEventListener('simpyll-theme-change', onTheme)
      reduced.removeEventListener('change', cancel)
      delete root.dataset.themeTransition
      cancelActive = undefined
    })
  } catch {
    delete root.dataset.themeTransition
    cancelActive = undefined
    update()
  }
}
