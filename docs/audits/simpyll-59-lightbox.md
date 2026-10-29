# Article image enlargement and galleries (#59)

## Scope and audit

The October 28 owner selection in roadmap #89 supersedes #59's historical
“deferred” status. This PR implements #59 only; #25, #40 and #86 remain the next
features in that order. Content work remains later and #82 remains the last
project-wide acceptance gate. This feature has not been merged or deployed.

Audited initial main `31c0649f2b955cc5e235e6759252f43de40a7b42`, AGENTS.md, #59 and
its empty discussion, #89 and owner direction, current open PRs (none matching),
merged responsive-image foundation #108, MDX/image/Notion authoring contracts,
image tests, the rich-content isolated build and browser/accessibility helpers.
The seven current articles have one manual Figure and no native or Markdown
image elements. Converter-generated native figures are exercised using isolated
Notion fixtures, rather than editing or publishing an article to demonstrate UI.

## Implementation

- Keep the existing ArticleImage pipeline, optimized formats, intrinsic dimensions,
  responsive sources, alt text, captions, lazy-loading overrides and original URLs.
- Enhance only descriptive, noninteractive images after MDX hydration. Linked
  images, controls, decoration and explicit opt-outs retain their behavior.
- Add explicit Gallery boundaries through the existing registry. Ungrouped images
  and imported native figures open individually; gallery navigation never wraps.
- Use a native modal for the top layer/background inertness, plus explicit Tab
  wrapping, initial Close focus, Escape and origin/scroll restoration on cleanup.
- Defer dialog code/styles. Reuse responsive candidates in the modal; size and pan
  the fitted image rather than magnifying empty letterboxing. Provide 100–400%
  zoom, scroll/keyboard/mouse/touch panning, horizontal fit-size swipe navigation,
  and native pinch zoom. No animation is introduced.
- Keep Close and original-image recovery available during loading/error states.
  Captions remain text in the modal and retain their rich markup in the article.

No dependencies/services, image regeneration policy, content bodies, dates,
identities, slugs, publication eligibility, tags, ownership or source media URLs
were changed. No private Notion data or signed URLs are used as evidence.

## Focused corrections found during verification

The reflow journey exposed a footer label extending beyond the viewport at 200%
text size. Center the existing labels without changing the footer composition;
equivalent grid rules retain the unchanged CSS budget. The footer keyboard test
now enters from the final main-content control, then exercises every footer
control, so long articles cannot exhaust a fixed global Tab count first.

The built Pulse privacy assertion matched the public tag “evidence-based medicine”
as if it were a private field. It now matches private diagnostic keys, retaining
workspace-path rejection and strict recursive schema validation. A regression case
allows ordinary editorial vocabulary and still rejects every prohibited key.

The broader reading journey also exposed a TOC sampler holding an empty heading
list when an article body arrived after client navigation. Measurement now
refreshes heading nodes before computing positions, preserving active-section
tracking for deferred MDX. Existing cross-browser reading journeys cover this
regression.

## Evidence and outstanding acceptance

The representative lossless screenshots are in `docs/screenshots/lightbox/`.
The rich-content harness builds temporary manual and actual converter-generated
fixtures, then runs the new lightbox cases plus existing rich-content and print
journeys on desktop/mobile Chromium and WebKit, plus desktop Firefox. Normal browser runs intentionally
skip fixture-only routes; the isolated harness executes them instead.

Final published-head commands, counts, CI checkout identity, actual browser results
and unresolved actions are maintained in PR #213 and issues #59/#89. Do not infer
acceptance from screenshots or a green fast PR job. The final full browser gate
must be reconciled before merge, including Firefox; screen-reader listening and
physical-device pinch/swipe review remain explicit manual acceptance.

Local browser capabilities were rechecked. Chromium 153 was obtained separately
from the repository through the npm-packaged @sparticuz/chromium binary; no broken
pinned Chromium download was repeated. Pinned Playwright FFmpeg and WebKit were
installed, and official Ubuntu libraries were extracted for the local WebKit run.
Firefox 157 starts but its content process crashes when this host refuses
`/proc/self/uid_map` with EPERM. No browser sandbox or test rule was disabled.
The available GitHub Actions browser remains signed out, and the GitHub connector
has rerun/read tools but no workflow-dispatch operation. Owner-run full manual CI
is therefore still needed for acceptance the local host cannot establish.

## Current-main reconciliation

Main advanced to `7bb6505cf14f21d0fe4a7ca3beb4ae6ad65dffaf` while this
work was underway. Integrate it without rebuilding the separately merged #214
article-sharing work or changing synchronized content. Resolve only the shared
BlogPost imports and browser-suite selection so both features retain their tests.
Final-head verification supersedes earlier branch snapshots.
