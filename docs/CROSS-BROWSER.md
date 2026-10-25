# Cross-browser regression testing

One config, `playwright.config.ts`, owns the local production-preview gate.
Run `npm ci`, `npx playwright install --with-deps chromium firefox webkit`, then
`npm run build` once before the commands below. TypeScript runs in the build;
`npm run lint` checks test code as well.

| Project | Routine PR coverage |
| --- | --- |
| desktop-chromium | Existing full regression suite plus smoke |
| mobile-chromium | Existing Pixel 7 suite plus smoke |
| accessibility-firefox | Existing required axe/keyboard suite |
| accessibility-webkit | Existing required axe/keyboard suite |
| desktop-firefox | Focused functional smoke, 1440×900 |
| desktop-webkit | Focused functional smoke, 1440×900 |
| mobile-webkit | iPhone SE touch emulation, including 320px disclosure |

Smoke covers static HTML, hydration errors, SPA navigation and history, direct
loads/reloads, project details, blog reading, scrollable code, TOC/hash focus,
fixed navigation, touch targets, keyboard focus, search, theme and project filters.
Firefox return-focus rings are explicitly styled for the More and search controls,
including when Escape follows pointer interaction. Image checks use the maintained
manual article; the isolated Notion fixture verifies publisher images, so retiring
a live Notion post cannot invalidate that coverage.

Reduced motion verifies reveals, indicator/theme transitions and scroll behavior.
The responsive More menu is a nonmodal disclosure; it does not trap focus or
make the background inert. Escape, outside dismissal and route focus are tested.
Search is an inline combobox, not a modal dialog.

PRs retain every existing test, axe scan, retry policy and aggregate `validate`
check. All seven projects share the existing three balanced shards and immutable
build artifact; no extra production build or browser engine download is added.
Main/Pages builds, weekly Tuesday validation and manual Validate Simpyll dispatch
(default `full_matrix=true`) also run portable navigation, heading-permalink,
project-detail, About, footer and recovery suites in the new projects. Chromium's
full suite remains the home for implementation-specific visual/animation tests;
we do not pretend every Chromium API exists in Safari. Existing cross-engine axe
coverage is kept separately rather than duplicating costly scans in smoke.

```sh
npm run test:e2e:built                     # routine required inventory
npm run test:e2e:smoke                     # smoke across five functional projects
npx playwright test --project=desktop-firefox
npx playwright test cross-browser --project=mobile-webkit
npm run test:e2e:full                      # extended supported matrix
PLAYWRIGHT_FULL_MATRIX=1 npx playwright test --project=desktop-webkit
npx playwright test cross-browser --project=mobile-webkit --retries=0
npm run test:e2e:report
npx playwright show-trace test-results/FAILED-TEST/trace.zip
```

Failure artifacts identify project and test, retain screenshots, traces, video,
HTML report and console/runtime attachments for 14 days. Successful runs do not
upload browser diagnostics. Reproduce using the project and title from the
report (`--project=... --grep='test title'`), against the same commit/build.
The exact lockfile/OS/architecture/engine cache and two workers per shard remain.
See [CI architecture](CI.md) and [timings](ci/CROSS-BROWSER.md).

## Platform limits and physical-device checklist

WebKit plus iPhone emulation is **not physical iOS Safari testing**. It exercises
a browser engine with touch/viewport settings, not actual iOS browser chrome,
virtual keyboard, dynamic visual viewport, native VoiceOver or platform bugs.
No claim of real keyboard occlusion or native assistive-technology validation.

On a physical iPhone, record device/iOS/Safari version and deployed SHA; check:

- Open/close More and search with touch and VoiceOver; verify labels and focus.
- Type in search with the real keyboard; controls/results remain visible when
  keyboard and browser chrome expand/collapse; rotate with search open.
- Scroll articles, use TOC anchors/back/forward, inspect fixed nav and safe areas.
- Test both themes, OS Reduce Motion, pinch zoom and narrow landscape layout.
- Follow project/article deep links and reload; check missing-route recovery.

Track findings in `docs/ACCESSIBILITY.md`; automated success is not WCAG conformance.
