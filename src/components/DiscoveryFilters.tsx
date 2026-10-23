import type { DiscoveryState } from '../lib/discovery'
type Option = { id: string; label: string }
export function DiscoveryFilters({ state, categories, tags, change }: {
  state: DiscoveryState; categories: Option[]; tags: Option[]; change: (state: DiscoveryState) => void
}) {
  return <div className="discovery-selectors">
    {([['Categories', 'categories', categories], ['Tags', 'tags', tags]] as const).map(([label, field, options]) => <details key={field} className="discovery-filter" onToggle={event => {
      if (event.currentTarget.open) for (const other of event.currentTarget.parentElement!.querySelectorAll('details')) {
        if (other !== event.currentTarget) other.open = false
      }
    }} onKeyDown={event => {
      if (event.key === 'Escape') { event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus() }
    }}>
      <summary>{label}{state[field].length ? ` (${state[field].length})` : ''}</summary>
      <fieldset><legend className="sr-only">{label}: match any selected</legend>
        {options.length ? options.map(option => <label key={option.id}>
          <input type="checkbox" checked={state[field].includes(option.id)} onChange={() => change({ ...state, [field]: state[field].includes(option.id) ? state[field].filter(id => id !== option.id) : [...state[field], option.id] })} />{option.label}
        </label>) : <p>No {label.toLowerCase()} available.</p>}
      </fieldset>
    </details>)}
    <div className="discovery-sort"><label htmlFor="discovery-sort">Sort articles</label><select id="discovery-sort" value={state.sort} onChange={event => change({ ...state, sort: event.target.value as DiscoveryState['sort'] })}>
      {state.q && <option value="relevance">Relevance</option>}<option value="newest">Newest first</option><option value="oldest">Oldest first</option>
    </select></div>
  </div>
}
