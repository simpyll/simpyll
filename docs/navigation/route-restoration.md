# Route scroll and focus (#57)

Previously only Header clicks scheduled a scroll/focus callback. Journal/article
links and POP navigation had no owner, MDX headings had no generated IDs, and the
anchor margin was a fixed value unrelated to the measured header.

`RouteNavigation` is the single BrowserRouter scroll/focus owner. The old Header
callback is removed; Header still owns disclosure state and capacity focus.
Because BrowserRouter does not coordinate native restoration with React commits,
this component sets `history.scrollRestoration = manual` while mounted and restores
the previous setting when removed. It never modifies history just to restore scroll.

- Different-path PUSH/REPLACE: instant top reset in a layout effect, then focus the
  primary heading with preventScroll. Its spoken heading is the route announcement;
  no extra live region repeats it. SEO remains the title owner for all routes.
- POP: per-entry coordinates, bounded to 100 entries, optional sessionStorage on
  pagehide. Capture clicks/popstate before outgoing content can shrink. One passive
  scroll listener saves current coordinates without layout reads. Page-history POP
  does not move focus. Missing entries leave the browser position alone, or resolve
  the fragment when supplied.
- Fragments: compile-time deterministic MDX IDs are identical in HTML and client
  bundles. Native same-document anchors receive distinct router entries, except
  skip links, downloads, other targets and modified clicks. After commit, wait for
  header measurement/fonts/target or adequate document height; scroll once, then
  focus with preventScroll. A bounded 120-frame retry is cancelled by navigation,
  unmount, wheel, touch or scrolling/Tab keys. Stale coordinates clamp after the
  bound. No persistent measurement loop or repeated settled-position corrections.
- Initial hydration: no route announcement/top reset. Initial fragments resolve
  after readiness; ordinary prerendered pages preserve initial browser position.
- Same-route/query interactions preserve focus/scroll; theme state is not a route
  dependency. History between same-page fragments focuses the fragment; between
  pages it preserves reading position without focus theft.

Header's existing batched measurement publishes its actual bottom plus 16px to
`--navigation-clearance`. CSS scroll-margin consumes it for all IDs, overriding
legacy section utility margins. The fixed header and reveal animations stay intact;
no global scroll-anchoring change. Restorations are instant even when CSS smooth
scrolling is enabled, avoiding animated intermediate restoration. Focus styling
continues to use :focus-visible, preserving keyboard rings.

## Verification and limits

New Playwright coverage uses both existing desktop and Pixel projects for route
reset, title/heading focus, skip link, history, native fragments, initial MDX deep
links, hydration errors and theme-adjacent navigation. Existing navigation-scroll
and theme-position suites retain viewport and actual reveal-frame checks. Node
coverage validates heading collisions/formatting/Unicode and prerender output.

Physical Android browser toolbar/compositor behavior and spoken output in real
screen readers require manual checks. Emulation cannot establish those outcomes.
Content is currently eagerly rendered MDX; the bounded pending restoration can
wait for commits/height changes but does not promise restoration after an unbounded
future network load. A missing hash leaves the page usable without focus theft.
