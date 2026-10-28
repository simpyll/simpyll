import { useEffect, useId, useRef, useState } from 'react'
import type { Selection, Slide } from './ArticleLightbox'
import './image-dialog.css'

export default function ImageDialog({ selection, onClose }: { selection: Selection; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const close = useRef<HTMLButtonElement>(null)
  const [index, setIndex] = useState(selection.index)
  const title = useId(), hint = useId()
  const slide = selection.slides[index]
  useEffect(() => {
    const element = dialog.current!
    const origin = selection.slides[selection.index].origin
    const scrollY = window.scrollY
    const style = document.body.style
    const previous = { position: style.position, top: style.top, width: style.width, overflow: style.overflow }
    style.position = 'fixed'; style.top = `-${scrollY}px`; style.width = '100%'; style.overflow = 'hidden'
    // Native top layer makes the rest of the document inert, including for AT.
    element.showModal()
    close.current?.focus()
    return () => {
      element.close()
      Object.assign(style, previous)
      window.scrollTo({ top: scrollY, behavior: 'instant' })
      if (origin.isConnected) origin.focus({ preventScroll: true })
    }
  }, [selection])
  const navigate = (delta: number) => setIndex(value => Math.max(0, Math.min(selection.slides.length - 1, value + delta)))
  return <dialog ref={dialog} className="image-dialog" aria-labelledby={title} aria-describedby={hint} onCancel={event => { event.preventDefault(); onClose() }} onKeyDown={event => {
    // Explicit wrapping also prevents reverse Tab from escaping to browser chrome.
    if (event.key === 'Tab') {
      const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], [tabindex="0"]')].filter(element => element.getClientRects().length)
      const first = controls[0], last = controls.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    if (selection.slides.length > 1 && !event.altKey && !event.ctrlKey && !event.metaKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      if ((event.target as HTMLElement).closest('.image-pan')) return
      event.preventDefault(); navigate(event.key === 'ArrowLeft' ? -1 : 1)
    }
  }}>
    <div className="image-dialog-shell">
      <header className="image-dialog-header"><h2 id={title}>Enlarged image</h2><button ref={close} type="button" onClick={onClose} aria-label="Close enlarged image">Close</button></header>
      <p id={hint} className="image-dialog-hint">Zoom for detail, then scroll or drag to pan. Use gallery arrows outside the image. Escape closes.</p>
      <ImageView key={index} slide={slide} navigate={navigate} />
      <footer className="image-dialog-footer">
        <p role="status" aria-label="Image position" aria-atomic="true">Image {index + 1} of {selection.slides.length}: {slide.image.alt}</p>
        {selection.slides.length > 1 && <nav aria-label="Image gallery"><button type="button" aria-label="Previous image" disabled={index === 0} onClick={() => navigate(-1)}>Previous</button><button type="button" aria-label="Next image" disabled={index === selection.slides.length - 1} onClick={() => navigate(1)}>Next</button></nav>}
      </footer>
    </div>
  </dialog>
}

function ImageView({ slide, navigate }: { slide: Slide; navigate: (delta: number) => void }) {
  const [zoom, setZoom] = useState(1)
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading')
  const pan = useRef<HTMLDivElement>(null)
  const img = useRef<HTMLImageElement>(null)
  const gesture = useRef<{ x: number; y: number; left: number; top: number; id: number } | null>(null)
  const touches = useRef(0)
  const sources = [...(slide.image.closest('picture')?.querySelectorAll('source') ?? [])]
  useEffect(() => { if (img.current?.complete) setState(img.current.naturalWidth ? 'loaded' : 'error') }, [])
  return <>
    <div className="image-dialog-tools" role="group" aria-label="Image zoom"><button type="button" aria-label="Zoom in" disabled={zoom >= 4 || state !== 'loaded'} onClick={() => setZoom(value => Math.min(4, value + 1))}>Zoom in</button><button type="button" aria-label="Zoom out" disabled={zoom <= 1} onClick={() => setZoom(value => Math.max(1, value - 1))}>Zoom out</button><button type="button" aria-label="Reset image zoom" onClick={() => { setZoom(1); pan.current?.scrollTo(0, 0) }}>Reset</button><span>{zoom * 100}%</span><a href={slide.image.dataset.originalSrc ?? slide.image.src} target="_blank" rel="noopener noreferrer">Open original image (new tab)</a></div>
    {state === 'loading' && <p role="status">Loading image…</p>}
    {state === 'error' && <p role="alert">Image could not load. Try the original image link, or close this view.</p>}
    <div ref={pan} className="image-pan" tabIndex={0} role="region" aria-label="Enlarged image; scroll to pan when zoomed" data-zoomed={zoom > 1} onTouchStart={event => { touches.current = event.touches.length; if (touches.current > 1) gesture.current = null }} onTouchEnd={event => { touches.current = event.touches.length }} onPointerDown={event => {
      if (!event.isPrimary || touches.current > 1) return
      gesture.current = { x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop, id: event.pointerId }
      if (event.pointerType === 'mouse' && zoom > 1) event.currentTarget.setPointerCapture(event.pointerId)
    }} onPointerMove={event => {
      const start = gesture.current
      if (!start || start.id !== event.pointerId || zoom === 1 || event.pointerType !== 'mouse') return
      event.currentTarget.scrollLeft = start.left + start.x - event.clientX
      event.currentTarget.scrollTop = start.top + start.y - event.clientY
    }} onPointerCancel={() => { gesture.current = null }} onPointerUp={event => {
      const start = gesture.current; gesture.current = null
      if (!start || zoom > 1 || event.pointerType === 'mouse' || touches.current > 1) return
      const dx = event.clientX - start.x, dy = event.clientY - start.y
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 2) navigate(dx < 0 ? 1 : -1)
    }}>
      <div className="image-zoom-canvas" style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}>
        <picture>{sources.map((source, i) => <source key={i} type={source.type} srcSet={source.srcset} sizes={`${zoom * 100}vw`} />)}<img ref={img} src={slide.image.src} srcSet={slide.image.srcset || undefined} sizes={`${zoom * 100}vw`} alt={slide.image.alt} draggable={false} onLoad={() => setState('loaded')} onError={() => setState('error')} /></picture>
      </div>
    </div>
    {slide.caption && <p className="image-dialog-caption" tabIndex={0} role="region" aria-label="Image caption">{slide.caption}</p>}
  </>
}
