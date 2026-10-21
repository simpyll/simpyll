# Floating navigation (#51)

## Architecture

A top-centered sticky capsule preserves its space in document flow, stays clear of mobile bottom toolbars/virtual keyboards and uses safe-area offsets. Existing sections remain Projects (`/#work`) and About (`/#about`); Journal links to the existing `/blog` route and stays active on articles. Home links to `/`. No new pages or dependencies.

At widths below 40rem, Home, Journal, More and the existing theme toggle remain visible. More is a nonmodal disclosure with normal link/tab semantics, Escape with trigger focus restoration, outside-pointer dismissal, and dismissal when focus leaves. Navigation closes it and focuses the destination section/main. No focus trap or scroll lock: surrounding content remains usable. This implements the issue's later floating-pill enhancement rather than its original hamburger/modal drawer proposal.

The indicator measures link offsets after route changes and with one ResizeObserver. CSS uses #92's spring and duration tokens; reduced-motion duration becomes zero. Initial SSR uses a static active background, progressively replaced by the measured capsule. Unsupported measurement/animation leaves real links functional. Narrow layouts hide section links in the main row but keep them in overflow. With JavaScript disabled a noscript style exposes every destination without a disclosure.

#93 is present in base commit 3676159 (merge #97). ThemeToggle is reused unchanged, so its reveal origin comes from its current bounding rectangle and its provider remains authoritative. Footer System selection remains intact.

## Reference research

Inspected `itsEricWu/ericwu.me` components/nav/site-nav.tsx, lib/motion.ts and styles/globals.css. Appropriate patterns: compact rounded glass container, separate active layer behind labels, single backdrop-filter layer, centralized spring motion, theme control inside the same capsule. Adapted these principles with Simpyll's semantic colors and motion tokens.

Did not adopt drag-to-select, refractive SVG filters, custom view store, equal-width index offsets, Next router or localization infrastructure. Real React Router links support variable widths and standard history. The reference live website could not be retrieved from this environment; no claim of visual parity is made.

## Verification

Lint, TypeScript, client/server production build and prerender pass. All 64 Node tests pass after updating the Journal destination assertion.

Playwright tests added for direct routes/history, theme integration, 320px controls, Escape/return focus, section focus, outside dismissal, reduced motion, resize alignment and screenshots at 320/1280 in light/dark. Existing navigation tests updated for the new destinations/disclosure. Local execution is blocked: Chromium and headless-shell downloads return invalid/truncated ZIPs; no browser is installed. CI runs the complete suite. Screenshot outputs are retained in the validation artifact on every run.

Before marking ready, inspect CI screenshots and verify keyboard navigation, both themes, 200%/400% browser zoom, portrait/landscape, real mobile browser/virtual keyboard, screen reader, and unsupported backdrop-filter rendering. These manual checks have not been claimed as complete. No screenshot or animation demonstration has yet been captured locally.

## Performance and compatibility

One modest blur layer with 92% surface tint and an opaque fallback (including reduced-transparency preference). No animation loops or scroll listeners. ResizeObserver, resize listener and disclosure listeners clean up on unmount. Indicator movement uses transform; width transitions accommodate variable text widths. Focus rings, touch targets and forced-colors active outlines are independent of decorative animation. Route focus/scroll enhancement applies to explicit navigation; a global history scroll-restoration system remains #57's scope.
