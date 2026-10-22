# Static blog search (#11)

## Baseline and positioning contract

Inspected latest main at `159b901`, including #57/#101 and merges #97–#105.
Before this change the viewport-fixed `.floating-header` anchors a centered,
shrink-to-fit flex capsule. Its safe-area top offset and padding establish its
viewport position. Intrinsic link/button sizes, gaps, padding and borders determine
capsule dimensions; a separate flow slot reserves header height. Capacity is cached
as a link count and recalculated on resize/font readiness, never scroll. Only the
internal active pill transforms; no ancestor transforms or capsule layout animation
are present. The inert measurement ruler provides intrinsic link widths. The theme
helper already measures the activated live button and animates the root snapshot.

An isolated checkout of unchanged main passed all 20 existing navigation-scroll
and painted theme-position tests in desktop Chromium and Pixel emulation. Those
tests sample small scrolls and decode screenshot pixels at paused native reveal
frames. This baseline does not reproduce Android browser toolbar/compositor issues.

The fixed anchor, slot, clearance measurement, active indicator, route controller
and theme helper are preserved. Capacity reserves the measured search button plus
one extra gap. Theme comes first, destinations next, search last. Destinations
remain in flow while inert and transparent in search mode. The input overlays only
that internal region. The results panel is absolutely positioned, so neither
query/results nor opening/closing search determines capsule width or height.
There is no outer width animation, scroll listener, compensating translation,
position switch, scroll lock or alternate restoration owner.

The input/links use existing fast/standard opacity/transform tokens. Reduced motion
removes these transitions. Input focus is immediate with preventScroll, never
waiting on animation. Rapid toggle events use functional state updates. Closed
fields and covered links are inert and excluded from accessibility. Closing clears
the query; theme changes preserve it. Route changes close search without taking
focus from #57's route controller.

## Build and publication

`npm run generate:search` parses flat canonical MDX filenames under
`src/content/blog` using the existing `@mdx-js/mdx` infrastructure and the content
validator's literal ESTree reader. It never imports/evaluates article modules.
It writes deterministic, slug-sorted `public/search-index.json`, copied to the
Pages artifact by Vite. Production builds run validation then index generation;
`npm run dev` generates it initially (rerun after editing article prose).
The generated file is ignored in Git. Both manually authored and Notion-generated
MDX pass through the same extractor, after the publisher's Published-only sync.

Only titles, descriptions, categories, tags and readable body text are stored.
ESM/metadata declarations, fenced/inline code, pre/code/script/style subtrees and
executable expressions are omitted. JSON string expressions emitted by Notion
are read as data. Text children plus literal title/caption/alt props retain
callouts, disclosures and figures. No arbitrary attributes/URLs are indexed.
Missing optional description/category/tags become empty values. Filename is the
canonical slug; no independently inferred URL is used.

Draft (`draft: true`), unpublished (`published: false` or a non-Published `status`)
and explicitly marked test (`test: true`) metadata are excluded. Filenames with a
`test` or `fixture` hyphen-delimited segment are excluded, including the existing
`publishing-test` demo. These exclusions affect search only; this feature does not
change the existing public article loader or sitemap. Never commit private drafts
under the published-content directory: search filtering is not a privacy boundary
for the rest of the site. Tests/fixtures outside that directory are never scanned.
Duplicate canonical filenames are rejected by content validation; client results
also deduplicate by slug.

## Client engine

The index is requested on first open, validated and cached in memory with one
shared in-flight request; failures can retry on reopen. HTTP revalidation avoids
stale browser cache on a new page load. Updates appear after rebuild/deployment
and reload; an already-open tab retains its session index. No query logging,
external service or backend is used. No additional dependency was introduced.
The existing eager article loader is unchanged; search does not fetch MDX articles.

Normalization uses NFKD, removes combining marks, lowercases and turns common
punctuation into spaces while preserving Unicode letters/numbers. Each field's
words are prepared once per loaded index. Queries use AND across distinct terms
with word-prefix matching. Best field per term scores title 100, category/tags 30,
description 10, body 1. Exact normalized title adds 10000; title prefix adds 5000.
Repeated body occurrences cannot dominate a title. Ties use canonical slug order.
At most eight deduplicated results render. Input is bounded to 160 characters.
This intentionally offers no fuzzy edit-distance matching or hosted analytics.

## Accessibility, mobile and themes

The input follows a combobox/listbox pattern with stable IDs, aria-expanded,
aria-controls, aria-autocomplete and aria-activedescendant. DOM focus stays in the
input; arrows select/wrap and Enter navigates through React Router. Escape from
search or the theme control closes and restores the search trigger. Tab skips
inert links, moves to close and then normal page controls; there is no focus trap.
A polite status announces loading/count/no-results/failure, never each selection.
Highlighting uses React text/mark nodes, without HTML injection. Results show
category, title, description (or a body fallback) and optional tags.

Semantic surface, foreground, muted, control-outline, accent and focus tokens
support Light/Dark/System. Theme remains accessible in search mode. The existing
reveal calculates x/y from the current activated button's getBoundingClientRect at
interaction time, then radius from the farthest viewport corner. Moving the button
left needs no new origin code or cached coordinates. Existing native-transition
cancellation on resize, reduced-motion and unsupported/WebKit fallbacks remain.

The panel is viewport-bounded and scrollable with contained overscroll. While open,
visualViewport resize/scroll and window resize update only panel available height
in a batched frame, accommodating a shrinking keyboard viewport without moving
the capsule. The 16px input avoids iOS input auto-zoom. No mobile scroll lock is used.

## Validation

Run `npm run test:search`, `npm run lint`, `npm test`. CI, Pages deployment and
Notion publishing also run the search unit tests. The browser suite includes
real production-index checks plus deterministic request fixtures, loading/error
retry, keyboard route focus, rapid controls, light/dark state preservation and
inert/Tab semantics. Search transitions sample every rAF before/during/after open
and close at 320/390/768/1280px with a 0.5 CSS pixel position/dimension tolerance,
including slight scrolls and resizing. Reveal tests inspect actual native WAAPI
keyframes against the actual left button center after scroll/resize with search
open and verify farthest-corner coverage. Existing pixel-decoded theme snapshot,
reduced-motion, fallback, System persistence, route, MDX and Notion tests remain.

Local browser workaround: the pinned Chromium 156 archive was truncated; local
runs use temporary Chromium 153 via PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, with
normal video/screenshot/trace capture. No browser workaround or dependency is
committed. Physical Android Chrome, iOS Safari, mobile keyboard/toolbar behavior,
browser zoom and screen-reader spoken output require device checks; desktop
Chromium emulation cannot prove these device-specific behaviors. See the PR for
executed final counts and review screenshots.

Final local results: lint, TypeScript/client/server production build and six-page
plus 404 prerender passed; all 79 Node checks passed (including the isolated rich
MDX browser integration). The full production browser run passed 150 cases, with
four fixture-only cases skipped there and executed by the isolated integration.
After adding explicit search fallback/body-only checks and improving the reveal
test's live click reference, all 24 search cases passed again. No geometry
tolerance was relaxed. A responsive-test race was fixed by draining observer
frames and comparing the reveal with the button's actual click-time rectangle.

Review captures use deterministic synthetic result text on the real production
layout: [mobile light](search/mobile-light.png), [mobile dark](search/mobile-dark.png),
[desktop light](search/desktop-light.png), [desktop dark](search/desktop-dark.png),
and [native mobile reveal](search/mobile-reveal.png). These show emulation, not
physical Android or Safari. CI retains its pinned Chromium and normal artifacts.
