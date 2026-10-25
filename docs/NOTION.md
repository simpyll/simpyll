# Publishing from Notion

[← README](../README.md)

## Publish from Notion (including mobile)

The publisher is implemented but **live Notion → simpyll.com verification is
still pending**. Review and merge the integration PR before enabling production
runs. This implementation does not publish anything from feature branches or
pull requests.

### One-time setup after review

1. In Notion, open **Simpyll Blog**, then **Connections**, and grant **Simpyll
   Blog Publisher** access to the original database and its parent page. Give
   the connection read-content capability; no Notion write access is needed.
   A linked database view alone is not sufficient.
2. Keep repository Actions secrets `NOTION_API_TOKEN` and `NOTION_PAGE_ID`.
   The configured page ID is `3ffb3577d26a8016ab86f468a875c628`. Never put the
   token in source files, MDX, screenshots, or workflow logs.
3. The publisher uses Notion API `2026-03-11`. It discovers child databases
   beneath that page (including nested pages/blocks), retrieves each database's
   `data_sources`, and selects exactly one source with `Name` (title) and
   `Status` (status or select). A full-page database ID also works. Zero or
   multiple matching sources stop the run; move unrelated databases outside
   the configured page or point the secret at the intended full-page database.
4. Keep these properties: `Name`, `Status`, `Category`, `Tags`, `Slug`, and
   `Published Date`. `Category` supports select, multi-select (first value), or
   text; `Tags` is multi-select; `Slug` is text; `Published Date` is a date.
   An optional text `Description` overrides the generated excerpt.
5. Ensure Actions can write repository contents and the bot can push to `main`
   under the repository's branch rules. The sync job needs `contents: write`;
   the existing deployment needs `contents: read`, `pages: write`, and
   `id-token: write`. No PAT, Actions-write permission, or new secret is needed.
6. Confirm the existing Pages custom domain, DNS, and HTTPS setup described
   above. That earlier setup note is historical and has not been reverified
   by this integration.
7. After merging, first run **Actions → Publish Notion blog → Run workflow**
   on `main` with **dry_run checked**. This reads Published content, downloads
   its hosted images in memory, and compiles MDX without writing or deploying.
   The schedule becomes active when the workflow reaches the default branch;
   if you need a review window after merge, disable this workflow in Actions
   until ready. Manual runs default to dry-run; scheduled runs publish.

### Write and publish on your phone

1. Open **Simpyll Blog** in the Notion app and create an article.
2. Fill in **Name**, write the page body, and leave **Status = Draft** while
   editing. **Ready** also stays unpublished.
3. Choose Category and Tags. Set a **Slug** such as `my-first-project` and a
   **Published Date**. Slugs must be 1–100 lowercase ASCII letters/digits with
   single hyphens between words. Use a distinct slug for each article.
4. Set **Status = Published** when it is ready for the public.
5. Wait for the next scheduled run and Pages deployment, then open
   `https://simpyll.com/blog/<slug>/`. The cron is `*/15 * * * *`; GitHub may
   delay or skip scheduled jobs, so this is approximate, not a 15-minute SLA.
6. Edit the same Notion page to update the same post. A blank Slug keeps the
   previous URL; an explicit slug change preserves the old URL with an immediate static
   redirect to the new one (see [slug history](REDIRECTS.md)). Changing Status to Draft/Ready or
   trashing the page removes its generated article and unused local images
   on the next successful sync. Previously published content remains in Git
   history and may remain in browser/search caches; unpublishing is not a
   way to erase sensitive information already made public.

### Formatting and metadata

Paragraphs, headings, bold/italic/underline/strikethrough, safe web/mail links,
inline code, nested bullet/numbered lists, quotes, code blocks, and images are
supported. Dividers, callouts, and toggles are also supported. The blog template
supplies H1. Imported headings begin at H2 and preserve relative nesting without
skipped levels, even if the first Notion heading is H2/H3 or an author skips a rank.
Code preserves literal text. Notion text is encoded as string literals inside
generated JSX, so pasted braces, HTML, Markdown, and import/export statements
cannot execute as MDX code.

Unsupported blocks (including subpages, database embeds, synced blocks, tables,
bookmarks, and equations/mentions) stop the entire sync instead of silently
publishing an incomplete article or traversing potentially private content.
Replace them with supported blocks before publishing. Colors are not retained.
Use PNG, JPEG, GIF, WebP, or AVIF images under 20 MiB; SVG is rejected. Uploaded
Notion images are downloaded into `public/images/notion/<page-id>/` using
content-hashed filenames. Expiring URLs are never saved. External HTTPS image
URLs stay external; upload the image to Notion if it needs a durable local copy.

