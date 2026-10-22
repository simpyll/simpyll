# Floating navigation (#51)

## Architecture

A top-centered viewport-fixed header keeps the capsule independent of document scrolling and sticky compositor offsets. A noninteractive flow slot reserves its measured height, including wrapped controls; before hydration its CSS fallback matches the default header height. Without JavaScript, the slot is hidden and the accessible header returns to document flow. Safe-area offsets are preserved. Existing sections remain Projects (`/#work`) and About (`/#about`); Journal links to the existing `/blog` route and stays active on articles. Home links to `/`. No new pages or dependencies.

Navigation capacity is measured rather than breakpoint-driven. The configured order (Home, Projects, Journal, About) defines a stable prefix priority. Measure intrinsic label widths using inert, aria-hidden spans with the same typography/padding; subtract header safe-area padding and capsule border/padding; include measured theme control and actual gap widths. First test every destination without More. If that fails, reserve More and take the largest prefix that fits. The remaining suffix alone renders in the disclosure. Each destination has one real anchor.

ResizeObserver watches the stable available header box, intrinsic measuring spans and theme control. Its measurement also updates the flow slot to the actual header height. Resize/font readiness notifications batch into one scheduled measurement; no scroll or persistent animation loop. The measured available box is independent of the capsule's shrink-to-fit width, preventing feedback oscillation. Actual fractional widths are compared without rounding. Font changes, longer labels, new destinations and zoom naturally change measurements. Zero visible links leaves More plus theme. Measuring content is noninteractive, inert, hidden and excluded from accessibility.

More is a nonmodal disclosure with normal Tab/link semantics, Escape with trigger focus restoration, outside-pointer dismissal and dismissal when focus leaves the nav. Route selection closes it; the central route controller owns destination focus. On resize, a focused moved link is refocused at its new visible location; if demoted into closed overflow, focus returns to More. If More disappears, focus moves to the active/first primary destination. Theme focus is left untouched. No scroll lock or focus trap.

SSR and initial hydration use the same conservative More-plus-theme layout. Without JavaScript, noscript CSS exposes all links as a wrapping row. Initial post-hydration measurement expands the capsule in its reserved header row. The indicator measures primary link offsets after capacity/route changes; overflow active state uses the same semantic accent background. #92 tokens and reduced motion remain intact.

#93 is present in base commit 3676159 (merge #97). ThemeToggle is reused unchanged, so its reveal origin comes from its current bounding rectangle and its provider remains authoritative. Footer System selection remains intact.

## Reference research

Inspected `itsEricWu/ericwu.me` components/nav/site-nav.tsx, lib/motion.ts and styles/globals.css. Appropriate patterns: compact rounded glass container, separate active layer behind labels, single backdrop-filter layer, centralized spring motion, theme control inside the same capsule. Adapted these principles with Simpyll's semantic colors and motion tokens.

Did not adopt drag-to-select, refractive SVG filters, custom view store, equal-width index offsets, Next router or localization infrastructure. Real React Router links support variable widths and standard history. The reference live website could not be retrieved from this environment; no claim of visual parity is made.

## Verification

Issue #99 adds capacity boundary/fractional-width tests, generic future-destination and longer-label cases, unique/complete visible link assertions, resizing both directions, constrained container/More-only mode, increased typography, focus migration and a narrow no-JavaScript navigation test. Existing route/keyboard tests now open the disclosure only when their destination is absent from the primary row. Light/dark screenshots cover narrow, intermediate and wide layouts.

Local lint, TypeScript, client/server build, prerender and Node checks are run before publishing. Chromium installation in this environment previously returned truncated ZIPs; GitHub Actions runs the complete desktop/mobile browser suite and retains screenshots/reports. See the linked PR for final CI results and visual inspection. Physical-device screen reader and real mobile browser keyboard checks remain manual limitations.

## Performance and compatibility

One modest blur layer with 92% surface tint and an opaque fallback (including reduced-transparency preference). No animation loops or scroll listeners. ResizeObserver, resize listener and disclosure listeners clean up on unmount. Indicator movement uses transform; width transitions accommodate variable text widths. Focus rings, touch targets and forced-colors active outlines are independent of decorative animation. The centralized [route restoration controller](route-restoration.md) owns scroll/history and destination focus (#57).
