# Unified article discovery (#4)

`/explore` is the canonical discovery page. Journal cards and article taxonomy
links use `TaxonomyLink` and `discoveryUrl`; global navigation search includes an
“Explore all articles and filters” link. On Explore that link preserves taxonomy
filters. Existing instant global results, keyboard selection and article opening
remain intact. The Journal layout and floating capsule positioning are preserved.

## Content and search

The existing AST-based `generate-search.mjs` produces the single public index.
Records add stable article identity (existing articleId or blog:slug), canonical
URL, blog type and publication date to the existing title/description/category/
tags/body fields. No authoring changes, independent taxonomy pages or indexing
engine are needed. Publisher-owned files are untouched. Draft/unpublished/private
statuses and test fixtures remain excluded, and redirect aliases are not scanned.
The public-only content validator remains the publishing gate. Private content
must never enter this directory; indexing exclusions do not secure other loaders.

`prepareSearch` retains #11's normalization, AND prefix terms and title > taxonomy
> description > body ranking. Its optional limit remains eight for navigation;
discovery requests all matches before applying filters. No dependency was added.
`prepareDiscovery` prepares search once per index, composes filtering and sorting,
and deduplicates canonical slugs. Publication dates are the only reliable date
field today; no updated/popularity sorting or fictional content types are shown.

`search-index.ts` owns the existing validated lazy loader, in-flight request and
session cache, shared by navigation and discovery. The server alone imports the
index and supplies it through `DiscoveryData`. Only the Explore prerender emits
it as safely escaped JSON; hydration reads that same payload and seeds the cache.
The browser JS bundle does not contain a second index. Direct Explore visits need
no index request. Client entry from another route uses at most one shared request;
subsequent control changes are entirely local. Failure offers retry and never
fabricates results. Empty indexes are supported. An already-open tab retains its
loaded index until reload, as in #11.

Future content types should add validated published records to this same generator
and widen the record type/URL builder deliberately, then add type URL/filter UI
and tests. There is currently no published projects/notes index to integrate.
Do not manufacture records from homepage preview cards.

## URL and matching contract

| Parameter | Meaning |
| --- | --- |
| `q` | NFKC, trimmed/collapsed whitespace, up to 160 characters |
| repeated `category` | OR across selected categories |
| repeated `tag` | OR across selected tags |
| `sort` | newest, oldest, relevance (with a meaningful search) |

Search, category and tag dimensions combine with AND. The interface states this.
Taxonomy IDs use NFKC, collapsed whitespace and lowercase, keeping punctuation
and Unicode significant (C++, C# and C are distinct). Display labels come from
published metadata. Unknown taxonomy IDs stay visible as removable chips and
match nothing. Unknown parameters are removed, repeats deduplicated and sorted,
and unsupported sorts fall back safely. URLSearchParams handles encoding.

The default sort is relevance when searching and newest otherwise. Defaults are
omitted. Dates sort numerically; missing dates use epoch zero (last for newest,
first for oldest). Slug order resolves ties; relevance keeps #11's slug tie-break.
Typing replaces URL state after 300ms, and Enter commits immediately. Deliberate
filter/sort/removal/reset actions push history. Back/forward restores all URL
state and cancels stale drafts. Clear filters resets query, taxonomy and sorting.
Clear search preserves taxonomy and explicit chronological sorting. No keystroke
history trail or separate persistent search state is introduced.

## Rendering, SEO and interaction

Build produces `dist/explore/index.html`, useful unfiltered cards, native taxonomy
links, canonical `/explore` metadata and one sitemap entry. Pages resolves the
directory index for direct query URLs; it does not require a SPA 404 workaround.
Hydration first matches the static shell, then React's hydration-aware external
store restores query state. Fixed search/filter slots and a bounded scrolling
chip area keep controls and result origin stable. Card contents intentionally
change with results; no layout animations or separate scroll owner are added.
The existing RouteNavigation preserves control focus on query changes.

All query variants canonicalize to `/explore`. Hydrated parameterized states also
set noindex,follow without removing the canonical. On static hosting their initial
HTTP HTML is the same canonical base shell; client robots directives require a
JS-capable crawler. Canonicalization is a hint, not a guarantee against indexing.
No query combinations are prerendered or included in the sitemap. Without JS the
base archive remains useful; query filtering requires JS.

Native details/summary disclosures and labeled checkboxes work with keyboard and
touch on desktop/mobile. The panels overlay their reserved control slots, remain
viewport-bounded and scroll when needed. Search and select controls, removable
chips and reset have visible global focus styles and 44px targets. Chips wrap
inside a bounded area rather than pushing results down. Results use article
semantics, separate taxonomy/title links (no nested anchors), stable keys and a
polite atomic count. Counts change with debounced URL updates; focus stays in the
current control. No animation dependency or new motion is introduced, so existing
reduced-motion behavior remains authoritative. Colors use semantic theme tokens.

## Validation

Run `npm run build`, `npm run lint`, `node --test scripts/discovery.test.mjs
scripts/search.test.mjs scripts/prerender.test.mjs`, and `npx playwright test discovery`.
`npm test` runs the full suite; PR CI explicitly includes discovery unit tests and
the complete desktop/mobile Chromium suite, including axe and reduced motion.
Discovery browser tests cover taxonomy navigation, combined state, reload,
back/forward, chip removal/reset, unknown/empty/error states, keyboard, both themes,
canonical/robots, no redundant index request and fixed capsule/control dimensions.
CI uploads desktop/mobile light/dark screenshots under docs/discovery in its
playwright-results artifact. Browser automation does not prove physical-device,
iOS keyboard/toolbar or screen-reader conformance. Firefox/WebKit are not part
of the repository's current required projects; do not claim those runs.