Missing optional fields have deterministic defaults: title-based slug (then
preserved on later runs), previously saved date or page creation date,
`Journal` category, empty tags, and the first paragraph (up to 160 characters)
as description, falling back to title. Author is `David Becker`. Name is
required. Invalid dates/slugs and duplicate slugs fail the entire run without
committing; fix the Notion properties and retry.

### Ownership, failures, and deployment

`.notion/published.json` maps stable Notion page IDs to generated paths and
content hashes. Only tracked publisher-owned files are replaced or removed.
The sample `hello-world.mdx`, `001-python-fundamentals.mdx`, and other manual
posts stay untouched. Collisions with manual filenames and edits made directly
to generated files stop the sync. Edit generated articles in Notion; restore
accidental repository edits before retrying. Do not delete or hand-edit the
manifest. Copying a Notion page creates a new identity and requires a new slug.

The script paginates database discovery, queries, and block children. It paces
requests and retries rate limits, transient server/network failures, and image
downloads with bounded retries. Discovery/auth errors, invalid content, failed
image downloads, or an observed mid-read article edit stop the run. All content
is planned and compiled before filesystem changes; the workflow builds, lints,
and checks prerendered output before committing. A failed run leaves the last
successful live version in place, including any pending removals. Check failed
Actions runs promptly when unpublishing content.

Unchanged output (including renewed image signatures) creates no commit or
deployment. Sync runs are serialized. A concurrent push to main rejects the
publisher's push rather than force-overwriting changes; the next run retries
from current main. The publisher commits only blog files, owned images, and
its manifest, then calls the existing `deploy.yml` as a reusable workflow with
the exact new commit. This explicitly handles GitHub's suppression of push
workflows from `GITHUB_TOKEN` commits. If deployment fails after the commit,
rerun the failed deployment or manually run **Deploy Simpyll to GitHub Pages**
on main; an unchanged sync intentionally does not redeploy.

### Validation and acceptance checklist

- `npm run test:notion`: synthetic API fixture tests, no credentials needed.
- `npm run test:notion:build`: fixture article through the real Vite/MDX build,
  static prerender, metadata, sitemap and local image checks in a temporary copy.
- `npm run build`, `npm run lint`, and
  `node --test scripts/prerender.test.mjs`: existing project validation.
- `npm run sync:notion -- --dry-run`: optional read-only real-API check with
  the two secrets supplied securely as environment variables.

PR validation uses no secrets and cannot deploy. To accept production after
review: publish a non-sensitive test article with an uploaded image, run the
publisher on main with dry_run **unchecked**, confirm its content commit and
successful Pages deployment, and verify the actual HTML, metadata and image at
`https://simpyll.com/blog/<slug>/`. Edit that page and confirm the same URL
updates. Run sync again unchanged and confirm no commit/deployment. Finally,
change the test article to Draft and verify its route is removed after the next
successful deploy. Record the run links and live URL before calling the
integration end-to-end verified. Repository secrets cannot be read back for
local testing, and a fixture build is not proof of a live Notion publication.

