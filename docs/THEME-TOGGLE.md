# Circular theme toggle (#93)

The header now has a 44px sun/moon button. Each activation selects the opposite
resolved theme explicitly. The footer's **Use system theme** button restores OS
tracking and reports its selected state with aria-pressed. The original synchronous
head bootstrap, storage, cross-tab listener and OS listener are unchanged.

## Reference findings

Inspected Eric Wu's source at commit 2275b3d02b398359e30d90b997e22e1ab2396174:
`lib/theme-transition.ts`, `components/nav/site-nav.tsx`, `styles/globals.css`.
The button measures its bounding rectangle and passes its center to a helper.
The helper starts a native document view transition, updates next-themes with
flushSync, then animates the new root snapshot's clip-path from zero to the
hypotenuse of the farthest horizontal/vertical corner distances. Both directions
expand the incoming snapshot; neither reverses the circle. Duration is 700ms,
easing cubic-bezier(0.65,0,0.35,1). Old/new root snapshots disable default animation
and blending. The icon uses a moving SVG moon mask, scaled disk and fading/rotating
sun rays. Missing API, reduced motion and WebKit use immediate updates; the helper
explains that WebKit drops backdrop blur in snapshots. It does not itself serialize
rapid clicks or clean up resize/unmount. No live visual inspection is claimed.

## Simpyll adaptation

`src/theme/transition.ts` owns the reveal, using the existing synchronous theme
selection event rather than adding React state or another provider. Timing comes
from #92 expressive/emphasized tokens (600ms). New snapshot is explicitly above the
old snapshot in both directions. Styles are scoped to a temporary root attribute.
The icon crossfades/rotates using normal motion tokens. Its visual state is driven
by the pre-hydration root attribute; external-store server snapshots remain stable.
A second store snapshot tracks the resolved theme for the accessible action label.

While a reveal is active additional activations are ignored deterministically.
Resize, history navigation, pagehide, toggle removal, live reduced-motion changes
and a conflicting resolved theme skip the snapshot; theme state is never delayed
until animation completion. Promise rejections are handled. Mutation observer,
listeners and temporary attributes are removed when the transition settles.
Unsupported API/WAAPI and WebKit switch immediately. No animation runs for OS,
cross-tab or System restoration changes. Future route transitions should coordinate
with this owner rather than overlap document transitions.

## Validation and manual review

Use the existing Node and Playwright suites. Theme tests cover persistence, storage
failure/removal/clear, OS changes, cross-tab, pre-hydration colors, System recovery,
keyboard focus, stable header geometry, touch size and no horizontal overflow.
Additional tests cover reduced/unsupported/WebKit fallback and native clip-path
geometry, rapid clicks, both directions and resize cleanup.

Manual real-device Safari/Firefox verification remains necessary: switch both ways
at the top and midway through an article; verify no blur loss, scroll jump, flash,
focus loss or uncovered corners. Unsupported browsers should switch instantly.
Test Tab/Enter/Space, footer System recovery and live OS/reduced-motion changes.
Browser user-agent fallback tests are not a substitute for actual Safari rendering.

No dependency was added. There is one layout measurement and one computed-style
read per deliberate activation, no animation loop or persistent compositing hint.
The initial production build measured 294.92KB client JS (91.94KB gzip), versus
#92's recorded 292.53KB (91.10KB gzip); CSS 44.19KB (8.19KB gzip).

Visual evidence: [previous dropdown](themes/desktop-dark.png),
[new light](theme-toggle/desktop-light.png), [new dark](theme-toggle/desktop-dark.png),
[reveal to dark](theme-toggle/reveal-to-dark.png),
[reveal to light](theme-toggle/reveal-to-light.png), [320px layout](theme-toggle/mobile.png).

Final local validation: ESLint, TypeScript and full production client/SSR build and
five-page plus 404 prerender passed. All 64 Node tests passed. After rebuilding the
production output, all 72 committed desktop/mobile Playwright checks passed; two
temporary screenshot-capture cases also passed (74 total). Local Chromium 153 came
from a temporary serverless package because the pinned Chromium 156 archive was
truncated; video capture was disabled locally. No workaround or dependency change
is committed. Safari/Firefox were not executed. A fresh build is needed after the
Node suite: its existing build tests can replace dist with unprerendered output.
