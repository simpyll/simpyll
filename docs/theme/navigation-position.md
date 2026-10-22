# Theme reveal navigation position (#101)

## Report and evidence limits

Android Chrome screenshots show the floating capsule higher during the circular reveal than after it, while the hero text appears unchanged. The displacement is consistent with the nonzero sticky inset, but that is a hypothesis, not a confirmed device root cause.

The initial unchanged-main capture run used real Chromium View Transitions in desktop and Pixel 7 emulation. At the top, scrolled sticky positions and /#work, both theme directions kept the marked capsule border at CSS y=24..81 in all five captured frames. Thus it did **not** reproduce the reported displacement. That first run's test cleanup incorrectly attempted to finish an animation that had already naturally finished at its last sampled frame; this was corrected without removing position assertions. Subsequent baseline runs retain all geometry and painted-bound checks. A compact 360px mobile viewport also exercises the overflow layout in the report.

No physical Android device/browser toolbar is available here. Mobile emulation does not reproduce browser chrome, toolbar collapse or compositor/device differences. Passing emulated captures cannot prove that the physical-device report is fixed. Keep the proposed fix in draft until that behavior is verified.

## Candidate correction

The header previously supplied its visual spacing through `position: sticky; top: max(.75rem, env(safe-area-inset-top))`. The capsule is already relatively positioned. Move the same inset to that capsule's relative `top`, and stick the header at `top: 0`.

This preserves the capsule's viewport position and its reserved document-flow height both at the page top and when scrolled. It eliminates reliance on a nonzero sticky displacement in snapshots. It uses the exact existing inset rather than an estimated compensation. The safe area, theme toggle center, glass surface, reveal implementation, navigation measurement and motion tokens are unchanged. No new animation owner, observers, listeners or dependencies are introduced.

This is a narrowly scoped mitigation for the suspected snapshot/sticky interaction; a device-specific root cause remains unconfirmed.

## Real-rendering regression

`tests/e2e/theme-position.spec.ts` marks the capsule border with an invariant color (no layout changes), starts the actual theme reveal and pauses the native animation at 0%, 20%, 50%, 85% and 100%. Screenshots use CSS-pixel scale. An off-DOM canvas reads the painted border bounds, independently of `getBoundingClientRect`, so a snapshot-only displacement can fail even when DOM geometry is stable. Each case also records live position/size, scroll and focus, then compares settled geometry. Intermediate samples must still have a live transition. Existing tests retain origin, full coverage, cancellation and fallback checks.

The matrix covers desktop and compact mobile, both theme directions, page top, a scrolled sticky state and /#work. Artifacts include before/after PNGs, intermediate PNGs and geometry.json. Baseline/candidate CI links and final results are recorded in the PR.

## Primary references

- [W3C View Transitions: snapshot containing block](https://www.w3.org/TR/css-view-transitions-1/#snapshot-containing-block-concept): transition pseudo-elements paint in their own snapshot coordinate space.
- [Chrome: debugging view transitions](https://developer.chrome.com/blog/view-transitions-in-2025): pause and inspect actual transition animations/pseudo-elements.

These describe the rendering model and debugging technique; they do not establish this report's root cause.
