/** Progressive enhancement: the underlying DOM is always visible, including SSR. */
export function observeReveal(element: HTMLElement, staggerIndex = 0, delay = 0) {
  if (!window.matchMedia || !window.IntersectionObserver || !element.animate) return () => {}
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
  let animation: Animation | undefined
  let finished = false
  const cancel = () => {
    observer?.disconnect()
    animation?.cancel()
  }
  const onPreference = () => {
    if (preference.matches) { finished = true; cancel() }
  }
  if (preference.matches) return () => {}
  preference.addEventListener('change', onPreference)
  const observer = new IntersectionObserver(entries => {
    if (finished || !entries.some(entry => entry.isIntersecting)) return
    finished = true
    observer?.disconnect()
    if (preference.matches) return
    const style = getComputedStyle(element)
    const milliseconds = (name: string) => {
      const value = style.getPropertyValue(name).trim()
      return parseFloat(value) * (value.endsWith('ms') ? 1 : 1000)
    }
    try {
      animation = element.animate([
        { opacity: 0, transform: `translateY(${style.getPropertyValue('--ui-motion-reveal').trim()})` },
        { opacity: 1, transform: 'none' },
      ], {
        duration: milliseconds('--ui-duration-expressive'),
        easing: style.getPropertyValue('--ui-ease-entrance').trim(),
        delay: Math.min(4, Math.max(0, staggerIndex)) * milliseconds('--ui-motion-stagger') + Math.max(0, delay) * 1000,
        fill: 'backwards',
      })
    } catch { /* Visible base styles are the animation failure fallback. */ }
  }, { threshold: 0.15 })
  observer.observe(element)
  return () => {
    finished = true
    cancel()
    preference.removeEventListener('change', onPreference)
  }
}
