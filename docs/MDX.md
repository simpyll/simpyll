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
Highlight colors reuse the semantic palette. No article animation is introduced.

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
This implements the basic copy/highlighting needed by #58 without closing #13/#16;
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
