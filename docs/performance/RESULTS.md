# Measurement evidence — issue #46

Baseline application: main `43fb8cd4bda16b037a04b37ec0dabf9525af1f6b`.
Measured October 24, 2026 (America/Chicago). Linux x64 container, Node 24.22.1,
Lighthouse 13.5.0, Chromium Headless Shell 141.0.7390.37. The repository's pinned
Chromium 156 download returned invalid archives in this environment. Both local
series use the same explicitly selected available browser; pinned Chromium,
Firefox and WebKit validation runs separately in GitHub Actions.

Six representative routes × mobile/desktop × three runs per series. Individual
samples, CPU/network/viewport settings, browser UA and medians are retained in
`lighthouse-before[-runs].json` and `lighthouse-after[-runs].json`. The after source
snapshot is local commit `85a49ae` (same application code as the final PR); its
recorded build identity was regenerated after commit. Budget-accounting refinements
and documentation do not change application output. JSON artifacts identify the
precise versions/settings; local preview does not reproduce Pages CDN behavior.
Shared-container load varies; the final after series ran sequentially with no
concurrent local validation. These are measured
observations, not statistically established latency gains or real-user percentiles.

## Before/after lab medians

Values are before → after. LCP/TBT are milliseconds; CLS is unitless.

| Route | Profile | Performance /100 | LCP ms | CLS | TBT ms |
|---|---|---:|---:|---:|---:|
| `/` | mobile | 99 → 99 | 1656.0 → 1657.2 | 0.0156 → 0.0156 | 12.0 → 7.5 |
| `/` | desktop | 100 → 100 | 405.0 → 405.5 | 0.0048 → 0.0048 | 0.0 → 0.0 |
| `/blog` | mobile | 99 → 99 | 1658.0 → 1655.8 | 0.0156 → 0.0156 | 7.5 → 12.0 |
| `/blog` | desktop | 100 → 100 | 407.5 → 408.6 | 0.0048 → 0.0048 | 0.0 → 0.0 |
| `/blog/001-python-fundamentals` | mobile | 99 → 99 | 1655.9 → 1654.5 | 0.0156 → 0.0156 | 14.5 → 32.0 |
| `/blog/001-python-fundamentals` | desktop | 100 → 100 | 405.0 → 405.6 | 0.0048 → 0.0048 | 0.0 → 0.0 |
| `/projects` | mobile | 99 → 99 | 1655.9 → 1655.4 | 0.0156 → 0.0156 | 33.0 → 6.5 |
| `/projects` | desktop | 100 → 100 | 405.0 → 404.5 | 0.0048 → 0.0048 | 0.0 → 0.0 |
| `/projects/simpyll` | mobile | 99 → 98 | 1654.1 → 1805.6 | 0.0156 → 0.0156 | 3.0 → 0.0 |
| `/projects/simpyll` | desktop | 100 → 100 | 405.3 → 443.9 | 0.0048 → 0.0048 | 0.0 → 0.0 |
| `/about` | mobile | 99 → 99 | 1655.0 → 1655.7 | 0.0156 → 0.0156 | 1.5 → 7.5 |
| `/about` | desktop | 100 → 100 | 408.6 → 405.5 | 0.0048 → 0.0048 | 0.0 → 0.0 |

The case-study mobile score moves 99 → 98 and LCP ~1.65 → ~1.81s. This is an
explicit tradeoff for deferring its content on other routes, not a claimed LCP
improvement. All measured medians remain within the documented lab goals. An
intermediate split of its CSS raised mobile LCP to ~1.96s; retaining shared CSS
avoids that extra blocking request. Removing route preloads in an additional
three-run experiment did not materially improve LCP (~1.805s), so preloads remain.

| Route (mobile) | FCP ms | Speed Index ms | JS execution ms | Observed total transfer bytes |
|---|---:|---:|---:|---:|
| `/` | 1656.0 → 1657.2 | 1656.0 → 1657.2 | 122.6 → 116.4 | 176,248 → 168,518 |
| `/blog` | 1658.0 → 1655.8 | 1658.0 → 1655.8 | 127.1 → 127.5 | 175,821 → 168,093 |
| `/blog/001-python-fundamentals` | 1655.9 → 1654.5 | 1655.9 → 1654.5 | 130.9 → 138.8 | 179,087 → 171,357 |
| `/projects` | 1655.9 → 1655.4 | 1655.9 → 1655.4 | 155.3 → 122.0 | 177,379 → 169,650 |
| `/projects/simpyll` | 1654.1 → 1805.6 | 1654.1 → 1805.6 | 103.1 → 99.4 | 178,153 → 180,390 |
| `/about` | 1655.0 → 1655.7 | 1655.0 → 1655.7 | 103.2 → 126.2 | 177,340 → 169,610 |

