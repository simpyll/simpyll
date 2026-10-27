import { useTheme } from '../theme/store'

export function ThemeToggle() {
  const { resolved, setPreference } = useTheme()
  return (
    <button type="button" className="theme-toggle grid size-11 shrink-0 place-items-center rounded-full border border-control-outline bg-surface text-foreground hover:bg-surface-hover"
      aria-label={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} theme`}
      title={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} theme`}
      onClick={async event => {
        const button = event.currentTarget
        const root = document.documentElement
        const next = root.dataset.theme === 'dark' ? 'light' : 'dark'
        const webkit = /AppleWebKit/.test(navigator.userAgent) && !/Chrome|Chromium|Edg/.test(navigator.userAgent)
        // Nonanimated changes must remain synchronous: OS changes or a second
        // interaction cannot race an optional animation chunk download.
        if (matchMedia('(prefers-reduced-motion: reduce)').matches || !document.startViewTransition || !root.animate || webkit) {
          setPreference(next)
          return
        }
        try {
          const { revealTheme } = await import('../theme/transition')
          revealTheme(button, setPreference, next)
        } catch {
          setPreference(next)
        }
      }}>
      <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <g className="theme-sun"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></g>
        <path className="theme-moon" d="M20.5 13A9 9 0 0 1 11 3.5 9 9 0 1 0 20.5 13Z" />
      </svg>
    </button>
  )
}
