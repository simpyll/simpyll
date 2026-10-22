import { Component, useEffect, useRef, type ReactNode } from 'react'

type Props = { children: ReactNode; scope: 'application' | 'route' }
type State = { failed: boolean; retried: boolean }

/** No error objects, URLs, content, or component stacks leave this module. */
function reportFailure(scope: Props['scope']) {
  if (import.meta.env.DEV) console.warn(`[Simpyll] ${scope} render failure`)
}

function Recovery({ scope, retry }: { scope: Props['scope']; retry?: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus({ preventScroll: true }) }, [])
  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-canvas px-6 py-32 text-foreground">
      <title>Something went wrong | Simpyll</title>
      <meta name="robots" content="noindex" />
      <div className="mx-auto max-w-3xl">
        <h1 ref={heading} tabIndex={-1} className="text-4xl font-semibold">Something went wrong.</h1>
        <p className="mt-6 text-muted">
          {scope === 'route' ? 'This page could not be displayed. You can try again or visit another page.' : 'The site could not be displayed. Reload the page or return home.'}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-6">
          {retry && <button type="button" className="ui-button ui-button--primary" onClick={retry}>Try again</button>}
          {!retry && <button type="button" className="ui-button ui-button--primary" onClick={() => window.location.reload()}>Reload page</button>}
          <a href="/" className="text-accent hover:underline">Go home</a>
          <a href="/blog" className="text-accent hover:underline">Read the journal</a>
        </div>
      </div>
    </main>
  )
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false, retried: false }

  static getDerivedStateFromError(): Partial<State> { return { failed: true } }

  componentDidCatch() { reportFailure(this.props.scope) }

  componentDidUpdate(_previousProps: Props, previousState: State) {
    if (previousState.failed && !this.state.failed) {
      const heading = document.querySelector<HTMLElement>('main h1')
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }) }
    }
  }

  render() {
    if (this.state.failed) {
      const retry = this.props.scope === 'route' && !this.state.retried
        ? () => this.setState({ failed: false, retried: true })
        : undefined
      return <Recovery key={this.state.retried ? 'retried' : 'initial'} scope={this.props.scope} retry={retry} />
    }
    return this.props.children
  }
}
