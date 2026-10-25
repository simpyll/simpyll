# Performance

Keep static content readable before JavaScript, preserve accessibility and reduced
motion, and optimize measured costs. Build duration, visitor performance, lab
measurements and field experience are different metrics.

## Targets and evidence

Field Core Web Vitals goals at the 75th percentile, mobile and desktop separately:
LCP ≤2.5s, INP ≤200ms, CLS ≤0.1. See [Web Vitals](https://web.dev/articles/vitals).
No real-user instrumentation or analytics is introduced. Field INP is unavailable
in this evaluation; TBT is a lab responsiveness proxy, never an INP measurement.
Use Search Console/CrUX when sufficient public traffic exists; do not infer a
field pass from lab results.

Lighthouse goals: mobile performance ≥90, desktop ≥95; accessibility, best
practices and SEO ≥95. Scores and timing remain advisory. Accessibility scores
supplement existing axe/keyboard tests and cannot establish WCAG conformance.
[Measurement evidence and limitations](performance/RESULTS.md) records actual
baseline/after results. Raw summary JSON retains per-profile metrics and resource
transfer, while individual Lighthouse HTML/JSON reports are CI artifacts.

## Hard resource gates

`performance-budgets.json` uses **bytes**, not KiB. Text is estimated gzip at level
9; raster images and fonts are raw (SVG uses gzip text). These are reproducible asset ceilings, not observed
HTTP transfer. Pages/CDNs choose their own compression. Lighthouse resource
summary reports observed transfer, including response overhead, separately.

| Limit | Bytes | Rationale |
|---|---:|---|
| Shared initial JS | 160,000 | baseline 155,649; optimized shared 147,931, modest growth |
| Per-page required JS | 180,000 | project shared + deferred code ~157,334; ~14% growth |
| Individual deferred JS chunk | 16,000 | measured project chunk ~9,400; bounded feature growth |
| CSS per page | 16,000 | baseline 13,310; final CSS 13,317 |
| Images per page | 1,650,000 | largest existing media page ~1,411,834 |
| Fonts per page | 32,768 | current 0; small explicit allowance, review new typography |
| Total without images | 240,000 | baseline maximum 197,034 (Explore) |
| Total with images | 1,900,000 | baseline media maximum 1,590,343 |
| Individual referenced image, raw | 1,600,000 | existing largest PNG 1,411,834 |
| Individual other asset, raw | 600,000 | baseline entry 541,275 |

The scanner follows Vite's entry/static/deferred manifest graph, applies the
explicit project-template entry mapping in `scripts/performance/route-assets.mjs`,
then inspects **all** prerendered application HTML, including recovery/legal pages.
It includes scripts, stylesheet/module preloads, stylesheet URL resources, images,
fonts and gzip HTML. Missing files, missing manifests and external resources fail
closed. Redirect-only documents have no application entry and are excluded.
Referenced assets are deduplicated per page. JS code loaded only after unrelated
interactions is classified as deferred, with individual hard ceilings.

Image accounting deliberately includes offscreen/lazy images and the largest
candidate per picture across alternative formats; every referenced variant is
inspected for missing files and individual limits, but alternatives are not summed.
Raster/font bytes are raw; SVG is gzip text. This is a conservative ceiling,
not a browser's viewport-specific selection. Original unused image sources and
unused generated variants are not charged to visitor transfer. Whole-site disk
size is not a useful page-weight budget. Client-only future fetches/third-party
integrations require extending the accounting; Lighthouse supplements static
inspection. The existing responsive image pipeline is preserved, not rebuilt.
The largest existing diagram has a 1.4 MB PNG fallback with smaller AVIF/WebP
variants already available; the budget conservatively charges the PNG. No LCP image is made lazy.

## Reproduce

```sh
npm ci
npx playwright install --with-deps chromium firefox webkit
npm run build                 # TypeScript, generation, SSR, budget hard gate
npm run perf:assets           # <1 second locally; reports offending asset/category
npm run test:performance      # synthetic violations, missing assets, graph/route tests
npm run perf:lighthouse       # serves existing dist on 4175; six routes × two profiles × three runs
PERF_RUNS=1 PERF_ROUTES=/ npm run perf:lighthouse  # bounded PR sample
PERF_ORIGIN=https://simpyll.com PERF_OUTPUT=artifacts/live npm run perf:lighthouse
npm run test:e2e:built
```

`CHROME_PATH` optionally selects a known Chrome executable. Default is the locked
Playwright Chromium. `PERF_OUTPUT` separates baseline/after runs. Routes come from
`dist/deployment.json` (homepage, index, alphabetically first published article,
Projects, published Simpyll study or first published study, About). Route selection
fails if a required template is absent; no temporary article slug is configured.
Run sequentially on an idle machine. Save SHA, browser/Lighthouse version and
settings from `runs.json`/`summary.json`; keep identical origin, browser, runner,
viewport and throttling for comparisons. Defaults use Lighthouse mobile simulated
throttling and its desktop dense-4G preset. Each navigation resets storage.

## CI and failure investigation

`npm run build` enforces deterministic budgets in PR and deployment builds.
No extra production build or browser install is added to the required path.
Performance unit tests run in the existing build job. All existing required
browser/accessibility/security gates retain their triggers and enforcement.

A separate performance job downloads the same run's immutable validated-build,
checks its SHA, uses the existing cached Chromium installation action and retains
reports for 14 days. PRs sample homepage mobile/desktop once; weekly/manual runs
measure all six templates three times. Both also collect a separate single-run
mobile/desktop observation of the production homepage, recording its deployed SHA
when available; this is not the candidate build and cannot measure its changes. It runs parallel to browser/fixture jobs
and is intentionally outside the required `validate` aggregate. Collection errors
make the performance job red; threshold misses emit advisory warnings. This keeps
broken collection visible without making variable scores required merge gates.

For a hard failure, inspect `artifacts/performance/assets.json`, the category,
resource list, route and manifest; measure the dependency/content change before
raising a ceiling. Never increase budgets solely to silence a failure. A deliberate
increase needs before/after evidence, reason and review in the same PR. For lab
warnings, download HTML and inspect LCP element, main-thread tasks and network;
repeat at least three times before acting. Promote a lab assertion to a required
gate only after multiple comparable CI runs demonstrate stable variance/headroom.

## Optimization and regression protection

Project case-study content now loads only on detail routes. Its small stylesheet
remains shared: splitting it added a render-blocking request and increased the
measured mobile case-study LCP by ~302ms in an intermediate audit. Server rendering
registers the synchronous component; direct client visits load it before hydration.
Prerendering adds that route's module preload from the manifest; shared CSS
preserves the original first-paint styling. SPA navigation uses an accessible Suspense status and
the existing route error boundary. Navigation focus waits for the deferred heading.
A delayed-chunk journey checks client routing, history, initial request avoidance,
direct loads and missing project URLs across the existing browser matrix.

Further article splitting requires separate metadata/content loading and a matching
SSR/hydration contract; it is not justified by today's already-strong lab scores.
Fonts already use system fallbacks and reveal animations use native compositor
properties with reduced-motion support. No speculative font/animation rewrite,
runtime monitoring dependency, invasive analytics or paid service is added.
