import { lazy, Suspense } from 'react'
import { loadedLipidPath, preloadLipidPath } from './loader'
const Deferred=lazy(preloadLipidPath)
export function LipidPathRoute() {return <Suspense fallback={<main id="main-content" tabIndex={-1}><p role="status">Loading LipidPath…</p></main>}>{loadedLipidPath()??<Deferred/>}</Suspense>}
