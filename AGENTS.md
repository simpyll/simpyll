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

- `npm run test:unit` is the fast cold-start lane: it regenerates the cheap
  artifacts (`validate:projects`, `generate:redirects`, `generate:search`) and
  runs the 29 Node suites verified to pass on a fresh clone without a production
  build or browsers (~1 minute, ~380 tests). It excludes suites that audit
  `dist/` output, spawn real builds or launch browsers; those still run in the
  full gates and on every pull request.
- Pull requests run the focused critical browser gate
  (`npm run test:e2e:pr`, `playwright.pr.config.ts`): the required axe/keyboard
  suites on Firefox and WebKit plus navigation, LipidPath, missing-page
  hydration, slug-history redirects, recovery, route-restoration and theme
  journeys on desktop and mobile Chromium. The exhaustive seven-project
  inventory stays on the weekly schedule, the manual full-matrix dispatch and
  the main/Pages deployment gate (`npm run test:e2e:built`); it is never run
  weaker than before on those tiers.
- For behavior-affecting UI changes, still run the full browser inventory
  locally (`npm run build && npm run test:e2e:built`) or trigger the manual
  full-matrix dispatch before merging; the PR gate is deliberately focused and
  does not replace exhaustive regression coverage.
- Vite middleware-mode test servers must set `server: { ws: false }` (Vite 8's
  WebSocket transport option). `hmr: false` does **not** stop the standalone
  WebSocket server from binding the shared port 24678, and parallel
  `node --test` files then collide. `playwright --list` and browser suites
  require a prior `npm run build` because some specs import
  `dist/deployment.json` at load time.
