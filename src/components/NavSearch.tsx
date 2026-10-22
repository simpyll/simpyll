import { useEffect, useId, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { normalize, prepareSearch, type SearchDocument } from '../lib/search'

let cached: SearchDocument[] | undefined
let pending: Promise<SearchDocument[]> | undefined
function loadIndex() {
  if (cached) return Promise.resolve(cached)
  return pending ??= fetch(`${import.meta.env.BASE_URL}search-index.json`, { cache: 'no-cache' }).then(async response => {
    if (!response.ok) throw new Error('Search unavailable')
    const data: unknown = await response.json()
    if (!Array.isArray(data) || !data.every(item => typeof item.slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug)
      && ['title', 'description', 'category', 'body'].every(key => typeof item[key] === 'string') && Array.isArray(item.tags) && item.tags.every((tag: unknown) => typeof tag === 'string'))) throw new Error('Invalid index')
    return cached = data
  }).finally(() => { pending = undefined })
}

function Match({ text, query }: { text: string; query: string }) {
  const terms = normalize(query).split(' ').filter(Boolean)
  return <>{text.split(/(\s+)/u).map((part, index) => terms.some(term => normalize(part).startsWith(term))
    ? <mark key={index}>{part}</mark> : part)}</>
}

export function NavSearch({ open, onOpenChange }: { open: boolean; onOpenChange: Dispatch<SetStateAction<boolean>> }) {
  const location = useLocation()
  const navigate = useNavigate()
  const input = useRef<HTMLInputElement>(null)
  const control = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLElement>(null)
  const [query, setQuery] = useState('')
  const [documents, setDocuments] = useState<SearchDocument[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [selected, setSelected] = useState(-1)
  const id = useId()
  const search = useMemo(() => prepareSearch(documents), [documents])
  const results = useMemo(() => search(query), [search, query])
  const route = useRef(location.key)
  useEffect(() => {
    if (route.current === location.key) return
    route.current = location.key
    onOpenChange(false)
    setQuery('')
    setSelected(-1)
  }, [location.key, onOpenChange])
  useEffect(() => {
    if (!open) return
    input.current?.focus({ preventScroll: true })
    let disposed = false
    void loadIndex().then(data => { if (!disposed) { setDocuments(data); setStatus('ready') } })
      .catch(() => { if (!disposed) setStatus('error') })
    return () => { disposed = true }
  }, [open])
  useEffect(() => {
    if (!open) return
    const dismiss = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      onOpenChange(false); setQuery(''); setSelected(-1); control.current?.focus({ preventScroll: true })
    }
    document.addEventListener('keydown', dismiss)
    return () => document.removeEventListener('keydown', dismiss)
  }, [open, onOpenChange])
  useEffect(() => {
    if (selected >= 0) document.getElementById(`${id}-${selected}`)?.scrollIntoView({ block: 'nearest' })
  }, [selected, id])
  useEffect(() => {
    if (!open) return
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (!panel.current) return
        const viewport = window.visualViewport
        const bottom = viewport ? viewport.offsetTop + viewport.height : innerHeight
        panel.current.style.setProperty('--search-available-height', `${Math.max(80, bottom - panel.current.getBoundingClientRect().top - 16)}px`)
      })
    }
    const viewport = window.visualViewport
    viewport?.addEventListener('resize', update)
    viewport?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    update()
    return () => { cancelAnimationFrame(frame); viewport?.removeEventListener('resize', update); viewport?.removeEventListener('scroll', update); window.removeEventListener('resize', update) }
  }, [open])
  const close = () => { onOpenChange(false); setQuery(''); setSelected(-1); control.current?.focus({ preventScroll: true }) }
  const choose = (result: SearchDocument) => { onOpenChange(false); setQuery(''); setSelected(-1); navigate(`/blog/${result.slug}`) }
  const message = status === 'loading' ? 'Loading search…' : status === 'error' ? 'Search is unavailable. Close and reopen to retry.'
    : !query.trim() ? 'Search articles, topics, and technologies.' : results.length ? `${results.length} result${results.length === 1 ? '' : 's'}` : 'No matching articles.'
  return <>
    <div className="nav-search-field" data-open={open} inert={!open} aria-hidden={!open}>
      <input ref={input} type="search" maxLength={160} role="combobox" aria-label="Search articles" placeholder="Search articles, topics, and technologies…"
        aria-expanded={open} aria-controls={`${id}-results`} aria-autocomplete="list" aria-activedescendant={selected >= 0 && results[selected] ? `${id}-${selected}` : undefined}
        value={query} onChange={event => { setQuery(event.target.value); setSelected(-1) }}
        onKeyDown={event => {
          if (event.key === 'Escape') { event.preventDefault(); close() }
          if (['ArrowDown', 'ArrowUp'].includes(event.key) && results.length) {
            event.preventDefault(); setSelected(value => value < 0 ? (event.key === 'ArrowDown' ? 0 : results.length - 1) : (value + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length)
          }
          if (event.key === 'Enter' && results.length) { event.preventDefault(); choose(results[selected < 0 ? 0 : selected]) }
        }} />
    </div>
    <button ref={control} type="button" className="nav-search-control" aria-label={open ? 'Close search' : 'Open search'}
      aria-expanded={open} aria-controls={`${id}-panel`} onClick={() => {
        if (open) { setQuery(''); setSelected(-1); control.current?.focus({ preventScroll: true }) }
        else setStatus(cached ? 'ready' : 'loading')
        onOpenChange(value => !value)
      }}>
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        {open ? <path d="m6 6 12 12M6 18 18 6" /> : <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>}
      </svg>
    </button>
    <section ref={panel} id={`${id}-panel`} className="search-panel" hidden={!open} aria-label="Article search results"
      onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); close() } }}>
      <p role="status" className="search-status">{message}</p>
      <ul id={`${id}-results`} role="listbox" aria-label="Matching articles">
        {status === 'ready' && results.map((result, index) => <li key={result.slug} id={`${id}-${index}`} role="option" aria-selected={selected === index}
          className="search-result" onPointerMove={() => setSelected(index)} onPointerDown={event => event.preventDefault()} onClick={() => choose(result)}>
          <span className="search-category">{result.category}</span><strong><Match text={result.title} query={query} /></strong>
          <span><Match text={result.description || result.body.slice(0, 150)} query={query} /></span>
          {result.tags.length > 0 && <small>{result.tags.slice(0, 3).join(' · ')}</small>}
        </li>)}
      </ul>
    </section>
  </>
}
