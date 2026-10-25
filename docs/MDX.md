# Rich technical articles

Articles still export literal `metadata` and render through `BlogPost`. The typed
`src/components/mdx/mapping.ts` registry is provided by `MDXProvider`; standard
Markdown keeps its native semantics. `remarkRichContent` routes the publisher's
explicit native JSX through the same components. Add a component to the registry
rather than importing presentation logic into the publisher. React props are typed;
MDX itself remains trusted source code and its author props are not typechecked by
TypeScript. Content validation and fixture builds check compilation and rendering.

## Authoring

Use ordinary Markdown for headings (start at H2), nested lists, links, quotes,
fenced code, GFM tables and footnotes. Supply a fence language such as `typescript`,
`python`, `bash`, or `json`. Unknown languages remain readable plain text.
`rehype-highlight` runs only at build time; its output is shared by prerender and
client builds. No highlighting engine is shipped to browsers. It and `remark-gfm`
are build dependencies, adding tables/footnote parsing rather than a client UI kit.

```mdx
<Callout variant="warning" title="Configuration">

Review the deployment target before running this command.

</Callout>

<Figure src="/images/diagram.png" alt="Describe the diagram's meaning"
  width={960} height={540} caption="An explanation of the result." />

<Disclosure title="How does this work?">

Nested Markdown can explain the details here.

</Disclosure>

<Embed url="https://github.com/simpyll/simpyll" title="Project source" />
```

Callout variants: `note`, `tip`, `information`, `warning`, `important`. Every
variant has a text label, with neutral complementary semantics rather than an
interrupting alert. Figures accept rich captions; provide meaningful alternative
text (empty alt only for decoration) and known dimensions to reserve image space.
Existing Notion figure/img/figcaption output is preserved. Lightboxes remain #59.
Native details/summary also work. Tabs were omitted: stacked examples and native
disclosures are sufficient here and avoid extra keyboard and client state costs.

Tables keep native table elements inside a labeled, keyboard-focusable scrolling
region. The persistent scroll hint is intentionally deterministic before/after
hydration. Markdown table headers default to column scope; explicit row headers
can use `<th scope="row">`. Set a caption on complex manually authored tables and
use explicit `headers`/`id` associations for multilevel headers.

Code preserves source whitespace; the toolbar shows the language and provides a
keyboard-accessible copy button with live success/failure feedback. Copy requires
JavaScript and Clipboard API permission; selecting code remains the fallback.
Highlight colors use the GitHub-style syntax roles described below. No article animation is introduced.

## Notion compatibility and safety

The publisher emits only fixed trusted element names and JSON-encoded text and
attributes. It never evaluates Notion text as MDX/JSX. Supported content includes
paragraphs, H1–H3 (rendered H2–H4), nested bullet/number lists, quotes, callouts,
toggles, code with language labels, images/captions, links, dividers, and simple
tables with column and/or row headers. Callouts use `note` because Notion does not
have a semantic variant field. The icon is not used as a guessed severity.

`remarkRichContent` decodes only JSON string literals inside publisher code blocks
into ordinary code nodes for build-time highlighting. It never executes an
expression. Both Markdown and Notion headings get deterministic deduplicated IDs.
The existing durable image downloader, manifest ownership, status recheck and
idempotence rules remain in place. Generated articles are regenerated only by the
publisher; do not hand-edit its owned files.

Unsupported blocks (including embeds, synced blocks, subpages/databases, equations,
mentions and other non-text rich text) abort the complete synchronization with a
block-type error and preserve the last published version. This existing fail-closed
policy prevents silently losing meaningful or private content. Replace unsupported
blocks with ordinary text/links or supported images before publishing. Invalid
URLs and malformed tables also abort before writes.

Links reject executable protocols, controls, backslashes and embedded credentials.
Ordinary external links remain in the current tab and show a visual external mark;
explicit new-tab links get `noopener noreferrer` and screen-reader context.
Root-relative internal links use React Router. Same-page anchors remain native,
preserving the existing route/fragment behavior and navigation clearance.

