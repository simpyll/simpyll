# Simpyll

A personal website and public learning journal about the journey from critical
care nursing into software engineering and AI. The site brings together a
learning journal, projects and experiments, and questions at the intersection
of healthcare and technology.

Built with React, TypeScript, Vite, MDX, and Motion. Blog content lives in
`src/content/blog`; page metadata lives alongside the page content and in
`src/config/site.ts`.

- `npm run dev`: local development.
- `npm run build`: TypeScript checks, sitemap generation, client and server
  builds, and static prerendering.
- `npm run preview`: preview the production output.
- `npm run lint`: lint the codebase.
- `node --test scripts/prerender.test.mjs`: validate the generated HTML and SEO.

## Prerendering and hydration

`npm run build` generates HTML for `/`, `/blog`, and each MDX post. React renders
an entire document so React 19 can place metadata in the head; JSON-LD stays in
the hydrated body tree. Do not extract arbitrary tags from rendered app HTML.
Run the full build before rerunning prerender (the script rejects an already
prerendered index to prevent nesting an old page inside a new one).

`npm run preview` serves each generated directory index at URLs with or without
a trailing slash. Production hosting must likewise resolve `/blog` to
`dist/blog/index.html` and `/blog/hello-world` to its own index **before** any SPA
fallback. Serving the homepage at these URLs causes a hydration mismatch and
incorrect static SEO content. The Vite preview middleware does not configure
an external hosting provider.

After building, run `node --test scripts/prerender.test.mjs` to check static
content, metadata, and JSON-LD placement. With preview running, use
`PREVIEW_URL=http://localhost:4173 node --test scripts/prerender.test.mjs` to also
check HTTP responses for clean URLs, trailing slashes, and query strings.


### Phase 6 audit notes

The build also produces `dist/404.html`. Configure production hosting to serve
that document with HTTP 404 for unknown routes, rather than returning the
homepage with HTTP 200. Preview applies this behavior for extensionless URLs.
The preview plugin is not a production server configuration.

Reveal animations retain their normal appearance. Reduced-motion CSS makes
reveals immediately visible and removes their translation; a noscript rule
makes the same content visible when JavaScript is disabled. Keyboard users can
skip the header and receive a visible focus outline. Article body headings
should start at H2 because the page supplies its H1. The existing repeated
sample title has presentation semantics to preserve its appearance.

The footer year is bundled at build time to avoid cached HTML disagreeing with
client time after New Year. Rebuild to update it. The introductory MDX post still contains a sample author (`Your Name`) and
generic starter prose. Replace these with the intended public author name and
an authored introduction before publication.


## GitHub Pages deployment

`.github/workflows/deploy.yml` builds and deploys on pushes to `main`, and can
also be run manually from Actions. It uses Node.js 24, npm's lockfile cache,
`npm ci`, the complete build pipeline, linting, and prerender/SEO tests before
uploading only `dist/` through the official Pages actions. Deployment runs are
serialized and active deployments are allowed to finish.

The intended URL is `https://simpyll.com/`, so Vite uses `base: '/'`.
`public/CNAME` is copied to `dist/CNAME`. With Actions-based Pages deployments,
GitHub's Pages custom-domain setting is authoritative; CNAME alone does not
configure that setting. Keep Settings → Pages configured with GitHub Actions
and custom domain `simpyll.com`. DNS is managed separately; after its check and
certificate provisioning finish, enable Enforce HTTPS if it is not enabled.

Pages serves the generated directory indexes for `/blog/` and each article,
while canonical URLs remain consistent with `https://simpyll.com`. The artifact
includes `404.html`, `sitemap.xml`, `robots.txt`, and route-specific SEO HTML;
there is no homepage-as-404 SPA fallback. No deployment secret or personal
access token is needed by the workflow.

Deployment setup note: GitHub rejected assigning `simpyll.com` because that
domain is already attached to another Pages site. Release it from the existing
site, or verify ownership using GitHub's custom-domain verification process,
then save `simpyll.com` in this repository's Pages settings. Until that succeeds,
the Pages API reports `https://simpyll.github.io/simpyll/`; this build intentionally
uses root-relative assets for the custom domain, so the repository-subpath URL
is not a substitute for the intended production URL. No DNS changes are made
by the workflow.


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
   previous URL; an explicit slug change removes the old generated route and
   creates the new one (no redirect). Changing Status to Draft/Ready or
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
