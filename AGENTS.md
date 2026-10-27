# Simpyll implementation and validation guidelines

## UI changes and test contracts

- Before removing, renaming or moving a control, search all `tests/e2e`, helpers,
  and `scripts/*.test.mjs` for its accessible name, text, href and old behavior.
  Update every affected journey in the same PR, not just newly added tests.
- Keep behavior coverage meaningful: when footer navigation is intentionally
  removed, exercise route persistence via the primary navigation and keyboard
  reachability via the actual remaining footer controls. Do not restore unwanted
  UI or skip assertions to satisfy stale tests.
- Use actual accessible labels from the implementation. The `/blog` navigation
  link is named **Journal**, not Blog. Use the responsive `destination` helper
  for primary-navigation links that can move into More.
- Theme tests should own OS-following, explicit preferences, persistence,
  pre-hydration colors and the reveal toggle. Footer composition belongs in
  footer tests; avoid freezing unrelated link counts or copy in theme tests.
- Preserve axe rules, visible-focus checks, keyboard journeys, reduced-motion
  behavior and both desktop/mobile projects. Never disable tests, expand
  timeouts or exclude accessibility rules to hide regressions.
- For shared UI changes, run build, lint and affected browser suites (including
  accessibility and theme). If local browsers are unavailable, use PR CI and
  inspect its final results. Do not describe pending browser validation as passed
  or the PR as ready to merge. Inspect failure logs and fix affected assertions.
- Distinguish actual accessibility violations from stale selectors, assertions,
  browser installation problems and other failures in the combined browser gate.
- GitHub Pages serves the same prerendered `/404` document for every unknown
  URL. Any route-dependent markup outside the 404 page must match that document
  for the hydration render, then update to the requested URL after hydration.
  Assert the eventual URL with a retrying assertion and capture hydration errors;
  an immediate DOM read can observe the static fallback before React starts.

## Validation tiers and cold-start workflows

- `npm run test:unit` regenerates cheap project/redirect/search artifacts and runs
  26 deterministic Node files without a production build or browser. The audit
  baseline is 378 tests in about 20 seconds locally, not a hosted-time guarantee.
  Real project, preview and recovery build fixtures run separately, sequentially
  in the scheduled/manual fixture job. Do not run a snapshot/isolation fixture
  concurrently with generation in the same workspace.
- Routine PR validation runs production build/TypeScript/prerender/asset and SEO
  checks, lint, the fast deterministic lane, clinical/UI contracts, dependency
  license inventory, dependency/publishing-health contracts and high/critical
  npm audit. The aggregate `validate` check must fail if build fails or cancels.
  Browser, build-fixture and Lighthouse jobs are intentionally skipped on PRs.
- Weekly/manual validation retains full browser/axe/keyboard regression across
  the existing engines, fixture builds and candidate-release smoke. Pages builds
  once and verifies live HTTP and Chromium smoke after deploy; it does not run
  the exhaustive browser inventory before every deploy.
- For behavior-affecting UI changes, run `npm run build && npm run test:e2e:built`
  locally or obtain the full manual CI result at the final revision before merge.
  A fast PR result does not certify browser behavior or accessibility. Required
  branch protection must be verified through authorized GitHub settings access.
- `test:e2e:pr` remains an available local focused inventory; current normal PR CI
  does not invoke it. See docs/CI.md for the actual event-to-check mapping.
- Vite middleware-mode test servers must set `server: { ws: false }` (Vite 8).
  `hmr: false` does not stop the standalone WebSocket port 24678, causing parallel
  Node tests to collide. Playwright listing/imports can require a prior build
  because some specs consume dist/deployment.json.
