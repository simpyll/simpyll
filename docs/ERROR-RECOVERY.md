# Error recovery

The BrowserRouter/Routes architecture is unchanged. `AppContent` keys a class
error boundary by pathname around Routes. Header, route navigation, and footer
remain available after a route or MDX component throws. Changing pathname mounts
a fresh boundary; hash/query changes preserve its state and reading position.
One explicit retry remounts the failed subtree. A second failure offers a page
reload instead of unlimited retries. Recovery headings receive focus without
scrolling; successful retry focuses the restored page heading. Existing focus
styles, theme tokens, and responsive wrapping apply; recovery has no animation.

A second boundary in the client entry wraps the providers and router. Its minimal
fallback uses native links and reload, so it needs neither router context nor
Helmet. A failure within a boundary's own fallback propagates to its parent.
An application fallback failure cannot be caught by that same boundary.

Boundaries catch descendant render and React lifecycle/effect failures. They do
not catch rejected asynchronous promises, event-handler errors, module evaluation
failures before React mounts, or failed entry script downloads. Future async
features must explicitly handle request rejection, cancellation, bounded timeout,
empty success, and retry. Do not present request errors as empty results.

## Current feature audit

Routes and all MDX modules are synchronous/eager. There is no search UI/index,
project archive/detail/filter implementation (#53 remains separate), lazy route,
or live client API widget. Therefore there are no pending requests, rejected
request paths, or asynchronous loading states to implement or mock today. Do not
add Suspense loaders or connectivity banners around static content: once loaded,
client navigation to bundled articles works offline. A new offline document load
still depends on the browser cache; no service worker is introduced. Unknown
project paths use the wildcard 404, rather than implying an archive exists.

The journal and latest-writing section already explain when no articles exist.
Those legitimate empty states remain distinct from unknown slugs (NotFound) and
render failures (recovery). Missing modules/imports, invalid metadata, and MDX
syntax are build failures, not successful empty pages. Existing content validation,
Notion fixture builds, and prerender checks remain the build gates.

## Build and privacy

Server rendering does not catch errors in React error boundaries: failures still
abort prerendering. No browser API is used during render. Normal server/client
markup remains deterministic and no loader replaces prerendered content. Static
404 generation, noindex behavior, and Pages handling are preserved. Recovery
metadata marks failed client pages noindex; normal route metadata returns on
recovery/navigation.

Our reporter emits only the fixed category `route` or `application` to the local
console in development from componentDidCatch (not from render). It deliberately
accepts no error, URL, component stack, or request data. Production adds no custom
logging or telemetry; React/browser may emit their own framework diagnostics.
Future monitoring can be integrated at this one reporting point after a privacy
review. Visitor UI never interpolates exception contents.

## Validation

`tests/e2e/recovery.spec.ts` injects faults in intercepted JavaScript responses,
without production hooks, and tests recovery, bounded retry, route reset, shell
isolation, keyboard focus, mobile fit, missing resources, and offline static
navigation. Existing browser tests cover direct article loads, hydration, theme,
motion, and navigation. `npm test` includes content/Notion/prerender suites.
