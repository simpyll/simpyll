# Contextual link previews

Only prose anchors inside `.article-content` are enhanced. Navigation, cards,
footnotes, image links, existing described links and unsupported destinations keep
ordinary behavior. This does not insert links or change editorial approvals.

`generate:redirects` also generates ignored `src/generated/link-previews.json`,
a small allowlisted projection of the existing article identity/publication
registry and validated public project manifest. Article title/description become
preview title/excerpt. Only published articles are included; draft, withdrawn,
private preview, test and noindex records are excluded. Project title/summary
are included only when `getCaseStudyPath` enables a public detail page. No body,
source identifier, source path, private case-study key or publishing ledger is
imported by the preview component. The existing project
`cover.src` is used if supplied; articles currently have no thumbnail metadata
contract and remain text-only. Missing thumbnails are normal. No automatic
body-image extraction, screenshot service, runtime server or per-hover fetch is
used. Maintain the projection rather than adding a second content registry.

URL lookup uses the current document URL, configured Vite base, canonical site
origin, and existing article aliases. It accepts supported relative, root-relative
and same-site absolute URLs, trailing slash and encoded safe slugs. Query/hash
are ignored for metadata lookup only: the anchor retains its exact destination.
Fragment-only, external, unsafe, unsupported and missing/deleted targets do not
open previews. Aliases resolve only if their current destination is eligible.

Mouse hover or keyboard focus opens after 350ms. A 140ms departure grace permits
pointer transit into the noninteractive panel; focus or pointer presence keeps it
available. Escape hides it without changing focus and suppresses reopening until
the link is left. Scroll/resize repositions the panel; an offscreen source closes it. Panel scrolling stays
available. Route changes/unmount clear timers and scheduled measurement. A single
controller prevents overlapping previews during rapid transitions.

The noninteractive `tooltip` provides content type/excerpt via `aria-describedby`.
The destination title is included in the description unless it exactly repeats
the link label; the visual title is then hidden from assistive technology. The original link name,
focus styles and tab order remain intact; there are no focusable tooltip children.
No click, activation, touch or context-menu event is intercepted. Touch-generated
focus does not open it; one tap follows the ordinary link. There is no animation,
including under reduced motion. Existing theme tokens supply colors. The measured
panel is clamped to the visual viewport, wrapping and scrolling at narrow widths
and increased text size. Static/prerendered anchors need no preview JavaScript;
initial SSR/hydration renders no panel.

Regression coverage is in `scripts/link-previews.test.mjs` (unit tier) and
`tests/e2e/link-previews.spec.ts` (existing browser projects). Browser tests insert
synthetic contextual anchors into a real production article using real public
metadata; they do not publish fixtures or certify the separate editorial link
approval workflow. Screenshots cover both themes and edge/reflow placement.
Run build, lint, unit/built tiers, preview browsers, accessibility and themes after
changes. Full browser acceptance is separate from fast PR CI, which skips browsers.
