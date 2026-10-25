import { lazy, Suspense } from 'react'
import { loadedPulse, preloadPulse } from './loader'
const Deferred = lazy(preloadPulse)
export function PulseRoute() {
  return <Suspense fallback={<main id="main-content" tabIndex={-1}><p role="status">Loading Pulse…</p></main>}>{loadedPulse() ?? <Deferred />}</Suspense>
}