`Embed` is a safe extension point that renders an HTTPS fallback link only.
No third-party iframe, scripts, tracking, raw HTML injection or remote evaluation
is enabled. Future interactive providers must have a reviewed explicit provider
allowlist, strict URL validation, sandbox/permissions, lazy loading, accessible
names, privacy consent where needed, fallback links and CSP coordination.
This library does not sandbox trusted repository MDX: reviewers must still reject
unsafe imports, scripts or arbitrary JSX in manually committed articles.

## Verification and related work

`npm run test:mdx` creates a temporary checkout, combines
`tests/fixtures/rich-content.mdx` with synthetic Notion conversion output, builds
and prerenders it, then runs desktop/mobile Playwright tests including no-JS
reading. It never adds fixture content to the production index or sitemap.
Screenshots are written to ignored `artifacts/rich-content/`. `npm test` includes
this integration plus existing publishing, navigation, theme and production tests.
Install Playwright Chromium first. Environments with a preinstalled browser may
set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`; normal CI uses the pinned browser.

The reference site's reading patterns informed restrained line spacing, rounded
media/code surfaces and subtle borders; no implementation was copied. Unlike its
client-only code rendering, highlighting here stays static and readable without JS.

The [article TOC](ARTICLE-TOC.md) uses the shared heading compiler and navigation
clearance. #9 reading progress remains separate.
This implements the basic copy/highlighting needed by #58 without closing #13;
further language themes/copy refinements can build on it. GFM footnotes render,
while bibliography, clinical reference authoring and Notion citations remain #63.
No screen-reader user study, real-device testing, or complete WCAG audit is claimed.

Image authoring and automatic delivery: [IMAGES.md](IMAGES.md).

## Section permalinks

H2–H4 headings use `ArticleHeading` through the shared MDX mapping, including
explicit Notion JSX normalized by `remarkRichContent`. The article title is
unchanged. The heading compiler remains authoritative for IDs, deduplication,
explicit IDs, Unicode, and TOC metadata; rendering does not generate IDs.

Headings render as plain semantic H2–H4 elements with their compiler-assigned
IDs. There are no heading toolbars, clipboard controls, feedback regions, or
reserved gutters. Share a section using its fragment URL or navigate through the
TOC; native fragment targets work without JavaScript. The existing navigation
focus/clearance logic still owns fragment scrolling and history. Code-block copy
buttons and their feedback remain separate and unchanged.

Run `npm run build`, `npm run lint`, `node --test scripts/mdx.test.mjs
scripts/remark-heading-ids.test.mjs scripts/prerender.test.mjs`, and
`npx playwright test heading-permalinks` (desktop/mobile Chromium). The rich MDX
integration also exercises the publisher mapping; the full E2E suite covers TOC,
fragment navigation, themes and accessibility. Review generated HTML and both
themes at narrow widths; automated checks do not replace screen-reader/device QA.

## Estimated reading time

The existing MDX compilation pass exports `readingTimeMinutes`; the article
registry, journal, homepage writing previews and article header use this integer.
Discovery cards receive the same calculation during search-index generation.
`scripts/reading-time.mjs` owns the policy: `Math.max(1, Math.ceil(words / 225))`.
Change `WORDS_PER_MINUTE` there to adjust the speed. Empty or prose-free articles
also receive the one-minute display minimum.

The AST traversal counts headings, paragraphs, lists, quotes, table cells, link
labels, inline code and literal Notion text expressions. Formatting and link
URLs do not count. It excludes imports/exports, frontmatter nodes, attributes,
comments, dynamic expressions, hidden elements, scripts/styles and fenced/native
code blocks. No MDX or expression is executed to obtain the estimate. Existing
articles use metadata exports; YAML frontmatter authoring remains unsupported by
the existing MDX pipeline.

Estimates describe prose reading, not coding exercises or tutorial completion.
Unicode letter/number runs count as words, with internal apostrophes and hyphens
preserved; languages without spaces have approximate counts. Custom component
output and prose passed only through attributes cannot be inferred statically.
Notion synchronization needs no new properties: each ordinary rebuild derives
fresh estimates from the updated article source. RSS, dates and URLs are unchanged.

### Chronological article navigation

Article footers link to the immediately older **Previous article** and immediately
newer **Next article** in the existing public MDX registry. Chronology uses the
original `metadata.date`, then immutable `articleId` in ascending ASCII order for
equal dates. Updates do not move posts. The index keeps its existing ordering.
`createArticleAdjacency` builds a lookup during the existing redirect generation step without mutating
posts; rendering only looks up the current identity, with no browser sorting. Links use current canonical slugs,
never historical aliases. Duplicates and incomplete/nonpublic metadata are excluded
defensively; the existing build validation rejects invalid public source content.
Private manual articles belong outside the public directory. Notion withdrawals
remove public MDX through the existing sync contract. Publishing, removing, or
renaming a Notion article updates navigation on the next normal build; no new
workflow or CMS field is involved. Boundaries omit unavailable links, and single
or empty publications have no navigation. Links are prerendered and work without JS.

After `npm run build`, run `node --test scripts/article-adjacency.test.mjs` and
`npx playwright test article-navigation accessibility theme` for regression checks.

### Related Articles

The existing redirect/content generation step uses the canonical published identity
registry to generate up to three related article IDs per article. Each unique shared
tag earns 3 points; a shared category earns 1. Comparisons reuse discovery's NFKC,
whitespace and case normalization; display labels remain unchanged. No synonyms are
inferred. Ties use original publication date descending, then immutable ID ascending
ASCII. Updated timestamps do not count. Zero-score articles fill remaining slots in
that same recent-publication order. The current identity, duplicates, alias routes,
nonpublic and invalid metadata are excluded. No eligible alternatives means no section.

Related cards reuse discovery cards with level-three headings under Related Articles,
before chronological navigation. Links and reading time are present in static HTML,
including without JavaScript. The browser only resolves precomputed IDs. Ordinary
builds after Notion publication, withdrawal, taxonomy, date or slug edits refresh the
results; no schema, schedule or API changes are needed. Small collections may repeat
chronological neighbors; relevance is literal taxonomy overlap, not semantic matching.

Run `npm run build`, `node --test scripts/related-articles.test.mjs`, and
`npx playwright test related-articles article-navigation accessibility theme`.

### GitHub-style syntax palettes (#16)

Before this refinement, comments used site-muted text, keywords/titles used the
mint accent, and strings/numbers used body text. `rehype-highlight` still runs with
`detect: false, ignoreMissing: true` in the existing MDX build. Labeled supported
fences emit highlight.js `hljs-*` spans; unlabelled/plain-text/unknown fences retain
readable source and existing labels/copy controls. No browser grammar is shipped.

`src/index.css` defines `--code-*` roles alongside existing theme tokens. Dark is
the root default; light values follow both `data-theme="light"` and the existing
`prefers-color-scheme` fallback for a root without a theme attribute. The existing
head bootstrap alone resolves saved preferences before hydration. No code-specific
state, toggle, dependency or additional build is introduced.

The mapping follows highlight.js's established
[GitHub](https://github.com/highlightjs/highlight.js/blob/main/src/styles/github.css)
and [GitHub Dark](https://github.com/highlightjs/highlight.js/blob/main/src/styles/github-dark.css)
themes using the requested updated reference hues. Keywords/types use red;
function titles purple; class titles/built-ins/symbols orange; literals/numbers/
attributes/operators/variables blue; strings/regex navy or pale blue; comments gray;
tags/selectors green. Properties, params and punctuation inherit foreground.
Nested substitutions reset to foreground; meta strings/keywords retain their roles.
Markdown emphasis/strong retain their font semantics; diffs retain literal +/-
markers and use readable addition/deletion foreground/background pairs. Syntax
remains understandable as source text without color. Inline code keeps site tokens.

Light comments are conservatively darkened from `#6e7781` to `#68717b` to meet 4.5:1
on `#f6f8fa`. Markdown headings use the literal blue rather than the older dark
GitHub theme's lower-contrast `#1f6feb`. Selection explicitly sets foreground and
background for every token. Print resets all code tokens to dark ink on white,
including nested spans and diffs, hides copy controls and preserves existing wrapping.
Whole-article print support is described below.

