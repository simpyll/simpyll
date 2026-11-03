# Back to top — issue 25

Baseline: `e6e9eef98469211e45c906d3b3c8205e78126fc5`, including dependency
merges #221–223. No matching open PR existed. The owner's selection supersedes
the issue's historical deferred wording. Roadmap #89 still schedules content work
and final acceptance later.

## Reader behavior

A shared 44px arrow button appears after one viewport of scrolling, disappears
near the top and when the footer enters view, and uses the existing theme/focus
recipes. The lower-right offset accounts for safe areas. Native dialogs hide it
and make the background inert. Print and JavaScript-disabled pages omit it.

Activation focuses the main heading with `preventScroll`, then makes one scroll
request: smooth normally, instant for reduced motion. It does not change history
or the URL. RouteNavigation retains ownership of route/history restoration.
Passive scroll events are coalesced by requestAnimationFrame; a body resize observer
handles asynchronous content height changes. Listeners/frames are cleaned up.

The optional positioning stylesheet loads only when needed, before revealing the
button. Failure leaves the original reading/navigation experience available. The
initial render is hidden on both server and client, including unknown-URL hydration.
No content, publishing data, dependencies or performance budgets are changed.

## Validation

- Baseline and candidate production builds pass, including TypeScript, prerender,
  unchanged asset budgets and SEO (existing editorial review warnings remain).
- Baseline deployment [41735813614](https://github.com/simpyll/simpyll/actions/runs/41735813614)
  passes build, deploy and production verify after the dependency merges.
- Candidate lint passes; deterministic Node suite: 412 passed; built-output suite:
  149 passed; SEO regression suite: 25 passed. No failures/skips in these suites.
- Ten focused desktop/mobile Chromium cases pass: themes/axe, keyboard Enter/Space,
  focus return, thresholds/footer, route history, reduced motion, 320px reflow,
  no-JavaScript and modal isolation. The modal check was strengthened to inject a
  disposable browser-only image into the real ArticleImages/ImageDialog path;
  both desktop/mobile versions of that final check pass. No fixture is published.
- Existing accessibility/theme/navigation/restoration/missing-page/lightbox inventory
  passes 326 cases, with 16 fixture-only lightbox cases skipped by their existing guards (4.4 minutes). Hosted exact-head checks are in the PR.

Commands: `npm run build`, `npm run lint`, `npm run test:unit`,
`npm run test:built`, `npm run test:seo`; browser tests use
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/tmp/chromium npx playwright test ...
--project=desktop-chromium --project=mobile-chromium --workers=2`.

## Limits and remaining gate

Pinned Playwright Chromium 1248/full and headless-shell downloads returned truncated
ZIPs. Browser checks instead use an external QA-only Chromium 153 binary obtained
from the npm-distributed @sparticuz/chromium package, extracted outside the repo.
Playwright/axe still use the repository's locked versions. This changes no project
dependency and is not a claim that pinned Chromium 156, Firefox or WebKit passed.

Keep the PR draft until the repository-required full pinned-browser gate is run
and inspected at the final head: Actions → Validate Simpyll → this branch →
`full_matrix=true`. Routine PR CI skips browsers/fixtures/performance; its green
aggregate alone cannot complete acceptance. No workflow changes or test exclusions
are used to bypass this gate. #25 stays open; #82 remains the later final site gate.

Screenshots: [desktop light](../screenshots/issue-25/desktop-light.webp),
[desktop dark](../screenshots/issue-25/desktop-dark.webp),
[mobile light](../screenshots/issue-25/mobile-light.webp),
[mobile dark](../screenshots/issue-25/mobile-dark.webp).

Rollback: revert this feature PR. No storage migration or content rollback required.
