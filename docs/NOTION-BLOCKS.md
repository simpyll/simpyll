# Notion block compatibility

This is the one-way publisher contract (`scripts/notion/publisher.mjs`). Unsupported
meaningful content aborts the entire synchronization before writes. No placeholder
is inserted. Diagnostics identify block type and ID, never article excerpts or URLs.

| Block / rich text | Actual treatment |
| --- | --- |
| Paragraphs, headings | Direct semantic HTML; article owns H1, normalized nesting starts at H2 |
| Bulleted / numbered lists | Native ul/ol/li, including nested supported blocks |
| To-do | Static paragraph with authored checked/unchecked symbol, explicit state text and content; no editable control |
| Quotes, dividers | Native blockquote/hr |
| Code | Literal escaped pre/code and visible caption with shared literal-only normalization; shared code component supplies existing copy behavior |
| Callout | Existing Callout, note variant; Notion colors/icons are presentation only and not imported |
| Toggle | Native details/summary with supported children |
| Image | Existing ArticleImage/figure/figcaption; explicit alt convention below; existing local download/optimization |
| Bookmark | HTTPS anchor, rich caption as link name or original URL; no metadata fetch, preview image or scripts |
| File | Safe fallback link to author-designated public external HTTPS PDF/TXT/CSV; author-provided name or URL filename, extension label and caption |
| Uploaded/private file | Rejected; no signed Notion attachment link emitted or download attempted |
| Video, embed | Public external HTTPS links use the consent-based Embed component; unsupported providers retain a link and diagnostic. Private uploads and unsafe URLs abort. See [EMBEDS.md](EMBEDS.md). |
| link_preview | Unsupported; publication rejected. |
| Table / table_row | Native table/thead/tbody/tr/th/td with row/column scope; rows only inside table; nonempty rectangular shape required |
| Synced block (original or reference) | Rejected privacy boundary, including cycles; no traversal even if integration can read source |
| Child page, child database | Rejected privacy boundary; no article traversal |
| Equation (inline/block) | Safe literal TeX in labelled code; no math typesetter; author must verify this fallback conveys intended meaning |
| Table of contents | Intentionally unsupported and rejected; site supplies its own TOC; remove Notion TOC block |
| Unknown / unsupported | Rejected with structural diagnostic; replace before publishing |
| Text annotations | Line breaks, bold, italic, underline, strikethrough, inline code and nested combinations; Unicode and literals preserved |
| Text links | HTTP(S)/mailto, no credentials or executable schemes |
| Mentions | Rejected; replace with explicit public text/link; no resolution of private pages or people |
| Superscript/subscript | No Notion text annotation mapping; Unicode characters preserved; use explicit prose or TeX fallback |

## Images

Notion's image payload has no independent alternative-text field. Start the first
caption text run with `Alt: description`, then a newline. Everything after that
line remains a visible rich-text caption, including source attribution links:

```text
Alt: Three steps from Notion through GitHub to the published website
Publishing architecture. Source: David Becker.
```

For an intentionally decorative image use `Decorative` followed by a newline and
an optional caption. This emits empty alt. Do not use filenames or captions as
substitutes for a description. The importer does not invent descriptions. Missing
or malformed markers stop synchronization with the image block ID. Existing
Notion authors must update captions before their next successful sync; last known
good output remains until then. Manual articles need no migration. The marker may span text runs; formatting and links on the remaining visible
caption are preserved. A marker without a newline is allowed when there is no
visible caption. No descriptive alt text is inferred.

Notion-hosted images use the existing bounded downloader, ownership manifest,
revision cache, and image optimizer. Failed/expired downloads abort synchronization
without replacing committed content/assets. Ordinary external HTTPS images remain
external and are not downloaded: authors own URL permanence, dimensions and consent.
Upload to Notion for local optimization and intrinsic dimensions. No signed image
query is written into the generated article. See [images](IMAGES.md).

## Bookmarks and files

A bookmark with URL `https://example.com/report` and caption `Read the report`
becomes a normal named link without JavaScript. Without a caption the URL is the
link name. Captions containing their own links render beside the URL link, avoiding
nested anchors. Notion storage URLs are rejected. No title/description/image is inferred. Raw control characters/backslashes,
Notion workspace/storage hosts and recognized signed/token query keys reject.
Ordinary bookmark query parameters remain intact.

Files are deliberately link-only: a public external `https://example.com/report.pdf`
becomes `report.pdf (PDF)` with its caption beside it. TXT and CSV also work. No
remote bytes are fetched or executed, so this cannot mirror oversized files. No
claim is made about the linked server's MIME or future contents. Only use files
explicitly approved for public access. Signed/query URLs, fragments, Notion storage,
credentials, unsafe schemes, executable extensions, encoded separators and traversal
filenames are rejected. Uploaded Notion attachments are intentionally unsupported;
host a public reviewed PDF/TXT/CSV and use an external file block or public bookmark.
The link follows ordinary browser navigation; cross-origin download is not forced.

## Boundaries, failures and preview

Article traversal allows only supported containers, at most 30 nested levels and
10,000 blocks total. Each paginated result also has a 10,000 item ceiling; repeated
cursors and ancestor cycles fail. The converter also enforces depth, cycle and aggregate
count bounds on preloaded fixtures. Synced sources and child content are never fetched.
Source-database discovery under the configured root remains a separate bounded
read-only discovery step, not authorization to publish those child pages. Only
queried pages with Status Published are converted and status/revision are rechecked.

Malformed tables and unsupported content are authoring failures; API/network and
media failures may be transient. All stop the plan. Fix the indicated block or retry
a transient failure; never log signed URLs or edit owned MDX/manifests to bypass it.
Existing stable IDs, slugs, aliases and original dates remain governed by the same
manifest. Manual articles remain protected. Conversion/compile failures cause no
writes. Filesystem writes have best-effort rollback for caught errors; process
termination/power loss is not crash-atomic. Git commit/push and Pages deployment are
separate operations, not a cross-service transaction. Use [recovery](NOTION.md)
procedures after interrupted writes.

Run `npm run sync:notion -- --dry-run` with the authorized environment to validate
without writing. For a local preview, sync in an isolated checkout, run `npm run
build` and `npm run preview`, and inspect headings, table headers/overflow, image
alt/captions, links, disclosures, no-JS output and print before authorizing production.
Do not commit preview/draft material. Fixture verification uses `npm run test:notion`,
`npm run test:notion:build`, `npm run test:images` and `npm run test:mdx`. The shared
rich-content browser suites cover keyboard focus, themes, mobile overflow, axe,
no-JS and print. Automated checks do not establish a screen-reader listening review.

### Additional regression audit

Captioned code uses the existing literal-only normalization for both MDX flow and
text expressions, retaining build-time syntax highlighting. Rich-text newlines
become native br elements. Empty toggle summaries reject instead of emitting an
unnamed disclosure. Malformed/nested table rows reject. Attachment path validation
checks the complete decoded pathname, including encoded separators and multiple
encoding; only approved public links are emitted. No media pipeline, dependency,
manifest format or publication status behavior changes.
