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

export function useTheme() {
  // Both SSR and the first hydration render use System. The external store
  // reconciles the control after hydration; page colors are already correct.
  const preference = useSyncExternalStore(subscribe, getSnapshot, () => 'system' as const)
  return {
    preference,
    setPreference(value: ThemePreference) {
      window.dispatchEvent(new CustomEvent('simpyll-theme-select', { detail: value }))
    },
  }
}
