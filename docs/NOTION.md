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
supported. Dividers, callouts, and toggles are also supported. Headings shift
one level (Notion H1 → H2) because the blog template supplies the article H1.
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
