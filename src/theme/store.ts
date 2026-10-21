import { useSyncExternalStore } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'

function subscribe(listener: () => void) {
  window.addEventListener('simpyll-theme-change', listener)
  return () => window.removeEventListener('simpyll-theme-change', listener)
}

function getSnapshot(): ThemePreference {
  const value = document.documentElement.dataset.themePreference
  return value === 'light' || value === 'dark' ? value : 'system'
}

function resolvedSnapshot(): 'light' | 'dark' {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

export function useTheme() {
  // Both SSR and the first hydration render use System. The external store
  // reconciles the control after hydration; page colors are already correct.
  const preference = useSyncExternalStore(subscribe, getSnapshot, () => 'system' as const)
  const resolved = useSyncExternalStore(subscribe, resolvedSnapshot, () => 'light' as const)
  return {
    preference,
    resolved,
    setPreference(value: ThemePreference) {
      window.dispatchEvent(new CustomEvent('simpyll-theme-select', { detail: value }))
    },
  }
}
