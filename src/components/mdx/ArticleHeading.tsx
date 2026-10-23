import { useContext, useRef, useState, Children, isValidElement, type ComponentProps, type ReactNode } from 'react'
import { getSiteUrl } from '../../config/site'

import { ArticlePath } from './article-path'
function labelText(children: ReactNode): string {
  return Children.toArray(children).map(child => isValidElement<{ children?: ReactNode }>(child) ? labelText(child.props.children) : typeof child === 'string' || typeof child === 'number' ? String(child) : '').join('').replace(/\s+/g, ' ').trim()
}

/** IDs belong to the compiler; controls never generate or mutate them. */
export function ArticleHeading({ level, id, children, ...props }: ComponentProps<'h2'> & { level: 2 | 3 | 4 }) {
  const path = useContext(ArticlePath)
  const [status, setStatus] = useState('')
  const [failed, setFailed] = useState(false)
  const pending = useRef(false)
  const Heading = `h${level}` as 'h2' | 'h3' | 'h4'
  if (!id || !path) return <Heading {...props} id={id}>{children}</Heading>
  const fragment = `#${encodeURIComponent(id)}`
  const url = new URL(getSiteUrl(path))
  url.search = ''
  url.hash = fragment
  const title = labelText(children) || 'this'
  const copy = async () => {
    if (pending.current) return
    pending.current = true
    setStatus('')
    try {
      await navigator.clipboard.writeText(url.href)
      setFailed(false)
      setStatus('Link copied.')
    } catch {
      setFailed(true)
      setStatus('Could not copy automatically. Select the link below to copy it.')
    } finally { pending.current = false }
  }
  return <div className="heading-permalink">
    <Heading {...props} id={id}>{children}</Heading>
    <span className="heading-actions">
      <a href={fragment} aria-label={`Link to ${title} section`} title="Link to section">#</a>
      <button type="button" onClick={copy} aria-label={`Copy link to ${title} section`} title="Copy section link"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg></button>
    </span>
    <span role="status" data-active={!!status} className={`heading-feedback${failed ? ' copy-failed' : ''}`}><span className={failed ? 'sr-only' : undefined}>{status}</span>{failed && <input title="Automatic copy unavailable. Select this URL to copy it." aria-label={`Section URL for ${title}`} readOnly value={url.href} onFocus={event => event.currentTarget.select()} />}</span>
  </div>
}
export function Heading2(props: ComponentProps<'h2'>) { return <ArticleHeading {...props} level={2} /> }
export function Heading3(props: ComponentProps<'h3'>) { return <ArticleHeading {...props} level={3} /> }
export function Heading4(props: ComponentProps<'h4'>) { return <ArticleHeading {...props} level={4} /> }