Resource-summary JSON also retains observed JS, CSS, image and font transfer for
every route/profile. INP is **not measured**; lab TBT is not INP. Accessibility,
best-practices and SEO scores remain diagnostic, not conformance evidence.

## Deterministic delivery comparison

| Metric | Before bytes | After bytes | Change |
|---|---:|---:|---:|
| Shared initial JS (gzip) | 155,649 | 147,931 | -7,718 (-4.96%) |
| Project total required JS (gzip) | 155,649 | 157,334 | +1,685 (+1.08%) |
| CSS (gzip) | 13,310 | 13,317 | +7 (+0.05%) |
| Homepage estimated total | 174,448 | 166,741 | -7,707 (-4.42%) |
| Project estimated total | 176,355 | 178,108 | +1,753 (+0.99%) |

The ~7.7 KB gzip shared-JS reduction applies to all non-detail routes. Each detail
route additionally loads a 9,403-byte gzip chunk. The deferred content remains
synchronously prerendered; initial hydration preloads it. No design, fonts, images,
animations or accessibility features are removed. Build accounting is estimated
gzip text plus raw raster/font bytes, distinct from observed HTTP transfer.

## Production observation

The container's production Lighthouse attempt failed with `net::ERR_EMPTY_RESPONSE`.
A subsequent real GitHub runner audit succeeded against deployed SHA
`43fb8cd4bda16b037a04b37ec0dabf9525af1f6b`, separately from the candidate build.
Ubuntu 24.04 x64, Node 24.21.0, Lighthouse 13.5.0, pinned Chromium 156.0.8078.4;
[run 40153967822](https://github.com/simpyll/simpyll/actions/runs/40153967822),
artifact `lighthouse-performance` (ID 12584490163). `production[-runs].json`
retains metrics/settings. One run per profile is an observation, not a median:

| Profile | Performance | LCP ms | CLS | TBT ms | Total transfer bytes |
|---|---:|---:|---:|---:|---:|
| mobile | 100 | 982.6 | 0.0156 | 63.0 | 188,849 |
| desktop | 100 | 369.7 | 0.0048 | 0.0 | 188,514 |

No deployment was made. There is no production-after measurement of this PR.
Field INP/CrUX data is unavailable in this evaluation; no real-user pass is claimed.

## CI impact

Compare [baseline 40152205480](https://github.com/simpyll/simpyll/actions/runs/40152205480)
and [implementation 40153967822](https://github.com/simpyll/simpyll/actions/runs/40153967822).
These are individual real runs, not medians, and their image-cache states differ.

| Operation | Before | Implementation (cold image cache) | Change |
|---|---:|---:|---:|
| PR wall, created → last job complete | 358s | 417s | +59s (+16.5%) |
| Primary build step | 10s | 66s | +56s |
| Build job | 55s | 109s | +54s |
| Slowest browser job | 294s | 279s | −15s |
| Fixture job | 80s | 83s | +3s |
| Parallel performance job | none | 84s | +84 runner-seconds |
| Local-build Lighthouse step | none | 18s | +18s in parallel |
| Production Lighthouse step | none | 17s | +17s in parallel |
| Performance browser setup | none | 24s | +24s in parallel |
| Lighthouse artifact upload | none | 2s | +2s in parallel |
| Production artifact upload | 3s | 2s | −1s |

The critical path remains **build → slowest browser → validate**. Performance
finishes ~3 minutes before the browser gate; it does not extend that path in this
run. The one-time lockfile change invalidated the exact image cache and caused
cold transforms, explaining most of the +56s build difference. Do not attribute
that one-run wall regression to Lighthouse or claim a speedup. New budget tests
round to 0s in Actions; a local full asset audit took 0.150s. The final warm run
and exact final-revision validation links/timing are recorded in the PR body to
avoid rerunning CI solely to update its own timing document.

## Validation and limitations

Local TypeScript/production build, prerendering, ESLint, resource gates and all
191 Node tests passed, including real mutated-content publishing fixtures. The
five-test Chromium smoke passed. A broader alternate-Chromium run passed 464,
skipped six existing fixture-only tests and timed out in two pre-hydration
`document.fonts.ready` waits. Those results are not described as a full local pass.
The repository-pinned Actions run above passed every required build, fixture,
three browser-shard and accessibility gate: 567 browser tests passed, with six
existing fixture-only skips, plus both Lighthouse observations.
Final-revision CI must also pass before review readiness.

No field INP or full WCAG-conformance claim. No lab score is a merge-blocking
threshold yet. Browser/runner variance and a single production observation limit
conclusions; compare repeated like-for-like runs before promoting lab gates.
Follow-ups: collect warm CI medians, repeat production audits from a stable runner,
review article-content splitting only if bundle growth warrants its SSR complexity,
and use sufficient Search Console/CrUX data before making real-user claims.