When adjusting a role, measure every meaningful text color against its actual
background (including diff/selection), requiring at least 4.5:1. The rich fixture
now covers JS, TS, TSX, JSON, Bash, Python, CSS, HTML, Markdown, SQL, diff, plain text,
unknown languages and long lines. `npm run test:mdx` reuses the existing isolated
fixture build; browser checks inspect computed colors, all rendered text-token
contrast, theme switching/reload, selection colors, no-JS OS themes, narrow
viewports, 200% text scaling, print, copy controls, keyboard scrolling and axe.
Contrast reports and light/dark screenshots are in `artifacts/rich-content/`.
Run `npm run build`, `npm run lint`, and `npx playwright test theme accessibility`
for the shared theme/accessibility contract. Browser zoom/text scaling and automated
axe checks do not constitute a complete WCAG audit or real-device verification.

Verified contrast ratios on the actual code backgrounds:

| Role | Light | Dark |
| --- | ---: | ---: |
| Foreground | 13.76 | 12.26 |
| Comments | 4.66 | 6.15 |
| Keywords | 5.03 | 7.51 |
| Strings | 12.03 | 12.31 |
| Functions | 4.74 | 9.72 |
| Classes / built-ins | 6.94 | 9.77 |
| Literals | 7.13 | 9.73 |
| Tags | 6.94 | 12.32 |
| Selection | 9.87 | 8.50 |

