import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import data from '../generated/link-previews.json'
import aliases from '../generated/redirects.json'
import { previewRoute } from '../lib/link-preview-url.mjs'
import { siteConfig } from '../config/site'

type Preview = { title: string; excerpt: string; type: string; thumbnail?: string }
const records: Record<string, Preview> = data

/** Enhance only contextual prose anchors. All navigation remains owned by the link. */
export function LinkPreviews() {
  const location = useLocation()
  const panel = useRef<HTMLDivElement>(null)
  const reposition = useRef<() => void>(() => {})
  const [selection, setSelection] = useState<{ record: Preview; x: number; y: number; repeatTitle: boolean } | null>(null)
  useEffect(() => {
    let anchor: HTMLAnchorElement | null = null
    let hovered = false, focused = false, overPanel = false, dismissed = false
    let openTimer: ReturnType<typeof setTimeout> | undefined, closeTimer: ReturnType<typeof setTimeout> | undefined
    let frame = 0, generation = 0
    const clearTimers = () => { clearTimeout(openTimer); clearTimeout(closeTimer); openTimer = closeTimer = undefined; cancelAnimationFrame(frame) }
    const hide = () => { generation++; clearTimers(); anchor?.removeAttribute('aria-describedby'); setSelection(null) }
    const reset = () => { hide(); anchor = null; hovered = focused = overPanel = dismissed = false }
    const closeWhenOutside = () => {
      clearTimeout(closeTimer)
      if (!hovered && !focused && !overPanel) {
        dismissed = false
        clearTimeout(openTimer)
        openTimer = undefined
        closeTimer = setTimeout(reset, 140)
      }
    }
    const place = () => {
      if (!anchor || dismissed || !panel.current) return
      const rect = anchor.getBoundingClientRect(), viewport = window.visualViewport
      const left = viewport?.offsetLeft ?? 0, top = viewport?.offsetTop ?? 0
      const width = viewport?.width ?? innerWidth, height = viewport?.height ?? innerHeight
      if (rect.bottom < top || rect.top > top + height || rect.right < left || rect.left > left + width) { hide(); return }
      const above = Math.max(0, rect.top - top - 8), below = Math.max(0, top + height - 8 - rect.bottom)
      if (Math.max(above, below) < 48) { hide(); return }
      const element = panel.current
      element.style.maxWidth = `${width - 16}px`
      element.style.maxHeight = `${Math.max(above, below)}px`
      const { height: h, width: w } = element.getBoundingClientRect()
      element.style.left = `${Math.max(left + 8, Math.min(rect.left, left + width - w - 8))}px`
      element.style.top = `${h <= below ? rect.bottom : rect.top - h}px`
      element.style.visibility = 'visible'
      anchor.setAttribute('aria-describedby', 'internal-link-preview')
      observer.observe(element)
    }
    reposition.current = place
    const observer = new ResizeObserver(() => { cancelAnimationFrame(frame); frame = requestAnimationFrame(place) })
    const eligible = (target: EventTarget | null) => {
      const link = target instanceof Element ? target.closest<HTMLAnchorElement>('.article-content a[href]') : null
      if (!link || link.hasAttribute('aria-describedby') || link.querySelector('img') || link.hasAttribute('data-footnote-ref') || link.hasAttribute('data-footnote-backref')) return null
      const route = previewRoute(link.getAttribute('href'), window.location.href, import.meta.env.BASE_URL, siteConfig.url, records, aliases)
      return route ? { link, record: records[route] } : null
    }
    const begin = (target: EventTarget | null, mode: 'hover' | 'focus') => {
      // The current link acquires aria-describedby only while the panel is open.
      const existing = target instanceof Element ? target.closest('a') : null
      const match = existing && existing === anchor ? { link: anchor!, record: undefined } : eligible(target)
      if (!match) return
      const styles = import('./link-previews.css').then(() => true, () => false)
      if (anchor !== match.link) { reset(); anchor = match.link }
      if (mode === 'hover') hovered = true
      else focused = true
      clearTimeout(closeTimer)
      if (dismissed || anchor.hasAttribute('aria-describedby') || openTimer) return
      const record = match.record ?? records[previewRoute(anchor.getAttribute('href'), window.location.href, import.meta.env.BASE_URL, siteConfig.url, records, aliases)!]
      const token = generation
      openTimer = setTimeout(async () => {
        openTimer = undefined
        if (!await styles) return
        if (token !== generation || !anchor?.isConnected || dismissed || !record) return
        setSelection({ record, x: 8, y: 8, repeatTitle: (anchor.getAttribute('aria-label') ?? anchor.textContent ?? '').trim() === record.title.trim() })
        frame = requestAnimationFrame(place)
      }, 350)
    }
    const pointerOver = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      if (panel.current?.contains(event.target as Node)) { overPanel = true; clearTimeout(closeTimer); return }
      begin(event.target, 'hover')
    }
    const pointerOut = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      const next = event.relatedTarget as Node | null
      if (anchor?.contains(event.target as Node) && !anchor.contains(next)) hovered = false
      if (panel.current?.contains(event.target as Node) && !panel.current.contains(next)) overPanel = false
      closeWhenOutside()
    }
    const focusIn = (event: FocusEvent) => {
      // Touch/mouse focus must never make a tap wait for or open a preview.
      if (event.target instanceof Element && event.target.matches(':focus-visible')) begin(event.target, 'focus')
    }
    const focusOut = (event: FocusEvent) => { if (event.target === anchor) { focused = false; closeWhenOutside() } }
    const keyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && anchor) { dismissed = true; hide() } }
    const viewportChange = (event: Event) => {
      if (event.target instanceof Node && panel.current?.contains(event.target)) return
      if (anchor && panel.current) { cancelAnimationFrame(frame); frame = requestAnimationFrame(place) }
    }
    document.addEventListener('pointerover', pointerOver)
    document.addEventListener('pointerout', pointerOut)
    document.addEventListener('focusin', focusIn)
    document.addEventListener('focusout', focusOut)
    document.addEventListener('keydown', keyDown)
    window.addEventListener('scroll', viewportChange, true)
    window.addEventListener('resize', viewportChange)
    window.visualViewport?.addEventListener('resize', viewportChange)
    window.visualViewport?.addEventListener('scroll', viewportChange)
    return () => {
      reset()
      observer.disconnect()
      reposition.current = () => {}
      document.removeEventListener('pointerover', pointerOver)
      document.removeEventListener('pointerout', pointerOut)
      document.removeEventListener('focusin', focusIn)
      document.removeEventListener('focusout', focusOut)
      document.removeEventListener('keydown', keyDown)
      window.removeEventListener('scroll', viewportChange, true)
      window.removeEventListener('resize', viewportChange)
      window.visualViewport?.removeEventListener('resize', viewportChange)
      window.visualViewport?.removeEventListener('scroll', viewportChange)
    }
  }, [location.key])
  useLayoutEffect(() => { if (selection) reposition.current() }, [selection])
  return selection && createPortal(<div ref={panel} id="internal-link-preview" role="tooltip" className="link-preview" style={{ left: selection.x, top: selection.y, visibility: 'hidden' }}>
    {selection.record.thumbnail && <img src={`${import.meta.env.BASE_URL}${selection.record.thumbnail.slice(1)}`} alt="" />}
    <span className="link-preview-type">{selection.record.type}</span>
    <strong aria-hidden={selection.repeatTitle || undefined}>{selection.record.title}</strong>
    <p>{selection.record.excerpt}</p>
  </div>, document.querySelector('main') ?? document.body)
}
