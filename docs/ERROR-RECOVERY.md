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

Routes and MDX modules reuse the existing route boundary. Global search (#11),
the `/explore` search/filter page, and Projects/About are implemented. Search
handles loading, failure, empty results and retries within its own interface.
Client navigation to bundled articles remains usable offline; a new offline
document load depends on the browser cache. No service worker is introduced.

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

## Missing pages and GitHub Pages

Unknown routes and unknown article/project slugs render the existing `NotFound`.
`scripts/prerender.mjs` renders `/404` into `dist/404.html`; the existing Pages
workflow uploads all of `dist`. Pages serves that document with HTTP 404 for
unknown paths. React cannot choose an HTTP status for client navigation.
The preview middleware also serves the document with 404 for unknown route paths;
Vite dev mode is not a hosting-status test.

The static head contains one `noindex, follow` directive, no canonical and no
article structured data. The sitemap lists only valid public routes. Home,
Journal and Projects are native anchors in static HTML. Search links to the
existing `/explore` route; its live filtering requires JavaScript, but its
prerendered article links remain useful without it. Global search is unchanged.
No redirect converts a missing URL into a successful homepage response.

Header/footer route-dependent markup must match `/404` during hydration, then
update to the requested URL (see AGENTS.md). The fallback never echoes the URL.

Validate with `npm run build`, `node --test scripts/prerender.test.mjs` and
`npx playwright test missing-page`. For actual hosting status use
`curl -sS -o /tmp/404.html -w '%{http_code}\n' https://simpyll.com/a-nonexistent-path`
and inspect that document. Also check known article/project URLs return 200.
GitHub Pages controls statuses, redirects and propagation; local preview is
separate evidence from deployed HTTP verification.

Audit on October 25, 2026: production `/issue-39-nonexistent-audit` returned 404
with the prior custom heading and noindex. Before this change, static generation,
Home/Journal recovery and canonical omission already worked. Verified gaps were
missing Projects/page-level search links and focused no-JS/cross-browser recovery
coverage. The production response cannot verify this PR until it is deployed.