Reviewed [light](screenshots/syntax/desktop-light.png) and
[dark](screenshots/syntax/desktop-dark.png) screenshots, with
[mobile light](screenshots/syntax/mobile-light.png) and
[mobile dark](screenshots/syntax/mobile-dark.png) evidence. Long lines scroll inside
the code surface rather than wrapping. Local Chromium 153 passed all ten rich
fixture browser journeys and 132 shared theme/accessibility browser checks.
The normal CI runner uses the repository's pinned Playwright browsers.

### Semantic callout presentation

Callouts retain neutral `--ui-surface`, outline and text roles. Only the left
border and small decorative inline SVG use `--callout-accent`. No icon package,
theme state or publisher changes are required. Explicit theme and OS fallback
selectors both define these centralized CSS tokens in `src/index.css`:

| Type | Purpose | Dark | Light | Token | Icon |
| --- | --- | --- | --- | --- | --- |
| Note | Supplementary context | #A5B4FC | #4F46E5 | --callout-note-accent | Pencil |
| Tip | Advice and best practices | #65D6B4 | #047857 | --callout-tip-accent | Lightbulb |
| Information | Facts and background | #60A5FA | #1D4ED8 | --callout-info-accent | Information circle |
| Warning | Risks and caution | #FBBF24 | #92400E | --callout-warning-accent | Triangle |
| Important | Essential takeaways (not errors) | #FB7185 | #BE123C | --callout-important-accent | Exclamation circle |

```mdx
<Callout variant="note">Supplementary context.</Callout>
<Callout variant="tip">Prefer small, reproducible examples.</Callout>
<Callout variant="information">The build produces static HTML.</Callout>
<Callout variant="warning">Check the target before running commands.</Callout>
<Callout variant="important" title="Before publishing">Verify the sources.</Callout>
```

Titles retain the visible semantic label. Omitted or unknown runtime variants
normalize to Note for the label, icon and accent together; TypeScript constrains
known authoring variants. Nested Markdown still requires blank lines around block
content. Notion continues emitting Note without guessing severity from icons.
No database properties or manual color attributes are needed.

Icons are hidden from assistive technology; static `role="note"` annotations
never interrupt reading as alerts. Labels preserve meaning without color.
Print uses dark ink, a visible border and labels on white, with page-break
avoidance where practical. Long content wraps; fenced code keeps its own scroll
surface. Tests exercise palettes, contrast, labels, unknown/default variants,
nested content, keyboard focus, text scaling, print and no-JS OS themes through
the existing rich MDX integration. Automated checks do not establish complete
WCAG conformance or replace real-device/screen-reader review.

