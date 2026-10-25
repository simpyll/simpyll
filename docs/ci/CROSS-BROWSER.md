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
