import { useState } from 'react'
import { Button } from './Button'

export function ArticleShare({ title, url }: { title: string; url: string }) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function copy() {
    setMessage('')
    try {
      await navigator.clipboard.writeText(url)
      setMessage('Link copied.')
    } catch {
      setMessage('Could not copy the link. Select and copy the article URL below.')
    }
  }

  async function share() {
    setMessage('')
    setBusy(true)
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title, url })
        setMessage('Article shared.')
      } else {
        await copy()
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') setMessage('Sharing canceled.')
      else setMessage('Could not share the article. Try Copy link below.')
    } finally {
      setBusy(false)
    }
  }

  return <section aria-label="Share this article" className="article-share print:hidden mt-6">
    <div className="flex flex-wrap gap-4">
      <Button variant="secondary" onClick={share} disabled={busy}>Share article</Button>
      <Button variant="secondary" onClick={copy} disabled={busy}>Copy link</Button>
    </div>
    <p role="status" aria-live="polite" className="mt-4 text-sm text-muted">{message}</p>
    {message.startsWith('Could not copy') && <label className="block text-sm text-muted">Article URL
      <input className="mt-2 block w-full border border-outline bg-surface p-6 text-foreground" readOnly value={url} onFocus={event => event.currentTarget.select()} />
    </label>}
  </section>
}
