# CI performance and validation

## Architecture

PRs and manual `Validate Simpyll` dispatches run `build` (production generation, TypeScript, lint, unit and output checks),
then three independent `browser` shards and `fixtures` in parallel. Playwright's
native sharding partitions the entire seven-project inventory, with two
workers per runner. Each shard owns one preview server. `fixtures` retains real
project/Notion/rich-content builds and Chromium hydration/redirect journeys.
These builds intentionally modify input content; they cannot reuse the production
HTML. They copy the already processed images, avoiding repeated cold transforms.
The final `validate` job runs even when dependencies fail or skip and requires all
tiers to succeed. Its existing check name remains available to branch protection.
No path filters, new skips, retry changes, axe exclusions or optional checks.

`validated-build` is an immutable artifact from the same workflow run, retained
one day; consumers verify the checked-out merge SHA. It contains dist, dist-server,
generated manifests and optimized images, never dependencies or credentials.
No cross-commit build reuse. Artifact transfer is a deliberate tradeoff for isolated
runners and concurrent browser execution. npm ci remains reproducible in every job.

Pages retains its `build`, `deploy`, `verify` names and serialized production
concurrency. All production validation still precedes upload/deploy. Project fixture
tests now follow generation to reuse image transformations. Verification retains
HTTP identity checks and live Chromium checks. The identical Notion fixture
integration runs once in the predeployment build gate at the same revision;
its redundant second execution in verify is removed. Publishing and
availability triggers/policies are unchanged. PR concurrency cancels superseded
runs per PR only; it cannot cancel Pages deployments.

## Cache and security

setup-node caches npm's download store using the lockfile; never node_modules.
Image transformations use the existing content-addressed image generator and a
exact source/generator/lockfile key, with no broad fallback across changed
transformation code; all manifests are rebuilt. Content/image/generator changes
can cause cold image processing by design. Inputs including posts, projects,
case studies, images, scripts and dependencies always run the full build and gates.
No compiled HTML/client/server cache or unsafe incremental build is introduced.
Playwright binaries use an exact OS/architecture/engine-list/lockfile key; system
libraries are always installed. Cache misses install pinned binaries normally.
Cache restoration overhead versus downloading is recorded from Actions timings.
PR caches are scoped by GitHub to the merge ref; privileged main workflows cannot
restore those caches. PR jobs have contents:read, no secrets, no pull_request_target,
and checkout does not persist credentials. Deployment permissions stay isolated.

## Test tiers and #77

See [cross-browser commands and tiers](CROSS-BROWSER.md) for the expanded
functional smoke projects, scheduled/manual extended matrix, diagnostics and iOS
limitations. All pre-existing required coverage remains.


Every PR and main build retains Chromium desktop/mobile full journeys and bounded
Firefox/WebKit accessibility coverage, including both themes, keyboard, reflow,
reduced motion, hydration, routes and axe. Fixture-only conditional tests retain
their separate fixture gates. #77 may add broader journeys later: retain existing
required coverage and use the same shard mechanism; evaluate added representative
PR coverage and extended main/scheduled/manual tiers then. This change does not
move any existing test to a weaker trigger. #46 runtime budgets remain separate.

## Reproduce locally

```sh
npm ci
npx playwright install --with-deps chromium firefox webkit
npm run build
npm run lint
npm run test:projects
npm run test:redirects
npm run test:notion
npm run test:images
npm run test:content
npm run test:search
npm run test:smoke
node --test scripts/ci-workflows.test.mjs scripts/discovery.test.mjs scripts/ai-engineering.test.mjs scripts/contributions.test.mjs scripts/case-study.test.mjs scripts/prerender.test.mjs scripts/remark-heading-ids.test.mjs scripts/article-toc.test.mjs scripts/motion.test.mjs scripts/navigation.test.mjs
npm run test:notion:build
npm run test:mdx
npm run test:e2e:built
```

For cold generation remove only generated `public/images/optimized`, `src/generated`,
`dist`, `dist-server` and `node_modules`, then repeat. For warm generation rerun with
those image files present. Both must regenerate all output correctly. Do not delete
source images. CI coverage-union testing verifies shard discovery equals the full
suite and tests that the final gate rejects failed, skipped and cancelled tiers.

## Timing and troubleshooting

[Measured evidence](ci/PERFORMANCE.md) uses Actions timestamps, not estimates.
Collect completed runs (optionally set GH_TOKEN for API limits):

```sh
node scripts/ci-timings.mjs RUN_ID RUN_ID > timings.json
```

Compare runs with the same workflow, event, browser inventory and similar runner
load. Use medians of at least five when available; keep cold and warm separate.
Wall time is workflow created_at to last job completed_at, including queue and
handoff gaps. Execution span starts at first job started_at; initial queue is the
difference. The critical path is build → slowest downstream tier → validate;
never sum parallel job times. Inspect job/step timestamps, browser install/cache
restore, npm ci, build, fixtures, each shard and artifact upload/download separately.
Watch for >20% median wall regression over five comparable runs; inspect queue/load
before adding workers/shards. Full validation is always required before merging;
`npm run test:e2e:built` runs all configured engines on demand locally;
Actions → Validate Simpyll → Run workflow runs the same complete gate on demand.

A red build identifies setup, generation, TypeScript, lint or named Node tests.
A red shard identifies browser/axe/keyboard failures; download its 14-day failure
artifact for report, traces, screenshots and JSON axe results. Fixture artifacts
are separate. Successful PR reports are not uploaded. A red validate is an
aggregate: inspect its named failed dependency. Pending/queued jobs are not passes.
Pages verification failures are separate from completed deployment, as before.

Rollback: revert this issue's workflow/action/test/documentation commit(s). The
original validate and Pages contexts remain; no protection migration is intended.
The public active-rules endpoint returns no ruleset rules for main; legacy branch
protection returns 403 to the connected integration and requires admin inspection.
Retaining names
is not proof of the currently configured repository rules.
