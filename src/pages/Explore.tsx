import { useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DiscoveryData } from '../lib/discovery-data'
import { Container } from '../components/Container'
import { SEO } from '../components/SEO'
import { ArticleCard } from '../components/ArticleCard'
import { DiscoveryFilters } from '../components/DiscoveryFilters'
import { defaultState, parseDiscovery, prepareDiscovery, serializeDiscovery, taxonomy, type DiscoveryRecord, type DiscoveryState } from '../lib/discovery'
import { loadIndex, seedIndex } from '../lib/search-index'
const emptyIndex: DiscoveryRecord[] = []
const subscribe = () => () => {}

export function Explore() {
  const initial = useContext(DiscoveryData)
  const [loaded, setLoaded] = useState<DiscoveryRecord[] | null>(initial)
  const [failed, setFailed] = useState(false)
  const index = loaded ?? emptyIndex
  const discover = useMemo(() => prepareDiscovery(index), [index])
  const categories = useMemo(() => taxonomy(index, 'category'), [index])
  const tags = useMemo(() => taxonomy(index, 'tags'), [index])
  const [params, setParams] = useSearchParams()
  // The prerendered shell and first hydration render must agree for query URLs.
  // useSyncExternalStore applies the real URL before painting hydrated controls.
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false)
  const state = useMemo(() => parseDiscovery(hydrated ? params : new URLSearchParams()), [params, hydrated])
  const [draft, setDraft] = useState<{ text: string; source: string } | null>(null)
  const current = serializeDiscovery(state)
  const input = draft?.source === current ? draft.text : state.q
  const results = useMemo(() => discover(state), [state, discover])
  const change = (next: DiscoveryState, replace = false) => {
    setDraft(null)
    setParams(serializeDiscovery(next), { replace, preventScrollReset: true })
  }
  useEffect(() => {
    if (initial) { seedIndex(initial); return }
    let disposed = false
    void loadIndex().then(data => { if (!disposed) setLoaded(data) }).catch(() => { if (!disposed) setFailed(true) })
    return () => { disposed = true }
  }, [initial])
  useEffect(() => {
    if (!draft || draft.source !== current) return
    const timer = setTimeout(() => {
      const next = parseDiscovery(new URLSearchParams(serializeDiscovery({ ...state, q: draft.text, sort: state.q ? state.sort : 'relevance' })))
      setParams(serializeDiscovery(next), { replace: true, preventScrollReset: true })
      setDraft(null)
    }, 300)
    return () => clearTimeout(timer)
  }, [draft, current, state, setParams])
  useEffect(() => {
    if (hydrated && params.toString() !== current) setParams(current, { replace: true, preventScrollReset: true })
  }, [hydrated, params, current, setParams])
  const label = (value: string, options: typeof tags) => options.find(option => option.id === value)?.label ?? value
  const active = !!(state.q || state.tags.length || state.categories.length || state.sort !== 'newest')
  return <>
    {initial && <script id="discovery-index" type="application/json" dangerouslySetInnerHTML={{ __html: JSON.stringify(initial).replace(/</g, '\\u003c') }} />}
    <SEO title="Explore articles" description="Search the learning journal and explore articles by category and tag." path="/explore" robots={current ? "noindex,follow" : undefined} />
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-canvas text-foreground">
      <Container><section className="pb-10 pt-24 sm:pt-32">
        <p className="mb-6 text-xs font-medium uppercase tracking-eyebrow text-accent">Learning in public</p>
        <h1 className="font-display text-5xl font-semibold tracking-display sm:text-7xl">Explore<span className="text-accent">.</span></h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">Find a thought, follow a topic, or discover something new in the learning journal.</p>
      </section>
      <section aria-label="Discover articles" className="discovery-controls">
        <form role="search" onSubmit={event => { event.preventDefault(); change({ ...state, q: input, sort: state.q ? state.sort : 'relevance' }) }}>
          <div className="discovery-control-heading"><label htmlFor="discovery-query" className="text-sm text-muted">Search the journal</label>
            <button type="button" className="discovery-reset" style={{ visibility: active ? 'visible' : 'hidden' }} disabled={!active} onClick={() => { document.getElementById('discovery-query')?.focus(); change(defaultState) }}>Clear filters</button></div>
          <div className="discovery-query"><input id="discovery-query" type="search" maxLength={160} placeholder="Search articles, topics, and technologies…" value={input}
            onChange={event => setDraft({ text: event.target.value, source: current })} />
            <button type="button" disabled={!input} onClick={() => { document.getElementById('discovery-query')?.focus(); change({ ...state, q: '', sort: state.sort === 'relevance' ? 'newest' : state.sort }) }}>Clear search</button></div>
        </form>
        <DiscoveryFilters state={state} categories={categories} tags={tags} change={next => change({ ...next, q: input })} />
        <p className="mt-3 text-xs text-muted">Match any selected category and any selected tag, together with your search.</p>
        <div className="discovery-chips" role="group" aria-label="Active filters">
          {state.q && <button onClick={() => { document.getElementById('discovery-query')?.focus(); change({ ...state, q: '', sort: state.sort === 'relevance' ? 'newest' : state.sort }) }} aria-label={`Remove search: ${state.q}`}>Search: {state.q} ×</button>}
          {(['categories', 'tags'] as const).flatMap(field => state[field].map(value => <button key={`${field}:${value}`} aria-label={`Remove ${field === 'tags' ? 'tag' : 'category'}: ${label(value, field === 'tags' ? tags : categories)}`}
            onClick={() => { document.getElementById('discovery-query')?.focus(); change({ ...state, [field]: state[field].filter(id => id !== value) }) }}>{field === 'tags' ? 'Tag' : 'Category'}: {label(value, field === 'tags' ? tags : categories)} ×</button>))}
        </div>
      </section>
      <section aria-label="Article results" className="pb-24">
        <p role="status" aria-live="polite" aria-atomic="true" className="py-6 text-sm text-muted">{failed ? 'Articles could not load. Please retry.' : !loaded ? 'Loading articles…' : `${results.length} article${results.length === 1 ? '' : 's'} found.`}</p>
        <div className="discovery-results">{failed ? <div className="discovery-empty"><h2>Articles are temporarily unavailable.</h2><button className="min-h-11 text-accent" onClick={() => { setFailed(false); void loadIndex().then(data => setLoaded(data)).catch(() => setFailed(true)) }}>Retry loading articles</button></div> : !loaded ? <p>Loading the journal…</p> : results.length ? results.map(article => <ArticleCard key={article.id} article={article} />) : <div className="discovery-empty">
          <h2 className="text-2xl font-semibold">{index.length ? 'No articles matched your search and filters.' : 'No published articles yet.'}</h2>
          <p className="mt-3 text-muted">{index.length ? 'Try another search or remove a filter above.' : 'Check back soon for new writing.'}</p>
          {active && <button className="mt-5 text-accent" onClick={() => { document.getElementById('discovery-query')?.focus(); change(defaultState) }}>Show all articles</button>}
        </div>}</div>
      </section></Container>
    </main>
  </>
}
