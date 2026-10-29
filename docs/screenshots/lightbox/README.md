# Article image lightbox evidence

These are losslessly encoded browser screenshots of non-sensitive fixtures, never
published articles. Desktop and mobile Chromium capture both themes at fit size
with a visible caption/gallery position, and at 300% detail zoom. The same focused
journeys also run in desktop and mobile WebKit.

Run `node --test scripts/rich-content.test.mjs` with browser prerequisites installed.
The isolated build includes real converter-generated native Notion figures as well
as manually authored MDX. Original PNGs, axe JSON reports and failure traces live
in `artifacts/rich-content/`; these representative WebP copies are review evidence.
Final-head results and any unresolved acceptance are recorded in PR #213 and #59.
Screenshots alone do not establish screen-reader or physical-device acceptance.