References: [Notion data-source migration](https://developers.notion.com/guides/get-started/upgrade-guide-2025-09-03),
[Notion 2026-03-11 changes](https://developers.notion.com/guides/get-started/upgrade-guide-2026-03-11),
[data-source queries](https://developers.notion.com/reference/query-a-data-source),
and [GitHub workflow triggering](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow).

Image naming now uses captions/article context with stable local copies. See
[image lifecycle and compatibility policy](IMAGES.md); old public media is retained in source; media belonging to unpublished articles
is excluded from deployment artifacts (see [URL safety](REDIRECTS.md)).

### Git content recovery

See [Notion disaster recovery](NOTION-RECOVERY.md) for offline dry-run/apply
recovery, consistent snapshots, immutable IDs/aliases, image restoration and the
isolated monthly integrity drill. Git protects committed public content, not
private drafts. Pause synchronization and reconcile Notion before resuming after
a restoration; otherwise the next successful sync replaces the recovered state.

## RSS syndication

The excerpt feed is **https://simpyll.com/rss.xml** (RSS 2.0). `npm run build`
validates public MDX, then `npm run generate:rss` writes `public/rss.xml` before
Vite copies static assets to `dist`. Prerendering preserves it; the existing Pages
artifact deploys it with no additional workflow or Notion API access. Pages owns
response MIME headers; the `.xml` extension provides standard XML delivery.

The generator reuses `collectArticles` from the redirect/identity registry and
`searchDocument` publication filters, plus the restricted literal metadata parser.
Manual articles in `src/content/blog` are published by default; explicit private
statuses, draft flags, test content and incomplete metadata are excluded. Notion
manifest status and current canonical slug are authoritative. Withdrawn records
and historical slug aliases never become entries. The build's existing public-only
content validator rejects private MDX rather than deploying it elsewhere on site.

GUIDs are `urn:simpyll:article:<articleId>` with `isPermaLink="false"`. Existing
`manual:*` and `notion:*` identities survive edits, synchronization and renames;
links follow the registry's current slug. Missing historical identities follow
Issue #66's migration policy: assign a `manual:<original-slug>` ID once and retain
it permanently. The generator deliberately fails on missing/mismatched identities
or duplicate IDs/URLs rather than silently changing subscriber identity.

Descriptions come from article metadata, with Markdown formatting converted to
plain text; bodies and private fields are never syndicated. Dates use the original
publication date at midnight UTC, never the build clock. Ordering is date descending,
then identity and slug in code-point order. `lastBuildDate` uses the greatest
publication date (or valid optional `updated` date); it is omitted for an empty feed.
No author email is invented for RSS's email-based author element.

After `npm ci`, run `npm run build` and `npm run test:rss`. Tests parse XML using
`fast-xml-parser`, check publication fixtures, and inspect deployed XML and HTML.
Use `npm run generate:rss` alone to regenerate locally from repository content.
For missing entries, check manifest status, the current MDX filename, stable ID,
required metadata/date and search publication flags. For malformed entries, run
`npm run validate:content`, then `npm run test:rss`; XML-invalid control characters
are removed and metadata is XML-escaped. There is no live Notion request or summary
service. The journal's native subscription anchor and prerendered head autodiscovery
work without JavaScript. No sync, weekly audit or monthly recovery schedule changes.

### Explicit editorial update metadata (#62)

The Simpyll Blog schema was inspected and these optional properties added:

| Property | Notion type | Value |
| --- | --- | --- |
| Updated Date | Date | Date only; disable time and date range |
| Revision Notes | Text | JSON array of `{ "date", "description" }` objects |
| Corrections | Text | JSON array of `{ "date", "description", "id"? }` objects |

For another database, add properties with these exact names/types via **Add
property**. Missing properties and blank values are supported. The publisher's
integration remains read-only; it does not create schema during sync. No existing
article values were populated. To record a meaningful editorial update, set
Updated Date explicitly. Notion `last_edited_time` is used only for safe read
consistency, never as an editorial date.

Example **Corrections** text (plain JSON, no Markdown fences):

```json
[{"date":"2026-10-24","id":"hydration","description":"Corrected the hydration explanation."}]
```

Example **Revision Notes** text:

```json
[{"date":"2026-10-25","description":"Updated the React examples."}]
```

Set **Updated Date** to `2026-10-25` for this example. Empty optional fields are
omitted; malformed JSON, wrong property types or invalid editorial dates abort
before any writes and preserve the last published output. Text from Notion is
JSON-escaped into literal MDX metadata, never evaluated as code. The first
publication retains the existing Published Date / page creation-date fallback;
subsequent syncs prioritize the stored original date even if Published Date is
changed or cleared. Date corrections to an already published original date
require a deliberate reviewed manifest migration; ordinary edits cannot reset it.

Editorial metadata participates in the existing generated-file hash. Reordering
notes alone normalizes to the same output, unchanged reruns create no commits,
and no sync schedule, audit, recovery workflow, alias or article identity changes.
See [MDX editorial guidance](MDX.md#editorial-dates-revisions-and-corrections) for
validation, correction links, SEO, RSS and tests.

### References and citations

Use an ordinary **References** heading, numbered-list entries, italic rich text for
journal/book titles, and Notion rich-text hyperlinks for documentation or canonical
`https://doi.org/10.<registrant>/<suffix>` destinations. For example:

1. Add a paragraph: `React Documentation (n.d.) describes hydration.`
2. Add a heading: `References`.
3. Add a numbered entry: `React Documentation. (n.d.). hydrateRoot.`
4. Italicize `hydrateRoot` and link it to
   `https://react.dev/reference/react-dom/client/hydrateRoot`.

Academic references use the same blocks with author-supplied authors, date, title,
journal and DOI; no fields are inferred. Use the complete examples in MDX.md as a
format guide. The publisher preserves list order and linked rich text
deterministically, with no extra properties, databases, schedules or registries.

**Limitation:** Notion rich text is intentionally escaped as literal MDX expression
text. Typing `[^source]` / `[^source]: ...` in a Notion paragraph does not create GFM
footnotes. Use author-date prose plus a numbered References list and inline source
hyperlinks instead. Native GFM footnotes are supported in manually authored MDX.
Do not use code blocks or raw HTML to bypass this safety boundary. Citation
accuracy remains the author's responsibility. Existing URL safety checks and the
build's content validator also apply to publisher-generated reference links.