To modify a variant, update both theme token sets (including OS fallback), the
shared component label/icon map, variant selector, this table and fixture/browser
expectations. Measure text at 4.5:1 and meaningful indicators at 3:1 against their
actual surfaces. Keep the publisher mapping stable unless separately authorized.

Review gallery: [dark](screenshots/callouts/after-dark.png) and
[light](screenshots/callouts/after-light.png). Comparison images restore the previous
CSS treatment on the same article content: [dark before](screenshots/callouts/before-dark.png)
and [light before](screenshots/callouts/before-light.png).


## Printing and saving as PDF

Use the browser's **Print** command (Ctrl/Cmd+P), then select a printer or **Save
as PDF**. Choose Letter or A4; CSS leaves paper size to the reader and requests
18mm vertical / 16mm horizontal margins. Browser margins, scaling, headers/footers
and background graphics remain user settings. Disable browser headers/footers for
the cleanest document. No PDF service, extra route, button or runtime library is used.

The existing reveal, TOC, code-copy hiding, neutral syntax and wrapping rules are
retained. Before #17, global controls/footer, dark surfaces, screen spacing and
minimum table widths still leaked into print; attribution and pagination were absent.
The article now keeps title, author, publication date, reading time, introduction,
body, references and a static site/canonical URL line. The current metadata has no
updated-date field; none is invented. Navigation, taxonomy controls, recommendations
and site footer disappear. Screen styling and saved themes are unchanged.

Print uses dark ink on white regardless of theme or background printing. Code keeps
language labels, indentation and literal syntax with neutral token colors and wrapped
lines. Tables wrap within page width with borders and repeating headers where the
browser supports them. Callouts retain semantic labels and neutral borders. Short
callouts (up to 600 text characters) and code samples (up to 12 lines / 800 characters)
request intact pagination; larger blocks can fragment. Headings request following
content, with three-line widows/orphans. These requests are browser hints, not rigid
pagination. Images preserve aspect ratio and fit within width / 210mm height;
article images default to eager loading so offscreen figures do not depend on
scrolling or JavaScript before printing. Existing explicit loading overrides remain
available. Disclosures expose their content through print CSS without changing
screen state. External HTTP(S) text links append their destination; same-site,
fragment and image links do not. Long URLs wrap; references keep their markup.

Validate using `npx playwright test article-print` after the normal build. The
existing `npm run test:mdx` isolated rich-content build also runs print tests; it
covers tables, syntax, all callouts, figures, closed disclosures and oversized content
without publishing fixtures. Tests emulate print, check computed layout and preserve
no-JS content. Chromium desktop exports Letter/A4 PDFs as review artifacts, without
adding another build or a PDF dependency. Inspect pagination, blank pages, clipping,
figures and the final paragraph in the PDFs as well as light/dark screenshots.
Browser print-dialog settings, physical printers, WebKit/Firefox PDF export and
mobile OS share/print flows still require manual browser/device validation. Engines
may differ in header repetition and fragmentation; disclosure expansion uses modern
`::details-content` with a child-display fallback for older engines.

Print review evidence (Chromium 153, backgrounds disabled):
[before](screenshots/print/before-dark-Letter.pdf) and
[after](screenshots/print/the-art-of-reading-code-Letter.pdf) on the same published
technical article; the before sample reconstructs main's print CSS by removing the
new whole-article print rules. [Before screenshot](screenshots/print/before-dark.png)
and [after screenshot](screenshots/print/after-dark.png) use print-media emulation.
The short [Hello, World](screenshots/print/hello-world-Letter.pdf) is one page;
[Python fundamentals](screenshots/print/001-python-fundamentals-Letter.pdf) spans
seven pages. A4 samples sit beside the Letter PDFs. The isolated
[stress fixture](screenshots/print/technical-dark-Letter.pdf) includes a 100-line
code block and a multipage callout, both continuing to the final marker and footnote.
All reviewed pages retain content without blank pages or horizontal clipping.
Legacy authored duplicate presentation titles and screen-oriented instructional
copy are preserved rather than editing published content in a print-style change.

