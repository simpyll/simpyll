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
