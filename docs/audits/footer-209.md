# Footer refinement — #209

## Audit and scope

Audited main `be82e03b00d33d1d32a90f800123409929f9d113`, AGENTS.md,
issue #209 (no comments), roadmap #89 and its comments, merged #210,
`docs/CI.md`, current validation workflow, footer implementation, contribution
resolver, and all footer/name/href matches in deterministic and browser tests.
The open-PR query returned no open PRs at audit time. Historical roadmap main/PR
snapshots are superseded by this inspection. #210 is merged, not a pending draft.

The baseline desktop home footer was observed in the cloud browser: redundant
wordmark, separate Contact text, isolated contribution, horizontal legal links,
left-aligned copyright. This is only a baseline observation, not candidate
acceptance or a portable before/after screenshot set.

## Design

Use the existing container, tokens, inline SVG convention, 640px breakpoint,
44px controls and global visible-focus styling. The upper area has Connect then
Legal in DOM order, two equal desktop columns, deliberately stacked on narrow
screens. Contact is an envelope linking internally to `/contact`, first in the
same list as the existing social icons. All four icons share styling and visible
hover/keyboard-focus labels. Contribution is an underlined secondary utility
beneath that row. Legal remains a visible vertical list in its existing order.
Copyright spans both columns, centers at every width and follows a subtle divider.
The standalone footer wordmark is removed; header branding and copyright remain.

The contribution resolver, useSyncExternalStore static-404 safeguard, build-time
year, primary theme switcher and preference persistence are unchanged. No content,
published tags, Notion data, dependencies or unrelated design work changed.

## Regression inventory

- Footer composition now asserts wordmark removal and Contact icon route/name.
- Added home/article light/dark layout, 320/768/1440px, 200% text reflow, axe,
  legal routes/order, 44px icons, nonwrapping row, final full-width centered
  copyright, keyboard sequence, focus label and Contact navigation checks.
- Existing source-aware contribution journey retains ordinary, repository article,
  Notion article, project, profile and direct missing-route checks; adds explicit
  label assertions. Hydration errors and failed assets remain asserted.
- Accessibility keyboard journey now includes Contact before social links.
- Theme suite drops the obsolete footer-wordmark contract; retains theme behavior,
  primary controls, persistence and no-footer-theme assertions.
- Built prerender suite adds semantic footer/list/link and contribution contracts
  on home, both article source types and the static 404 document.
- Existing navigation, missing-page, accessibility, theme and contribution suites
  retain their assertions and rules. No exclusions, timeout increases or skips.

## Acceptance and owner action

Exact-head command results belong in the PR validation record. Current CI policy
runs deterministic/build/security checks on normal PRs but intentionally skips
browser, fixture and performance jobs. A green PR validate is not browser evidence.

Both fresh official Chromium and headless-shell download attempts returned
0 MiB/truncated archives (`End of central directory record signature not found`).
No system Chromium was available. The cloud browser can inspect the live baseline
but exposes no viewport sizing or local candidate server connection. GitHub's
workflow page in that browser is signed out; the connected GitHub API has no
workflow-dispatch tool. No browser assertions or candidate screenshots are claimed
from these observations.

Before merge, an owner must run **Validate Simpyll** on this PR's exact head branch
with `full_matrix=true`, inspect all three browser shards (including axe, keyboard,
footer, themes, navigation and direct unknown-route hydration), fixture results and
aggregate validation. Inspect advisory performance separately. Resolve any failures
without suppressing assertions. Capture and review baseline/candidate desktop and
mobile in light/dark, home and an article contribution state; include 320px,
tablet, desktop, zoom/reflow, no overflow/overlap/wrapping and unclipped focus.
The new footer tests attach candidate screenshots when executed; baseline can be
built from the audited main SHA. Add the actual screenshots and exact-SHA results
to the PR before marking ready. Keep #209 open and this PR draft while blocked.

This focused framework change is under roadmap #89 and does **not** complete #82.
#82 remains the eventual final project-wide acceptance task after content work.