## Editorial dates, revisions and corrections

`metadata.date` is the original public publication date; keep it unchanged when
editing, moving, rebuilding or deploying an article. Optional `updatedAt` records
an explicitly authored meaningful editorial update: revised facts, technical
instructions, recommendations or substantial new sections. Formatting, CSS,
dependency updates, Git commits and synchronization do not count. Neither dates
nor disclosure text are inferred from content differences or technical timestamps.

Use the existing literal metadata export (not YAML frontmatter):

```mdx
export const metadata = {
  articleId: 'manual:example',
  title: 'Example', description: 'An example article.',
  date: '2026-10-10', updatedAt: '2026-10-25',
  category: 'Technology', author: 'David Becker', tags: [],
  revisions: [
    { date: '2026-10-25', description: 'Updated the React examples.' },
  ],
  corrections: [
    { id: 'hydration', date: '2026-10-24', description: 'Corrected the hydration explanation.' },
  ],
}
```

Revision notes explain substantial changes; corrections disclose previously
inaccurate or misleading information. Both are optional plain-text descriptions,
rendered as static sections after the body and retained in print/PDF. No author is
required to add notes for every edit. Entries can exist without `updatedAt`; no
modification date is inferred from them. When recording an editorial update, set
`updatedAt` explicitly to the latest meaningful change.

All dates must be real calendar dates in `YYYY-MM-DD` form (date-only, no time or
range). Updated and entry dates cannot precede publication. When `updatedAt` is
present, no entry may be later than it. Descriptions must be non-empty. Arrays
are normalized newest-first with deterministic ties; source order is not mutated.
Same-day updates keep their explicit SEO date but do not repeat the visible date.
Date formatting uses UTC, avoiding timezone-dependent day shifts.

A correction with `id: 'hydration'` links to `#editorial-correction-hydration`.
Keep the ID when editing its text or date. Without an ID, a deterministic date
and description hash forms the fragment: additions and reordering keep it stable,
but editing that correction's description/date changes it. Prefer explicit IDs
for durable externally shared links. Duplicate IDs (including fallback collisions)
are rejected; add distinct explicit IDs to resolve them. IDs must be lowercase
letters/digits separated by hyphens. The `editorial-` DOM ID namespace is reserved;
manual explicit body IDs cannot use it, and generated heading IDs avoid it.

JSON-LD retains `datePublished: date` and emits `dateModified` only for explicit
`updatedAt`. Sitemap `lastmod` uses `updatedAt` when available, otherwise `date`.
RSS item GUID, canonical URL, order and `pubDate` remain based on identity, slug
and original publication; only channel `lastBuildDate` may reflect an explicit
update. No new feed or runtime request is added.

Verify with `npm run lint`, `npm run build`, `node --test scripts/editorial.test.mjs
scripts/validate-content.test.mjs scripts/notion/publisher.test.mjs scripts/rss.test.mjs`,
and `npm run test:notion:build`. The existing isolated Notion build now also includes
manual editorial fixtures, same-day updates, static schema/sitemap checks and
`editorial.spec.ts` browser checks (light/dark, mobile, no JS, keyboard anchors,
axe, print, hydration). Screenshots/PDFs are retained in `artifacts/editorial/`
and the existing CI fixture artifact. Fixtures never enter production content.

Implementation audit for #62: the registry previously supported `date` alone;
article metadata used an unlabeled time; JSON-LD emitted only `datePublished`.
The publisher preserved dates only as a fallback after Notion's Published Date,
so a property edit could reset publication. It now prioritizes the stored manifest
date, including after withdrawal/republication and slug changes. No historical
article dates were migrated. Existing identity, alias history, ownership hashes,
weekly audits and monthly recovery remain unchanged. The RSS generator's unused
`updated` hook now reads the same `updatedAt` contract instead of a parallel field.
