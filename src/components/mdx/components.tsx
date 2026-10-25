import { useId, useRef, useState, isValidElement, Children, type ComponentProps, type ReactNode } from 'react'
import { safeContentUrl } from './urls'
import imageData from '../../generated/images.json'
import { Link } from 'react-router-dom'

export function ArticleLink({ href, target, rel, children, ...props }: ComponentProps<'a'>) {
  const safe = safeContentUrl(href)
  if (!safe) return <span>{children}</span>
  const external = /^https?:|^\/\//i.test(safe) && new URL(safe, 'https://simpyll.com').origin !== 'https://simpyll.com'
  const content = <>{children}{external && <span className="external-mark" aria-hidden="true"> ↗</span>}{target === '_blank' && <span className="sr-only"> (opens in a new tab)</span>}</>
  if (safe.startsWith('/') && !safe.startsWith('//') && target !== '_blank') return <Link {...props} to={safe}>{content}</Link>
  return <a {...props} href={safe} target={target} rel={target === '_blank' ? `${rel ?? ''} noopener noreferrer`.trim() : rel}>{content}</a>
}

function contentText(node: ReactNode): string {
  return Children.toArray(node).map(child => isValidElement<{ children?: ReactNode }>(child) ? contentText(child.props.children) : typeof child === 'string' || typeof child === 'number' ? String(child) : '').join(' ').replace(/\s+/g, ' ').trim()
}

export function RichTable({ children, ...props }: ComponentProps<'table'>) {
  const hint = useId()
  const heading = Children.toArray(children).find(child => isValidElement(child) && child.type === 'thead')
  const name = props['aria-label'] || `Article table${heading ? `: ${contentText(heading)}` : ''}`
  return <div className="rich-table"><p id={hint} className="table-hint">Scroll horizontally to read all columns.</p><div role="region" aria-label={name} aria-describedby={hint} tabIndex={0} className="table-scroll"><table {...props}>{children}</table></div></div>
}
export function TableHeader(props: ComponentProps<'th'>) { return <th scope="col" {...props} /> }

const variants = { note: 'Note', tip: 'Tip', information: 'Information', warning: 'Warning', important: 'Important' } as const
export type CalloutProps = { variant?: keyof typeof variants; title?: string; children?: ReactNode }
export function Callout({ variant = 'note', title, children }: CalloutProps) {
  const label = useId()
  // Runtime MDX can bypass TypeScript. Normalize label, icon and styling together.
  const resolved = Object.hasOwn(variants, variant) ? variant : 'note'
  const name = variants[resolved]
  const icons = {
    note: <path d="m4 16 1 4 4-1L20 8l-5-5L4 16Zm9-11 5 5M4 20h16" />,
    tip: <><path d="M9 18h6m-6 3h6M8 14a7 7 0 1 1 8 0c-1 1-1 2-1 3H9c0-1 0-2-1-3Z" /></>,
    information: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-10v1" /></>,
    warning: <><path d="m12 3 10 18H2L12 3Zm0 6v5m0 3v1" /></>,
    important: <><circle cx="12" cy="12" r="9" /><path d="M12 6v8m0 3v1" /></>,
  }

  return <aside role="note" className="article-callout" data-variant={resolved} aria-labelledby={label}><p className="callout-title" id={label}><svg className="callout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{icons[resolved]}</svg><span>{title ? `${name}: ${title}` : name}</span></p><div>{children}</div></aside>
}

export function CodeBlock({ children, ...props }: ComponentProps<'pre'>) {
  const pre = useRef<HTMLPreElement>(null)
  const [message, setMessage] = useState('')
  const language = isValidElement<{ className?: string }>(children) ? children.props.className?.match(/language-([\w+-]+)/)?.[1] : undefined
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pre.current?.textContent ?? '')
      setMessage('Copied code.')
    } catch { setMessage('Copy unavailable. Select the code to copy it.') }
  }
  return <div className="code-block"><div className="code-toolbar"><span>{language ?? 'Code'}</span><button type="button" onClick={copy} aria-label="Copy code">Copy</button></div><pre {...props} ref={pre} tabIndex={0}>{children}</pre><span role="status" className="copy-status">{message}</span></div>
}
export function InlineCode({ className, ...props }: ComponentProps<'code'>) {
  const language = className?.match(/language-([\w+-]+)/)?.[1]
  return <code {...props} className={className} data-language={language} />
}
type ImageVariant = { src: string; format: string; width: number; height: number }
type ImageEntry = { width: number; height: number; variants: ImageVariant[] }
const images: Record<string, ImageEntry> = imageData
export function ArticleImage({ src, alt = '', loading = 'lazy', decoding = 'async', sizes = '(max-width: 800px) calc(100vw - 32px), 768px', ...props }: ComponentProps<'img'>) {
  const safe = safeContentUrl(src, true)
  if (!safe) return <span>{alt || 'Image unavailable'}</span>
  const entry = images[safe.split(/[?#]/)[0]]
  if (!entry?.variants.length) return <img width={entry?.width} height={entry?.height} {...props} src={safe} alt={alt} loading={loading} decoding={decoding} />
  const set = (format: string) => entry.variants.filter(v => v.format === format).map(v => `${v.src} ${v.width}w`).join(', ')
  const fallback = entry.variants.filter(v => v.format === 'png').at(-1)!
  return <picture>{['avif', 'webp'].map(format => set(format) ? <source key={format} type={`image/${format}`} srcSet={set(format)} sizes={sizes} /> : null)}<img {...props} src={fallback.src} srcSet={set('png')} sizes={sizes} width={entry.width} height={entry.height} alt={alt} loading={loading} decoding={decoding} /></picture>
}
export function SemanticFigure(props: ComponentProps<'figure'>) { return <figure {...props} /> }
export function Caption(props: ComponentProps<'figcaption'>) { return <figcaption {...props} /> }
export function Figure({ src, alt, caption, width, height, loading, fetchPriority }: { loading?: ComponentProps<'img'>['loading']; fetchPriority?: ComponentProps<'img'>['fetchPriority']; imageName?: string; src: string; alt: string; caption?: ReactNode; width?: number; height?: number }) {
  return <figure><ArticleImage src={src} alt={alt} width={width} height={height} loading={loading} fetchPriority={fetchPriority} />{caption && <figcaption>{caption}</figcaption>}</figure>
}
export function Details(props: ComponentProps<'details'>) { return <details {...props} /> }
export function Summary(props: ComponentProps<'summary'>) { return <summary {...props} /> }
export function Disclosure({ title, children }: { title: string; children?: ReactNode }) {
  return <details><summary>{title}</summary><div>{children}</div></details>
}
/** Privacy-preserving extension point: links only; no third-party execution. */
export function Embed({ url, title }: { url: string; title: string }) {
  const safe = safeContentUrl(url)
  if (!safe || !/^https:\/\//i.test(safe)) return <p>Embed unavailable.</p>
  return <aside className="article-embed"><ArticleLink href={safe}>{title}</ArticleLink><p>Open the original resource to view this content.</p></aside>
}

