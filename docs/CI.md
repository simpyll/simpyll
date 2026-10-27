# CI performance and validation

Current policy: October 27, 2026. This supersedes older present-tense tier claims
in historical timing, cross-browser and dependency-maintenance reports.

| Event | Required / executed coverage | Expensive coverage |
|---|---|---|
| Normal PR | One production build (generation, TypeScript, client/server, prerender, asset budgets, SEO), lint, fast deterministic suites, clinical/UI contracts, dependency license metadata, workflow/dependency/health contracts, high/critical npm audit, aggregate validate | Browser, real-build fixtures and Lighthouse jobs skipped intentionally |
| Weekly / manual validation | Same build and deterministic/security checks; build artifact bound to checked-out SHA; full browser/axe/keyboard matrix and isolated real-build fixtures; aggregate requires successful build/browser/fixtures | Lighthouse advisory, outside aggregate |
| Main Pages deploy | Main ancestry check, one production build, Pages upload/deploy, exact-release HTTP and live Chromium smoke | No exhaustive predeployment browser matrix |
| Notion publishing | Main-only public importer, safety tests, changed-site build/lint/output checks before committing; reusable deploy when changed | Existing publishing health/recovery schedules remain separate |

The target normal PR duration is 1–3 minutes where measured feasible. Observed
pre-audit samples: validation run 40557849914 took 88 seconds; Pages 40558192363
including verification took 103 seconds. These are single samples, not medians.
This audit restores missing fast tests; measure its actual hosted duration after
CI finishes. Do not substitute old full-matrix timings for the current fast lane.

## Fast tests and isolated build fixtures

`npm run test:unit` regenerates cheap project/redirect/search data and runs 26 Node
files, 378 tests at this audit baseline, approximately 20 seconds locally. It does
not run real build fixtures, dist-output suites or browsers. Dependency/health
contracts are also explicit workflow steps; their small overlap is retained for
clear existing contracts. The separate clinical UI contract remains required.

The scheduled/manual fixture job runs project build tests, private preview build,
clean-clone recovery build, Notion build, content-growth builds and rich-MDX tests in sequence. The content-growth fixture runs two synthetic Notion imports and checks prerendered text, shared bundle isolation, and the existing budgets. Those
fixtures build different synthetic inputs; do not reuse production HTML or run
workspace-snapshot tests concurrently with generation. The first audit experiment
that overlapped preview isolation with production build failed correctly and was
rerun in isolation. No assertion was weakened.

For UI behavior changes, run the full existing browser inventory locally or obtain
manual full-matrix results at the proposed revision before merging. Weekly-only
coverage can detect a regression after a fast merge; this is the deliberate
tradeoff for inexpensive routine checks, not continuous browser protection.
`npm run test:e2e:pr` is available locally but is not called by normal PR CI.

## Reproduce

```sh
npm ci
npm run build
npm run lint
npm run test:unit
npm run audit:licenses
npm audit --audit-level=high
node --test scripts/ci-workflows.test.mjs scripts/lipidpath-ui.test.mjs
```

For full acceptance, install pinned browser binaries/system dependencies and run
`npm run test:e2e:built` plus the fixture commands from validate.yml sequentially,
or use Actions → Validate Simpyll → Run workflow (full matrix). Do not report
queued/pending jobs as passing. Inspect browser/fixture reports on failure.

## Cache, security and fail-closed aggregation

npm download caching is keyed by lockfile; node_modules is never reused. Existing
image-transform keys include source/generator/lockfile inputs. No cross-commit
compiled HTML cache was added. Non-PR consumers verify the immutable build
artifact revision. Separate full-validation runners install dependencies for
isolation; PRs install once. Branch-scoped PR caches are not privileged inputs.
The pinned Playwright container matches the lockfile version. PR checkout has no
persisted credentials, secrets or pull_request_target. Deployment remains main-only.

The aggregate validate job always runs. Build must succeed on every event. Browser
and fixtures may be skipped only for pull_request; their failure/cancellation must
still fail. Scheduled/manual events require them to succeed. Lighthouse remains
advisory. Repo settings must actually require validate; that setting could not be
verified through this connector and no protection change is claimed.

## Maintenance and rollback

Publishing tests, source boundaries, slug safety and performance budgets remain
required. The observed content-growth failure in Notion run 40513347386 is tracked
in #67; never conceal it with unconditional success or blanket budget increases.
#133 owns final hosted timing, full regression and protection acceptance.
Collect per-step timings via scripts/ci-timings.mjs, compare like event/inventory
samples, distinguish queues from execution, and use several runs before claiming
a median. Preserve current check names when changing tiers.

Rollback this audit's CI change by reverting its workflow/package commit through a
PR. No production feature or clinical rule is changed. Existing historical
measurements remain under docs/ci; they describe their original revisions only.

Article discovery uses generated metadata, reading time, and heading data derived from the same MDX sources and compiler plugins. Article bodies are separate dynamic chunks; the server resolves each route before prerendering, and direct visits preload the matching chunk before hydration. `npm run generate:articles` regenerates the registry. Article chunks remain subject to the existing per-chunk and page budgets, so very large individual articles and growing metadata still have practical limits.

The #67 synthetic Notion growth investigation used 50 and 65 varied paragraphs, generated by `scripts/notion-growth.test.mjs` via the existing publisher in a temporary checkout. On the audited main revision, shared initial gzip JavaScript was 154,785 bytes with six articles, 166,149 with the first fixture, and 169,261 with the larger fixture; the latter two failed the unchanged 162,000-byte limit. The candidate measured 129,078, 129,712, and 129,711 bytes respectively. The two fixture article routes measured 139,383 and 142,198 bytes of initial JavaScript; both builds passed all existing asset budgets. Values are single local measurements and include generated metadata; the publisher can derive an article description from its opening prose. Run the fixture with `node --test scripts/notion-growth.test.mjs`; it builds sequentially in a temporary directory and does not publish content.
