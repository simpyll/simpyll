import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export type Slide = { image: HTMLImageElement; origin: HTMLButtonElement; caption: string }
export type Selection = { slides: Slide[]; index: number }
const ImageDialog = lazy(() => import('./ImageDialog'))
const interactive = 'a, button, summary, label, [role="button"], [role="link"], [role="checkbox"], [role="switch"], [role="tab"], [role="menuitem"], [contenteditable], [data-lightbox="off"]'

/** Runs inside the article Suspense boundary, after its MDX has hydrated. */
export function ArticleImages({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null)
  const [selection, setSelection] = useState<Selection | null>(null)
  useEffect(() => {
    const container = root.current!
    const controls = new Map<HTMLImageElement, HTMLButtonElement>()
    const enhance = () => {
      for (const image of container.querySelectorAll<HTMLImageElement>('img')) {
        if (controls.has(image) || !image.alt.trim() || image.closest(interactive)) continue
        if (!controls.size) void import('./image-controls.css')
        const origin = document.createElement('button')
        origin.type = 'button'
        origin.className = 'article-image-open ui-button ui-button--secondary'
        origin.textContent = 'Enlarge image'
        origin.setAttribute('aria-label', `Enlarge image: ${image.alt}`)
        origin.setAttribute('aria-haspopup', 'dialog')
        origin.onclick = () => {
          const group = image.closest('[data-image-gallery]')
          const slides = [...container.querySelectorAll<HTMLImageElement>('img')]
            .filter(candidate => controls.has(candidate) && (!group ? candidate === image : candidate.closest('[data-image-gallery]') === group))
            .map(candidate => ({ image: candidate, origin: controls.get(candidate)!, caption: candidate.closest('figure')?.querySelector('figcaption')?.textContent?.trim() ?? '' }))
          setSelection({ slides, index: slides.findIndex(slide => slide.image === image) })
        }
        ;(image.closest('picture') ?? image).after(origin)
        controls.set(image, origin)
      }
    }
    enhance()
    const observer = new MutationObserver(enhance)
    observer.observe(container, { childList: true, subtree: true })
    return () => { observer.disconnect(); controls.forEach(button => button.remove()) }
  }, [])
  return <div ref={root}>{children}{selection && createPortal(<Suspense fallback={<p role="status">Opening enlarged image…</p>}><ImageDialog selection={selection} onClose={() => setSelection(null)} /></Suspense>, document.body)}</div>
}
