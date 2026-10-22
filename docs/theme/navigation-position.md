# Floating navigation scroll and theme stability (#101)

## Report and evidence limits

Android Chrome screenshots report the capsule rising during theme changes and becoming partly clipped under the browser toolbar after a small ordinary scroll on /blog. This expands the investigation beyond the theme animation alone.

The unchanged-main diagnostic baseline (CI run #20) passed real native-transition frame tests at top, scrolled positions and /#work in desktop and compact 360px Chromium emulation. The marked border had zero measured displacement. This did not reproduce the physical-device defect. Emulation does not recreate Android browser chrome or compositor behavior, so the device-specific cause remains unconfirmed.

## Positioning correction

Replace the sticky header with a viewport-fixed anchor (`position: fixed; inset-inline: 0`) using the original safe-area-aware top offset and capsule padding. The capsule no longer has a sticky threshold or a nonzero sticky compositor displacement that could be lost during scrolling/snapshotting. No scroll listeners or guessed compensating translations are used. The capsule stays at the same intended viewport coordinates.

A noninteractive `navigation-slot` reserves document-flow height. Its CSS fallback matches the default 82px header at normal text size; the existing ResizeObserver measurement synchronizes it to actual header height, including wrapped controls and enlarged text. No new observer is needed, and changes to the slot cannot change the fixed header's width. Without JavaScript, the slot is hidden and the header returns to document flow with all links accessible.

This supersedes the earlier draft proposal to move the sticky inset to a relatively positioned child. The circular reveal implementation, measured capacity partition, active links, focus handling, theme provider and motion tokens stay unchanged. No dependencies added.

## Validation strategy

`navigation-scroll.spec.ts` exercises 1/4/8/12/16/24/48/96/260px scrolling in both directions on Home, Journal and an article, checks full capsule visibility and actual control hit testing, verifies stable viewport coordinates and unchanged reserved height, and repeats after viewport-height changes. It also checks wrapped text and a larger top inset.

`theme-position.spec.ts` uses real document.startViewTransition, marks only the capsule border with an invariant diagnostic color, and pauses the actual animation at five progress points. Off-DOM canvas decoding measures screenshot pixels independently of live DOM geometry. Both theme directions, compact mobile/desktop and top/scrolled/fragment states are covered, alongside scroll/focus and overflow checks. Existing reveal-origin, coverage, cancellation, persistence, reduced-motion and unsupported-browser tests remain enabled.

CI links and intermediate-frame artifacts are recorded in the PR. Physical Android toolbar and visual-viewport behavior remains a required manual verification limit; do not claim that passing emulation proves the exact device defect resolved.

## Primary references

- [W3C View Transitions: snapshot containing block](https://www.w3.org/TR/css-view-transitions-1/#snapshot-containing-block-concept)
- [Chrome: debugging actual view transition animations](https://developer.chrome.com/blog/view-transitions-in-2025)

These describe the rendering model and technique, not a confirmed root cause of this device report.
