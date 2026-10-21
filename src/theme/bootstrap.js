// Runs synchronously in <head>, outside React's hydrated root.
(() => {
  const root = document.documentElement
  const key = 'simpyll-theme'
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const valid = value => ['light', 'dark', 'system'].includes(value)
  let preference = 'system'
  try {
    const saved = localStorage.getItem(key)
    if (valid(saved)) preference = saved
  } catch { /* Storage can be blocked; retain the in-memory preference. */ }

  function apply() {
    root.dataset.themePreference = preference
    root.dataset.theme = preference === 'system' ? (media.matches ? 'dark' : 'light') : preference
    window.dispatchEvent(new Event('simpyll-theme-change'))
  }
  window.addEventListener('simpyll-theme-select', event => {
    if (!valid(event.detail)) return
    preference = event.detail
    try { localStorage.setItem(key, preference) } catch { /* Session-only fallback. */ }
    apply()
  })
  window.addEventListener('storage', event => {
    try { if (event.storageArea !== localStorage) return } catch { return }
    if (event.key !== key && event.key !== null) return
    preference = valid(event.newValue) ? event.newValue : 'system'
    apply()
  })
  media.addEventListener('change', () => {
    if (preference === 'system') apply()
  })
  apply()
})()
