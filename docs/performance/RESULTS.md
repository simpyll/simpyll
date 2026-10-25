# Measurement evidence — issue #46

Baseline application: main `43fb8cd4bda16b037a04b37ec0dabf9525af1f6b`.
Measured October 24, 2026 (America/Chicago). Linux x64 container, Node 24.22.1,
Lighthouse 13.5.0, Chromium Headless Shell 141.0.7390.37. The repository's pinned
Chromium 156 download returned invalid archives in this environment, so both
local before/after series use the same explicitly selected available browser.
This is a lab comparison, not production field data or pinned CI browser proof.

Baseline: six representative routes, mobile and desktop, three runs each.
`lighthouse-before.json` contains median results; `lighthouse-before-runs.json`
contains individual samples, CPU/network/viewport settings and browser UA.
Local Vite preview does not simulate GitHub Pages CDN compression/caching.
`assets-before.json` contains deterministic gzip/resource accounting. Baseline
manifest generation changes observability only, not application delivery.

Production measurement was attempted with Lighthouse against https://simpyll.com;
collection failed with net::ERR_EMPTY_RESPONSE in this container. HTTP fetch of
`deployment.json` succeeded but identified older revision
`3fe55d5ab08d924f5f71a6f8b3315bc67baedffa` during the in-progress deployment.
Neither is a valid production performance baseline. No field INP/CrUX dataset
was obtained. These limitations remain explicit; production claims are withheld.

## Before/after

After results and CI evidence are added after validation. Do not interpret pending
measurements as passed checks. Baseline mobile median performance is 99–100;
desktop is 100 for all six routes. There is little score headroom; the verified
optimization is smaller delivery to unrelated pages, not a claimed score gain.

## CI baseline

Comparable recent successful PR [40152205480](https://github.com/simpyll/simpyll/actions/runs/40152205480):
created 01:50:54Z, final job completed 01:56:52Z = **358 seconds** wall time.
Build job 55s; production build step 10s; production artifact upload 3s.
Slowest browser shard 294s including browser setup 85s, npm ci 7s and tests 190s.
Fixture job 80s. Critical path: build → browser(2) → validate, with queue/handoffs.
One run is not a median; it supplies a same-architecture reference after #133/#77.
The PR performance sample is intentionally bounded to two Lighthouse navigations
in a separate parallel job. Full audits run weekly/manual, outside the required
gate. Actual added runtime and critical-path effects require this PR's completed
Actions run; no projected savings are reported as measured results.
