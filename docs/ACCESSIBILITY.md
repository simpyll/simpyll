# Accessibility regression testing

Automated testing targets supported WCAG 2.2 Level A/AA checks; it cannot establish
WCAG conformance. Issue [#43](https://github.com/simpyll/simpyll/issues/43) remains
the broader manual audit. The baseline had browser keyboard/theme checks but no axe integration or JSX
accessibility lint plugin. Existing ESLint and browser checks remain enabled.
No axe rules, elements, or existing violations are excluded. Fix a failure rather than hiding it.

## Running and extending the gate

Use Node 24, `npm ci`, `npx playwright install --with-deps chromium`, then:

- `npm run build && npm run test:a11y`: route/state scans and detector contracts.
- `npm run test:mdx`: isolated rich-content build, including generated Notion
  blocks, shared component rendering, open/closed disclosures and axe scans.
- `npm run test:e2e:built`: all browser regressions, including accessibility,
  existing System preference, navigation, theme, search, motion and route focus.
- `npm run lint` and `npm test`: full repository validation.

The existing desktop Chromium and Pixel 7 projects run both palettes. A 375×812
case checks iPhone-sized layout with 200% text (Chromium emulation, not Safari).
Contexts isolate storage, OS preference and reduced motion. A separate keyboard
journey keeps normal motion enabled to check the theme reveal preserves focus.
External requests are blocked in accessibility tests; checked-in content and the
isolated rich fixture need no Notion credentials.

Routes: `/`, `/blog`, `/about`, `/explore`, `/projects`, every public published
case study discovered from the validated project manifest, every checked-in article,
and an unknown URL. Journal and case-study cards use native links.
There are no application modal dialogs, tab widgets or interactive embeds today;
search is a nonmodal combobox/listbox and More is a native disclosure pattern.
Do not add dialog semantics or a focus trap to these nonmodal controls.

`tests/e2e/helpers/accessibility.ts` centralizes axe tags and assertions. Tags
include WCAG 2.0/2.1 A/AA, WCAG 2.2 AA and best practices. All violations from
those tags fail regardless of impact. Axe's incomplete results are retained for
manual review, not represented as passes. New articles are discovered automatically.
For new controls, add a semantic keyboard journey, scan the active state, and
exercise dismissal, restoration and hidden-state keyboard behavior. New true
modals require initial focus, accessible name, background inertness, forward and
reverse containment, Escape and restoration tests.

Focus checks use real keyboard input, viewport/hit testing and computed outline
or shadow indicators, rather than an exact screenshot of one ring design. They
cannot prove focus contrast on every background; manual visual checks remain
required. Mobile target checks require 24 CSS pixels for navigation buttons;
this is not a blanket assertion about inline links, where WCAG spacing and
other exceptions require context. Text enlargement tests reflow, not real OS zoom.

## CI enforcement and diagnostics

The accessibility specs run automatically inside `test:e2e:built` in the existing
Validate Simpyll PR job and Pages build job on main pushes, before artifact
upload or deployment. The isolated rich-MDX gate runs in both jobs too. There is
no continue-on-error, global exclusion, or success wrapper. Existing retry policy
is unchanged. Failure artifacts retain HTML reports, screenshots, video, traces
and JSON axe results for 14 days. Each scan records route, theme, viewport,
interaction state, rule, impact, WCAG tags, affected markup/selectors, observed
failure, remediation and documentation link. Do not scan private authenticated
content or include credentials in fixture markup.

A custom reporter adds failing test paths and expected/actual diagnostics to the
GitHub Actions summary. Detector tests intentionally catch failures in isolated
about:blank fixtures (unlabeled button, missing alt, invalid ARIA, contrast,
unnamed/uncontained modal, invisible focus, broken Enter, keyboard trap); they
pass only when those regressions are detected. Broken markup is never built into
production. For a real failing gate demonstration, remove one detector's expected
rejection or add an unlabeled button to a temporary test branch and run the gate:
the zero-violation assertion must fail. Revert the mutation before proposing code.

To require this gate, repository administrators should select **validate** from
**Validate Simpyll** in Settings → Rules → Rulesets (or branch protection), require
it for main and require the branch to be current. It includes the accessibility
suite. Consider requiring the Pages **build** check where applicable. This change
does not edit protection settings. Test reporting alone cannot prevent merges
until the validation check is required.

## Manual audit checklist

Record date, commit, device/browser, assistive technology, route/state, expected
and actual behavior, severity and follow-up issue. Recheck fixes on that setup.
Use NVDA with Firefox/Chrome on Windows, VoiceOver with Safari on macOS/iOS, and
TalkBack with Chrome on Android on representative releases.

- Navigate every page and active control with Tab/Shift+Tab, Enter/Space and Escape;
  check visible focus, reading order, skip link, unobscured focus, no traps,
  route announcements and restored focus after dismissal.
- Read headings, landmarks, links, tables, figures, code and live search updates
  with a screen reader. Check useful names, verbosity and result selection.
- Test browser zoom to 200% and 400%, text-only resizing, narrow reflow, mobile
  orientation, virtual keyboard, touch exploration, target spacing and clipping.
- Measure text, focus and control contrast in both themes, including translucent
  glass, atmospheric gradients, hover/selected/disabled states and syntax colors.
  Axe cannot reliably resolve all composited backgrounds or image text.
- Assess alt descriptions for meaning, decorative images, caption relationships,
  supported embeds and media alternatives; presence of alt is insufficient.
- Test reduced motion and normal animation for discomfort, missing information,
  blocked interaction, flashing and unexpected movement.
- Test empty/loading/error states and recovery: understandable messages, useful
  instructions, predictable focus, no loss of user input or context.
- Assess cognitive load: plain language, consistent labels, predictable controls,
  logical grouping, understandable instructions and adequate time.

Automated checks cannot judge meaningful descriptions, complete reading order,
all screen-reader announcements, real touch usability or cognitive accessibility.
A green suite is regression evidence, not a claim of full accessibility compliance.

## Baseline findings and fixes (#85)

Baseline commit: `8bcfe03` (main when work started). No temporary exceptions or
rule suppressions were added.

| Finding | Severity / scope | Resolution |
| --- | --- | --- |
| Repeated semantic H1 in Python article | Structural / one article | Preserve duplicate title typography with presentation semantics, following the existing introductory post; the page keeps its single meaningful H1. |
| Horizontal overflow at 200% text on 375px viewport | Reflow / homepage | Wrap long text and project metadata; constrain the single-column project grid. |
| Enlarged-text search field obscures Close after capsule wraps | Serious / navigation at 200% text | Keep structural capsule gaps/padding at their existing pixel dimensions while text and icon controls enlarge, preserving the single-row control layout and input insets. |
| Scrollable results panel cannot receive keyboard focus (`scrollable-region-focusable`) | Serious / search at enlarged text | Focusable named results region; verify Tab access, Arrow scrolling, Escape and restoration. |
| Repeated generic callout landmarks (`landmark-unique`) | Moderate / shared MDX renderer, rich manual + Notion fixture | Inline annotations use the note role rather than repeated complementary landmarks. |
| Repeated table-region names (`landmark-unique`) | Moderate / shared MDX renderer, multiple tables | Name each table region from its column headers; authors may supply an explicit table aria-label. |

Axe incomplete results remain in JSON reports for manual review, including
composited navigation contrast, offscreen/complex text contrast, and footnote
name/content evaluation in the rich fixture. They are not hidden or evidence of
conformance. The broader audit stays tracked in #43. Identical table header sets
still need distinct author-supplied labels; the landmark rule will catch repeats.

## Validation record

Executed locally on the implementation branch:

- Production build and prerender, TypeScript and ESLint.
- All 80 publisher/content/prerender/motion/navigation Node tests, 34 smoke unit
  tests and three image pipeline tests.
- Full Playwright run: 214 passed, four intentionally skipped isolated rich
  tests; that isolated build separately executed and passed all four browser
  tests, including shared manual/Notion axe scans.
- Nine detector contracts in each browser project. Three temporary uncaught
  regression probes (unlabeled control, low contrast and broken Enter activation)
  all failed, returned process exit 1 and wrote the expected failing Actions
  summary. The temporary probe spec was removed before commit.

The environment could not download Playwright's pinned Chromium archive; local
browser validation used Chromium 153 via the existing executable-path override.
CI retains the normal pinned Playwright Chromium installation. GitHub CI results
must still be checked on the PR. No manual screen-reader/device audit was
performed as part of these automated checks; use the checklist above and #43.


## October 24, 2026 audit increment — #43

This is a partial audit against WCAG 2.2 AA, not certification or a claim of
conformance. Baseline main: `248daa05a81d4e433b13fec0cacc63039f40cf13`.
Remediation/test source: the commit containing this section (resolve using
`git log -1 --format=%H -- docs/ACCESSIBILITY.md`).

### Reproducible baseline and environment

Ubuntu 24.04.3 container, Node 24.22.1. Read #43 (no comments), #85, #89,
PR #109, repository instructions, both CI gates and current browser suites.
Current main includes the homepage, footer and AI Engineering changes.

Before edits, invoked `npm run build` then `npm run test:a11y`. Build, metadata,
content validation, TypeScript and prerendering passed (14 pages plus 404).
Browser execution was blocked by missing pinned Chromium. Download attempts
returned truncated Chromium archives. Firefox/WebKit downloads became available,
but WebKit host libraries are missing. The dependency installer failed on
container setgroups/permissions. Google Chrome 156.0.8078.47 was downloaded as a
fallback; launch failed before any page loaded with `process_singleton_posix.cc:
socket() failed: Operation not permitted`. Thus there is **no local axe baseline,
keyboard pass, browser version result, or manual visual result** to report.
Configured baseline projects: desktop Chromium and Pixel 7; both themes.
Infrastructure failures must not be counted as WCAG violations or clean scans.

### Findings and remediation

| Finding | Severity / criterion | Before → after | Evidence / retest |
| --- | --- | --- | --- |
| Removing a focused Explore chip deletes its focused DOM node; Clear filters hides/disables its focused control | P1; 2.4.3 Focus Order | No focus destination → focus journal search before changing state; also covers search clear and empty-result recovery | Source review of Explore handlers; keyboard regression in accessibility-audit.spec.ts; browser retest pending CI |
| New page templates not consistently covered by shared axe gate | P2; regression gap | Simpyll case study and Explore omitted → both included; public case studies discovered from validated manifest | accessibility.spec.ts; no axe exclusions |
| Only one browser engine in the audit gate | P2; coverage gap | Chromium desktop/mobile → add bounded desktop Firefox/WebKit accessibility journeys in both PR and Pages build gates | playwright.config.ts; local engine validation unavailable; CI must pass |
| Documentation described obsolete homepage-only Projects/About sections | P2; process gap | Incorrect coverage description → actual standalone routes and limitations recorded | This document |

### Audit review and boundaries

Source review: native labels and status announcements in Project Hub/Explore;
board and grid use the same project metadata, status labels accompany colors;
native links/buttons in footer and navigation; mobile TOC uses details/summary;
RouteNavigation owns heading/hash focus and avoids initial hydration focus;
Reveal and project hover CSS respect reduced motion. Existing tests cover skip
link, search dismissal/restoration, theme focus, TOC/hash/history navigation and
404 hydration errors. These observations are source evidence, not substitutes
for usability or screen-reader testing.

Images: publishing-test contains an empty-alt image; whether it is decorative
needs author/visual review. The publishing diagram has a useful six-stage alt.
Do not invent image descriptions or treat presence of alt as adequate meaning.
Composited glass, syntax colors, hover/disabled/focus contrast and 200%/400% real
browser zoom remain **unverified**. Added 320/768/1280 CSS-pixel text-spacing/reflow
scans are automated proxies, not actual browser zoom or physical mobile tests.
No P0 was established from source review; this does not prove none exists.

### Recurring CI failure investigation

Inspected logs for job `120977331755`, run `40129283601`: 12 failures, 320 passes,
6 skips. Examples: theme tests demanded exactly two footer links after the
footer added social/contribution links; keyboard journeys still targeted the
removed System footer control. These are stale behavior contracts, not evidence
of axe contrast violations. Main already fixes these contracts in `209f8a7`.
`f942587` and `012ec8e` separately fix shared 404 hydration and distinguish
expected missing-page HTTP status from application/asset errors. Do not duplicate
those fixes, restore unwanted UI, or weaken assertions. The manifest-driven route
coverage now reduces missed-page risk. Keep accessible-role/name selectors and
update all affected journeys whenever shared UI changes.

### Manual evidence ledger and required follow-through

No native screen reader or physical device is available. No human-operated
browser test was performed. Linux headless automation is not VoiceOver, NVDA,
TalkBack, Safari-on-iOS, or physical touch testing. Keep #43 open; #77 also tracks
broader browser coverage. Each pending row requires date, actual browser/OS/device,
AT version (or none), tested SHA, scenario, observed result, defect, fix and retest.

| Pending environment | Reproducible scenario | Result / retest |
| --- | --- | --- |
| Windows + Firefox/Chrome + NVDA | Landmarks/headings/links across all routes; search result names and live announcements; filters and code reading | Not run / pending |
| macOS Safari + VoiceOver | Same reading/keyboard journey; route and hash orientation, history, theme and TOC | Not run / pending |
| Android Chrome + TalkBack; iOS Safari + VoiceOver | Touch exploration, navigation, filters, search with virtual keyboard, orientation, target spacing | Not run / pending |
| Desktop browsers, no AT | 200%/400% actual browser zoom; both palettes; composite glass/syntax/active/hover/focus contrast measurements; motion comfort | Not run / pending |

For keyboard spot checks: Tab from skip link through theme/navigation, open search
with Enter, select results with arrows/Enter, dismiss with Escape and verify focus
returns. Navigate to each page; check heading focus after links, TOC heading focus,
Back/Forward position, Project Hub view/filter/disclosure actions and footer social
and editing links. At 320 CSS pixels and real zoom, verify readable content,
reachable controls and no unintended document overflow. Record failures rather
than checking off this ledger based on automated passes.

### Every-PR developer checklist

- Native landmarks/headings/labels; correct accessible names and states.
- Keyboard activation, dismissal, focus order/restoration and visible unobscured focus.
- Both-theme text/control/focus contrast on actual backgrounds.
- Narrow reflow, zoom/text spacing and target size; reduced-motion behavior.
- Meaningful image alternatives and logical reading order.
- Build, lint, affected browser journeys plus full accessibility gate before review;
  inspect final CI failures and artifacts when local browsers cannot launch.
- Manual keyboard/visual spot check; document unavailable AT/device tests honestly.

### Validation for this increment

Local production build/TypeScript/project metadata/content/prerender: passed.
ESLint: passed. Combined Node command (`node --test scripts/*.test.mjs
scripts/notion/*.test.mjs scripts/smoke/*.test.mjs scripts/images/*.test.mjs`):
178/180 passed; Notion/rich integration builds fail when their browser stage tries
to launch missing Chromium (infrastructure, not suppressed). Accessibility,
reflow/keyboard and full browser results require successful GitHub CI before
review readiness. No deployment or automatic merge is authorized by this PR.
