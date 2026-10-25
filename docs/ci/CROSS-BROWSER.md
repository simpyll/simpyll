# Issue #77 timing evidence

Baseline checkout: `9e606dda059d3e9cf4095dc2df07e84ada46ab4c`.
Existing projects: desktop/mobile Chromium plus Firefox/WebKit accessibility.
The optimized architecture from #133 is present in main, regardless of issue state.

Measured optimized PR baseline: [40139326183](https://github.com/simpyll/simpyll/actions/runs/40139326183).
From workflow start 22:37:04Z to final required job completion 22:41:25Z:
**261 seconds wall-clock**, build 46s, longest browser job 206s, browser test
execution 138s; browser setup 34–50s across shards. Three browser jobs and fixtures
run concurrently. Six jobs including aggregate validate; these remain six jobs.
An earlier cold optimized run 40138890847 took 319s. This small sample is not a median.
Historical optimized run: 476 passes, six fixture-only skips, zero failures.
Current baseline discovery: 472 tests (203 per Chromium project, 33 per
accessibility project); current routine inventory: 492 (207 per Chromium,
33 per accessibility project, four per new engine/device project). The inventory
difference from the historical run reflects the checked-in baseline, not dropped tests.

Local browser installation: system dependency installer fails with sandbox
setgroups/setegid errors; binary-only installation also fails downloading archives.
Local browser execution must not be reported as passed. Hosted PR validation is
required. Browser setup/caching policy and engine set are unchanged; iPhone
emulation reuses WebKit binaries. Added PR inventory is 20 tests (four journeys
across five functional projects), balanced by existing sharding. Actual critical
path impact must be read from completed hosted jobs, never inferred from count.

After-run measurements and validation results are recorded in the PR. Compare
workflow created_at to last required job completed_at, including handoffs and
queue gaps. Do not sum parallel jobs. Record cold/warm cache evidence from logs;
runner load and cache differences limit single-run attribution. Main deployment
validation remains gated; post-merge deployment timing requires later observation.

## Executed extended matrix

[Run 40145800507](https://github.com/simpyll/simpyll/actions/runs/40145800507)
at `3b02571e244cf49e7606286f9868e1b7c6b87bcb`: all six jobs succeeded.
585 discovered, 579 passed, six existing isolated-fixture skips; no failures or
retries. The dedicated fixtures job executed those fixture journeys successfully.
Wall: 00:12:37Z → 00:19:21Z = **404s**. Browser execution: longest extended
shard 265s. Extended coverage intentionally concentrates more expensive engine
journeys in the last shard; this is not the routine PR tier. A temporary commit
forced the extended tier for this verification and is restored in the final tree.

## Failures investigated

The initial hosted run exposed tests depending on the unpublished Notion
`publishing-test` post (pre-existing at the baseline SHA). Responsive-image checks
now use the maintained manual article; the existing real Notion fixture additionally
checks image loading in-browser. No editorial content is restored or invented.
Footer/HTML tests now use a current Notion article. These preserve the assertions'
meaning while removing dependence on a retired post.

Firefox exposed absent return-focus indicators after Escape: targeted CSS keeps
More/search focus visible even when Firefox retains pointer modality. Broader
verification also required accepting successful HTTP 304 reload revalidation,
rounding geometry to 0.001 CSS px for nominal 44px targets (observed float errors
below 0.0001px), and hit-testing a focused card's *visible* viewport fragment.
The focus helper still requires an actual outline/shadow, viewport intersection
and an unobscured hit; no axe rules, keyboard assertions or browsers were dropped.
All extended checks passed after these fixes. Failure artifacts were successfully
uploaded and downloaded for trace/screenshot inspection; successful runs upload no
browser diagnostics.

Local validation: production build/TypeScript/prerender, ESLint, 40 static/workflow
checks, redirect, Notion unit, image, content, search and smoke suites pass.
An early blanket Node test invocation preceded completed output generation and
included integration browser tests, producing missing-output and missing-browser
failures; it is not counted as a pass. The output group was rerun successfully
following the production build; hosted fixture/browser gates are authoritative.

## Routine timing sample

[Run 40146302115](https://github.com/simpyll/simpyll/actions/runs/40146302115):
492 discovered; 485 first-attempt passes, one existing Chromium resize test passed
on retry, six fixture-only skips, no final failures. All six jobs succeeded.
Wall **284s** (00:20:23Z → 00:25:07Z), versus historical optimized **261s**:
+23s / +8.8%. Build 44s versus 46s; longest browser execution 183s versus 138s;
browser setup 33–44s versus 34–50s. npm and Playwright cache hits in every shard;
binary installs skipped. No added production build, engine download or required
job. Existing native shard balancing by test count concentrates cross-engine
work in shard 3; this remains the critical path. These are individual samples,
not a statistical estimate of typical CI or a causal attribution of every second.

The retry read primary/overflow navigation lists in separate protocol calls,
straddling a responsive React render. The final version captures both lists
atomically while preserving all partition assertions. The PR records final-run
verification after this test synchronization fix.
