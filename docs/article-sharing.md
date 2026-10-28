# Article sharing and social cards

Article headers use the existing Button and theme tokens. Share article invokes
Web Share when available and copies the canonical URL otherwise. Copy link is
always available. Cancellation does not copy anything; other native failures
suggest Copy link. Clipboard rejection exposes a read-only, selectable URL for
manual copying. Feedback is a polite live region; no network service, tracking,
or third-party share buttons are involved. Native share success means the browser
resolved its share promise, not proof of delivery to another person.

`npm run build` regenerates `src/generated/articles.json` using the existing MDX
metadata parser. During prerendering, `scripts/social-cards.mjs` uses the existing
Sharp dependency to write one 1200 × 630 PNG per article into `dist/social-cards`.
Nothing must be drawn or committed per article. Client-only Vite builds are not
publishable substitutes for the full build. Local development share controls work
without generating cards; preview social metadata with the full build.

The shared `src/lib/social-card.mjs` naming function connects BlogPost metadata to
those output files. The existing SEO component still owns canonical, OG and
Twitter text; it adds absolute PNG URLs, dimensions, type and alternative text for
articles. `getSiteUrl` respects Vite's configured base for both canonical URLs and
cards. The production custom domain uses `/`. Cards live in the static Pages
artifact and do not require JavaScript to discover or a server to render.

The template uses the site's dark canvas, foreground and mint accent. Pango wraps
actual glyphs (including unbroken words), shrinking titles to fit a bounded area.
Optional category/author context is omitted when absent and bounded to 50
characters. Titles remain complete; an extreme title that cannot fit at 12px
fails the build rather than silently clipping. System sans fonts come from the
build environment, so exact rasterization may vary by OS; CI uses Ubuntu. No
remote fonts/assets are fetched. Keep these colors in sync when rebranding, and
review short/long title PNGs after changing typography, Sharp or the CI OS.
Social networks may cache an older image until they recrawl the article.

Validation: `npm run build`, `npm run lint`, `npm run test:unit`,
`npm run test:built`, and `npm run test:e2e:built`. The built tier covers every
article's static canonical/OG/Twitter tags and actual PNG files, plus synthetic
long, unbroken and escaped titles. `article-share.spec.ts` exercises native
success, cancellation, failure, unsupported sharing, clipboard success/failure,
keyboard operation, layout and axe. Browser API mocks cannot verify an operating
system share sheet or recipient delivery; manually smoke-test those on a device.

This implementation does not update issue priority or establish Cortex handoff
acceptance.

## Implementation validation (October 28, 2026)

- Full production build, asset budgets, SEO audit, lint and diff checks pass.
- Deterministic unit suite: 407 passed. SEO suite: 25 passed. Built-output suite:
  147 passed, including the three new card/metadata/base-path cases.
- Focused Firefox share journeys: four passed, desktop and 390px touch viewport,
  each in light/dark mode. Screenshots of controls, failure fallback and short/
  long cards were visually inspected. Existing Firefox accessibility suite:
  53 passed, including both themes, keyboard, motion and narrow text reflow.
- Local Firefox required `MOZ_DISABLE_CONTENT_SANDBOX=1` in this container.
  The ordinary full browser command initially stopped at Firefox crashes;
  Chromium installation returned truncated ZIP downloads. The complete
  Chromium/WebKit browser matrix and real device OS share sheets remain
  unverified. Focused browser tests mock Web Share and Clipboard API outcomes.
- Validation exposed an existing Pulse assertion that mistook the public tag
  `evidence-based medicine` for a leaked diagnostic field. Its check now matches
  forbidden JSON property names while retaining the private-path check; no
  production Pulse code or published metadata changed.

These focused results do not establish full-browser or Cortex acceptance.
