# CI timing evidence — #133

Baseline source: GitHub Actions runs/jobs REST timestamps, collected October 24,
2026 before edits; raw reduced timing data is in [baseline.json](baseline.json).
Wall = created_at to final job completed_at, not updated_at (which includes API
bookkeeping). Critical execution span excludes initial queue but includes handoffs.
Step times have GitHub's one-second precision; per-step medians need not sum to a
median run. Logs for job 120999421232 confirm 476 passed / six existing fixture-only
skips, pinned three-engine install, npm cache hit and a 43,196,828-byte successful
report upload. Failed runs are evidence for diagnosis, excluded from success medians.

## Baseline samples

| Workflow | Successful run IDs, newest first | Median wall | Initial queue | Execution span |
|---|---|---:|---:|---:|
| PR validation | 40136629734, 40136301201, 40135762399, 40133597837, 40132049016 | 705s | 3s | 703s |
| Pages | 40134824212, 40132809207, 40126182895, 40120612464, 40119155356 | 640s | 2s | 638s |
| Publisher | 40123280334, 40112891760, 40098033238, 40081448622, 40064513279 | 32s | 2s | 30s |
| Availability | 40132117529, 40109813984, 40089150542, 40063710797, 40027276114 | 23s | 2s | 21s |

Run URLs: `https://github.com/simpyll/simpyll/actions/runs/<ID>`.
Failed PRs also collected: 40131411776, 40130770096, 40129283601.
Publisher failure 40134808239 was inspected in the run listing, not counted as
successful publishing work. No-change publishing is distinct from content deploys.

The latest **three** comparable successful PRs include #43's added Firefox/WebKit
coverage: wall 739/725/705s (median **725s**), browser 413/401/403s (median **403s**).
Older PRs and all five sampled completed Pages builds predate that expansion.
Do not claim browser speedup by comparing a smaller old inventory to the new one.
Five same-inventory PR baselines were not yet available at collection time.

| Baseline operation | PR median (five mixed-inventory runs) | Pages median (five) |
|---|---:|---:|
| npm ci | 6s | 5s build + 5s verify |
| Primary production build | 91s | 75s |
| Project fixture build/checks | 93s | 94s |
| Lint | 5s | 5s |
| Smoke unit checks | 12s | 12s |
| Browser journeys | 401s | 207s (older inventory) |
| Three-engine installation | 55s (three recent PRs) | not in these older samples |
| Notion fixture build/checks | 17s | 37.5s across build/verify steps |
| Rich MDX fixtures | 20s | 19s |
| Deployment action | n/a | 6s |

All individual step durations, artifact handling, setup, test and deployment
job timestamps are retained in the JSON, including zero-duration steps. PR
critical path is a single serial job; Pages is build → deploy → verify.

## Verified bottlenecks and decisions

- Browser execution dominates after #43. Three native shards keep the same tests,
  two workers each and independent servers/runners, rather than increasing CPU
  contention on one machine. This costs extra runner-minutes/setup/artifact transfer.
- Project fixture executes before main generation; both cold-build images. Move
  it after generation and hand off optimized images with the same-run artifact.
  Project, Notion and rich MDX builds remain essential mutated-input integration
  coverage. Main is built once per workflow; never reused from another commit.
- npm cache already hits and installs cost only ~6s. Keep npm ci; caching
  node_modules would add risk and little benefit.
- Browser installs cost 42–59s with all engines. Exact version-aware binary cache
  is introduced; system libraries still installed. Measure restoration overhead
  separately before claiming a benefit. Fixture/production verification jobs use
  Chromium only because their tests do not use the other engines.
- Successful PR report upload transferred ~43MB. Keep failure diagnostics; avoid
  successful report uploads. Build artifact is immutable and short-lived.
- Content generator dependencies stay serial: projects/redirects/content/images →
  search/sitemap → client/typecheck → server → prerender → release manifest.
  Tiny repeated project validation in standalone client/server scripts remains to
  protect direct invocations. No persistent generated-output cache or concurrent
  writes to generated manifests. Image generator validates source hashes and files.
- Publishing rebuild after committing is intentional: the deploy manifest must
  identify the final content commit; verify also retains its prior Notion test.
  No privileged PR artifacts are consumed by deployment.

## Before/after

After measurements will be appended from completed optimized Actions runs. No
forecast is a measurement, and no 30% claim is made before those runs complete.

| Metric | Before | After | Improvement |
|---|---:|---:|---:|
| Typical PR wall, same browser inventory | 725s (3 runs) | pending CI | pending |
| PR critical execution span | 722s (3 runs) | pending CI | pending |
| Primary production build | 91s | pending CI | pending |
| Dependency install | 6s | pending CI | pending |
| Browser execution | 403s (3 runs) | pending CI | pending |
| Main/deploy wall (older inventory) | 640s (5 runs) | requires post-merge observation | not comparable yet |

Formula: `(before - after) / before * 100`. Use end-to-end completion including
all shards, fixtures and final gate, not only the fastest shard. Cache hit/miss
must be established from logs, not assumed from first/second run labels.
Production deployment cannot be measured on the new workflow without merging or
publishing; this PR deliberately does neither. Preserve that limitation if #133
remains open for post-merge measurement. Actual admin branch-protection settings
are not available via the unauthenticated REST endpoint (401); existing context
names are preserved and aggregate gate behavior tested.
